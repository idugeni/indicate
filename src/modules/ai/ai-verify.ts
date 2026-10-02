import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import { PUBLISHER_VERIFY_SCHEMA } from '@/modules/ai/ai-response-schemas';
import type { AiCallerRole } from '@/modules/ai/ai-types';
import { AI_LIMITS, scanPrompt, stripCodeFence, truncateInput } from '@/modules/ai/ai-usage';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

let configured: AiServiceDeps | null = null;

/**
 * Mengikat verifikasi penerbit ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API.
 */
export function configurePublisherVerify(deps: AiServiceDeps): void {
  configured = deps;
}

export type PublisherRiskLevel = 'rendah' | 'sedang' | 'tinggi';

export interface PublisherAssessment {
  readonly summary: string;
  readonly riskLevel: PublisherRiskLevel;
  readonly checklist: readonly string[];
  readonly recommendation: string;
}

const RISK_LEVELS: readonly PublisherRiskLevel[] = ['rendah', 'sedang', 'tinggi'];

/**
 * Mengurai penilaian verifikasi penerbit JSON dari model.
 *
 * @param text - Output mentah model.
 * @returns Penilaian dengan bahasa dugaan; null bila unparseable atau ringkasan kosong.
 */
export function parseVerification(text: string): PublisherAssessment | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const summary = typeof record.summary === 'string' ? record.summary.trim().slice(0, 800) : '';
  if (summary === '') return null;
  const rawRisk = record.risk_level ?? record.riskLevel;
  const riskLevel: PublisherRiskLevel =
    typeof rawRisk === 'string' && (RISK_LEVELS as readonly string[]).includes(rawRisk.trim().toLowerCase())
      ? (rawRisk.trim().toLowerCase() as PublisherRiskLevel)
      : 'sedang';
  const rawChecklist = Array.isArray(record.checklist) ? record.checklist : [];
  const checklist = rawChecklist
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().slice(0, 120))
    .filter((item) => item !== '')
    .slice(0, 6);
  const recommendation = typeof record.recommendation === 'string' ? record.recommendation.trim().slice(0, 1200) : '';
  return { summary, riskLevel, checklist, recommendation };
}

async function runQuery(
  callerRole: AiCallerRole,
  organizationId: string | undefined,
  query: {
    readonly prompt: string;
    readonly systemInstruction: string;
    readonly temperature: number;
    readonly maxOutputTokens: number;
    readonly responseMimeType?: string;
    readonly responseSchema?: Record<string, unknown> | undefined;
  },
): Promise<{ readonly ok: true; readonly text: string } | { readonly ok: false; readonly error: string }> {
  const scanned = scanPrompt(query.prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const result = await executeAiQuery(configured, {
    prompt: query.prompt,
    organizationId: organizationId ?? null,
    systemInstruction: query.systemInstruction,
    temperature: query.temperature,
    maxOutputTokens: query.maxOutputTokens,
    responseMimeType: query.responseMimeType,
    ...(query.responseSchema === undefined ? {} : { responseSchema: query.responseSchema }),
    channel: 'web',
    callerRole,
    enableTools: false,
  });
  if (result.error !== undefined || result.text.trim() === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, text: result.text };
}

const VERIFY_SYSTEM = [
  'Kamu adalah analis verifikasi penerbit jaringan media Indonesia.',
  'Gunakan bahasa dugaan ("dugaan", "indikasi", "tampak"); jangan menyatakan penipuan atau valid secara mutlak.',
  'Jangan menyertakan data pribadi di ringkasan; jangan mengarang nomor legalitas, tanggal, atau putusan.',
  'Keputusan akhir selalu di tangan manusia; rumuskan rekomendasi sebagai saran pemeriksaan lanjutan.',
  'Keluarkan JSON murni:',
  '{"summary":"...","risk_level":"rendah|sedang|tinggi","checklist":["..."],"recommendation":"..."}',
].join('\n');

/**
 * Menyusun input verifikasi penerbit yang terpangkas dan aman.
 *
 * @param name - Nama resmi penerbit.
 * @param evidence - Referensi bukti pendukung; boleh kosong.
 * @returns Nama, bukti, dan prompt model, atau pesan penolakan yang aman.
 */
export function buildPublisherVerifyInput(
  name: string,
  evidence?: string,
): {
  readonly ok: true;
  readonly name: string;
  readonly evidence: string;
  readonly prompt: string;
  readonly systemInstruction: string;
} | { readonly ok: false; readonly error: string } {
  const normalizedName = truncateInput(name, AI_LIMITS.topic);
  if (normalizedName.length < 3) return { ok: false, error: 'Nama penerbit minimal 3 karakter.' };
  const normalizedEvidence = truncateInput(evidence ?? '', AI_LIMITS.details);
  return {
    ok: true,
    name: normalizedName,
    evidence: normalizedEvidence,
    prompt: `Ringkas bukti verifikasi penerbit berikut dan nilai risikonya:\n\nNama penerbit: ${normalizedName}\n\nBukti pendukung:\n${normalizedEvidence === '' ? '(tidak ada bukti dilampirkan)' : normalizedEvidence}`,
    systemInstruction: VERIFY_SYSTEM,
  };
}

/**
 * Meringkas bukti verifikasi penerbit menjadi penilaian risiko berbahasa dugaan.
 *
 * @param input.name - Nama resmi penerbit.
 * @param input.evidence - Referensi bukti pendukung; boleh kosong.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Penilaian risiko dan daftar periksa atau pesan sibuk yang aman.
 */
export async function verifyPublisher(input: {
  readonly name: string;
  readonly evidence?: string;
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly assessment: PublisherAssessment } | { readonly ok: false; readonly error: string }> {
  const built = buildPublisherVerifyInput(input.name, input.evidence);
  if (!built.ok) return built;
  const result = await runQuery('editor', input.organizationId, {
    prompt: built.prompt,
    systemInstruction: built.systemInstruction,
    temperature: 0.3,
    maxOutputTokens: 1024,
    responseMimeType: 'application/json',
    responseSchema: PUBLISHER_VERIFY_SCHEMA,
  });
  if (!result.ok) return result;
  const assessment = parseVerification(result.text);
  if (assessment === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, assessment };
}
