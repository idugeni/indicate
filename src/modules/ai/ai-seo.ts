import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import type { AiCallerRole, AiChatImage } from '@/modules/ai/ai-types';
import { AI_LIMITS, scanPrompt, stripCodeFence, truncateInput } from '@/modules/ai/ai-usage';
import { slugify } from '@/modules/site/slugify';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

let configured: AiServiceDeps | null = null;

/**
 * Mengikat bantuan SEO ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API.
 */
export function configureAiSeo(deps: AiServiceDeps): void {
  configured = deps;
}

async function runQuery(callerRole: AiCallerRole, organizationId: string | undefined, query: {
  readonly prompt: string;
  readonly systemInstruction: string;
  readonly temperature: number;
  readonly maxOutputTokens: number;
  readonly responseMimeType?: string;
  readonly images?: readonly AiChatImage[] | undefined;
}): Promise<{ readonly ok: true; readonly text: string } | { readonly ok: false; readonly error: string }> {
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
    channel: 'web',
    callerRole,
    enableTools: false,
    ...(query.images === undefined ? {} : { images: [...query.images] }),
  });
  if (result.error !== undefined || result.text.trim() === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, text: result.text };
}

const SEO_SYSTEM = [
  'Kamu adalah editor SEO redaksi jaringan media multi-portal Indonesia.',
  'Tulis formal, faktual, tanpa clickbait, tanpa mengarang angka, nama, atau kutipan.',
  'Susun 3 varian judul ringkas, satu deskripsi meta 150-160 karakter (bidik sedekat mungkin ke 160 tanpa melebihi), satu slug, dan satu kutipan ringkas hanya dari judul dan isi yang diberikan.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"titles":["...","...","..."],"meta_description":"...","slug":"...","excerpt":"..."}',
].join('\n');

export interface SeoSuggestion {
  readonly titles: readonly string[];
  readonly metaDescription: string;
  readonly slug: string;
  readonly excerpt: string;
}

/**
 * Mengurai saran SEO JSON dari model dengan normalisasi aman.
 *
 * @param text - Output mentah model.
 * @returns Saran SEO ternormalisasi; null bila tidak bisa diurai atau tanpa judul.
 */
export function parseSeoSuggestion(text: string): SeoSuggestion | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const rawTitles = Array.isArray(record.titles)
    ? record.titles
    : Array.isArray(record.judul)
      ? record.judul
      : [];
  const titles = rawTitles
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().slice(0, 160))
    .slice(0, 3);
  if (titles.length === 0) return null;
  const metaDescription = typeof record.meta_description === 'string' && record.meta_description.trim() !== ''
    ? record.meta_description.trim().slice(0, 160)
    : typeof record.metaDescription === 'string'
      ? record.metaDescription.trim().slice(0, 160)
      : '';
  const slugSource = typeof record.slug === 'string' && record.slug.trim() !== '' ? record.slug : titles[0] ?? '';
  const excerpt = typeof record.excerpt === 'string' ? record.excerpt.trim().slice(0, 400) : '';
  return { titles, metaDescription, slug: slugify(slugSource).slice(0, 120), excerpt };
}

/**
 * Menyarankan varian judul, deskripsi meta, slug, dan kutipan untuk artikel.
 *
 * @param input.title - Judul artikel saat ini.
 * @param input.body - Isi artikel terpangkas.
 * @param input.current - Deskripsi yang sudah ada; bila diisi, model menyempurnakannya alih-alih membuat baru.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Saran SEO atau pesan sibuk yang aman.
 */
export async function suggestSeo(input: { readonly title: string; readonly body: string; readonly current?: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly result: SeoSuggestion } | { readonly ok: false; readonly error: string }> {
  const title = truncateInput(input.title, AI_LIMITS.title);
  const body = truncateInput(input.body, AI_LIMITS.body);
  const current = truncateInput(input.current ?? '', 400);
  if (title === '' && body === '') return { ok: false, error: 'Judul atau isi diperlukan.' };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Susun saran SEO untuk artikel berikut:\n\nJudul: ${title}\n\nIsi:\n${body}${current === '' ? '' : `\n\nDeskripsi saat ini (sempurnakan tanpa mengubah makna menjadi 150-160 karakter, sedekat mungkin ke 160):\n${current}`}`,
    systemInstruction: SEO_SYSTEM, temperature: 0.7, maxOutputTokens: 1024, responseMimeType: 'application/json',
  });
  if (!result.ok) return result;
  const suggestion = parseSeoSuggestion(result.text);
  if (suggestion === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, result: suggestion };
}
