import 'server-only';

import type { AiServiceDeps } from '@/modules/ai/ai-service';
import {
  ARTICLE_DRAFT_SCHEMA,
  CLASSIFY_ARTICLE_SCHEMA,
  TRANSCRIPT_SCHEMA,
} from '@/modules/ai/ai-response-schemas';
import { runTaskQuery } from '@/modules/ai/ai-task-query';
import { TASK_MODEL_PROFILE } from '@/modules/ai/ai-task-profiles';
import { SEO_METADATA_MODEL, SEO_METADATA_GATEWAY_PROVIDER } from '@/modules/ai/ai-task-models';
import { parseArticleDraft, type ArticleDraft } from '@/modules/ai/ai-usage';
import { parseClassification, type ArticleClassification } from '@/modules/ai/ai-polish';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

let configured: AiServiceDeps | null = null;

export const TRANSCRIBE_BASE64_LIMIT = 10_000_000;

export const TRANSCRIBE_MODEL = SEO_METADATA_MODEL;

export const TRANSCRIBE_AUDIO_MIME_ALLOWLIST: ReadonlySet<string> = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
]);

const TRANSCRIBE_SYSTEM = [
  'Kamu adalah transkriptor redaksi jaringan media multi-portal Indonesia.',
  'Dengarkan rekaman yang dilampirkan dan tulis transkrip verbatim dalam Bahasa Indonesia yang rapi dan mudah dibaca.',
  'Tandai pembicara bila jelas (mis. "Pembicara 1", "Narasumber"); tulis [tidak jelas] untuk bagian yang tidak terdengar.',
  'Jangan mengarang ucapan yang tidak terdengar, jangan menambah angka, nama, atau kutipan baru.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"transcript":"..."}',
].join('\n');

const TRANSCRIBE_PROMPT = 'Transkripsikan rekaman berikut menjadi teks Bahasa Indonesia rapi.';

/**
 * Mengikat helper transkripsi ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API.
 */
export function configureAiTranscribe(deps: AiServiceDeps): void {
  configured = deps;
}

/**
 * Mengurai transkrip dari output model yang berupa JSON atau teks mentah.
 *
 * @param text - Output mentah model.
 * @returns Transkrip terpangkas; null bila kosong atau tidak bisa dipakai.
 */
export function parseTranscript(text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.trim()) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const transcript = (parsed as Record<string, unknown>).transcript;
  if (typeof transcript !== 'string' || transcript.trim() === '') return null;
  return transcript.trim().slice(0, 20000);
}

/**
 * Mentranskripsikan rekaman wawancara menjadi teks redaksi Bahasa Indonesia.
 *
 * @param input.base64 - Audio base64 (boleh data URL), dibatasi 10 juta karakter.
 * @param input.mimeType - Tipe MIME audio; hanya WAV, MP3, WebM, OGG, MP4, dan AAC.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Transkrip rapi dari model, atau pesan galat yang aman.
 */
export async function transcribeAudio(input: {
  readonly base64: string;
  readonly mimeType: string;
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly transcript: string } | { readonly ok: false; readonly error: string }> {
  const compact = input.base64.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '');
  if (compact === '' || compact.length > TRANSCRIBE_BASE64_LIMIT) return { ok: false, error: 'Berkas audio terlalu besar atau kosong.' };
  const mimeType = input.mimeType.trim().toLowerCase();
  if (!TRANSCRIBE_AUDIO_MIME_ALLOWLIST.has(mimeType)) return { ok: false, error: 'Format audio belum didukung. Gunakan WAV, MP3, WebM, OGG, MP4, atau AAC.' };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(compact)) return { ok: false, error: 'Berkas audio tidak valid.' };
  const result = await runTaskQuery(configured, 'editor', input.organizationId, {
    prompt: TRANSCRIBE_PROMPT,
    systemInstruction: TRANSCRIBE_SYSTEM,
    temperature: TASK_MODEL_PROFILE.transcribe.temperature,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseSchema: TRANSCRIPT_SCHEMA,
    thinkingTask: 'transcribe',
    audio: [{ base64: compact, mimeType }],
    modelOverride: TRANSCRIBE_MODEL,
    requireModelOwner: true,
    skipSemanticCache: true,
    gatewayOnlyProviders: [SEO_METADATA_GATEWAY_PROVIDER],
  });
  if (!result.ok) return result;
  const transcript = parseTranscript(result.text);
  if (transcript === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, transcript };
}

export interface TranscribedArticle {
  readonly transcript: string;
  readonly draft: ArticleDraft;
  readonly classification: ArticleClassification;
}

const ARTICLE_SYSTEM = [
  'Kamu adalah jurnalis redaksi jaringan media multi-portal Indonesia.',
  'Susun naskah berita formal dan faktual dari transkrip wawancara berikut.',
  'Tulis formal, tanpa clickbait, tanpa mengarang angka, nama, atau kutipan di luar transkrip.',
  'Gunakan placeholder [Nama, Jabatan] bila kutipan dibutuhkan.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"title":"...","excerpt":"...","content":"...","slug_suggestion":"..."}',
].join('\n');

/**
 * Turn one interview recording into a complete news draft for the form.
 *
 * @param input.base64 - Audio base64 (data URL allowed), capped at 10M chars.
 * @param input.mimeType - Audio MIME type from the allowlist.
 * @param input.categories - Category names the classifier may pick; empty skips classify.
 * @param input.organizationId - Organization scoping credentials and audit.
 * @returns Transcript, draft, and classification; or a safe error message.
 */
export async function transcribeToArticle(input: {
  readonly base64: string;
  readonly mimeType: string;
  readonly categories: readonly string[];
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly article: TranscribedArticle } | { readonly ok: false; readonly error: string }> {
  const transcribed = await transcribeAudio({
    base64: input.base64,
    mimeType: input.mimeType,
    ...(input.organizationId === undefined ? {} : { organizationId: input.organizationId }),
  });
  if (!transcribed.ok) return transcribed;
  const allowed = [...new Set(input.categories.map((name) => name.trim()).filter((name) => name !== ''))].slice(0, 80);
  const draftResult = await runTaskQuery(configured, 'editor', input.organizationId, {
    prompt: `Susun naskah berita dari transkrip berikut:\n\n${transcribed.transcript.slice(0, 8000)}`,
    systemInstruction: ARTICLE_SYSTEM,
    temperature: 0.7,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseSchema: ARTICLE_DRAFT_SCHEMA,
    thinkingTask: 'summarize',
  });
  if (!draftResult.ok) return draftResult;
  const draft = parseArticleDraft(draftResult.text, 'Hasil transkrip');
  if (draft === null) return { ok: false, error: BUSY_MESSAGE };
  if (allowed.length === 0) {
    return { ok: true, article: { transcript: transcribed.transcript, draft, classification: { categories: [], tags: [] } } };
  }
  const classifyResult = await runTaskQuery(configured, 'editor', input.organizationId, {
    prompt: `Klasifikasikan artikel berikut.\n\nJudul: ${draft.title}\n\nIsi:\n${draft.content.slice(0, 8000)}\n\nDaftar kategori:\n${allowed.map((name) => `- ${name}`).join('\n')}`,
    systemInstruction: 'Kamu adalah editor taksonomi jaringan media Indonesia. Pilih hingga 3 kategori dari daftar (nama persis), urut paling relevan. Jangan mengarang di luar daftar. Sarankan tag slug kecil bertanda hubung, maksimal 10. Keluarkan JSON murni: {"categories":["..."],"tags":["..."]}',
    temperature: 0.3,
    maxOutputTokens: 512,
    responseMimeType: 'application/json',
    responseSchema: CLASSIFY_ARTICLE_SCHEMA,
    thinkingTask: 'seo',
  });
  if (!classifyResult.ok) return classifyResult;
  const classification = parseClassification(classifyResult.text, allowed);
  if (classification === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, article: { transcript: transcribed.transcript, draft, classification } };
}
