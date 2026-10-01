import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import type { AiCallerRole, AiChatImage } from '@/modules/ai/ai-types';
import { AI_LIMITS, scanPrompt, stripCodeFence, truncateInput } from '@/modules/ai/ai-usage';

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

const SEO_TITLE_SYSTEM = [
  'Kamu adalah editor SEO redaksi jaringan media multi-portal Indonesia.',
  'Tulis Bahasa Indonesia formal sesuai EYD: faktual, netral, tanpa clickbait, tanpa emoji, tanpa hashtag, tanpa huruf kapital semua.',
  'Jangan mengarang: hanya pakai fakta, angka, nama, dan kutipan yang tertulis di judul atau isi. Bila input tipis, susun dari yang ada tanpa menambah.',
  'Susun tepat 3 varian judul dengan sudut berbeda: (1) fakta utama, (2) lokasi atau dampak bagi warga, (3) konteks atau tindak lanjut. Dahulukan kata kunci berita di awal bila wajar.',
  'Bidikan 50-60 karakter agar tampil penuh di hasil cari; jangan lewat 110 karakter. Setiap varian satu baris, tanpa tanda kutip pembungkus, tanpa titik akhir.',
  'Bernalarlah diam-diam dan keluarkan hanya JSON murni tanpa pagar kode, contoh:',
  '{"titles":["...","...","..."]}',
].join('\n');

const SEO_META_SYSTEM = [
  'Kamu adalah editor SEO redaksi jaringan media multi-portal Indonesia.',
  'Tulis Bahasa Indonesia formal sesuai EYD: faktual, netral, tanpa clickbait, tanpa mengarang angka, nama, atau kutipan.',
  'Susun satu deskripsi meta 150-160 karakter, bidik sedekat mungkin ke 160 tanpa melebihi: satu-dua kalimat lengkap yang memuat topik utama plus lokasi atau aktor kunci, menjawab apa dan di mana, tanpa mengulang judul kata per kata.',
  'Bila ada "Deskripsi saat ini", sempurnakan tanpa mengubah makna: perbaiki alur dan EYD, kejar 150-160 karakter, jangan tambah fakta baru.',
  'Jangan potong kalimat di tengah; akhiri dengan titik. Tanpa markdown, tanpa tanda kutip pembungkus, tanpa ajakan seperti "baca selengkapnya".',
  'Bernalarlah diam-diam dan keluarkan hanya JSON murni tanpa pagar kode, contoh:',
  '{"meta_description":"..."}',
].join('\n');

const SEO_EXCERPT_SYSTEM = [
  'Kamu adalah editor SEO redaksi jaringan media multi-portal Indonesia.',
  'Tulis Bahasa Indonesia formal sesuai EYD: faktual, netral, tanpa clickbait, tanpa mengarang angka, nama, atau kutipan.',
  'Susun satu kutipan ringkas 1-2 kalimat (bidikan 120-200 karakter, maksimal 400): ringkasan inti yang menjawab apa, di mana, dan dampak atau tindak lanjut, untuk kartu listing dan cuplikan RSS.',
  'Tulis ulang dengan kata-katamu, jangan salin judul atau kalimat isi mentah-mentah. Kalimat lengkap berakhiri titik, tanpa markdown dan tanpa tanda kutip pembungkus.',
  'Bila input tipis, rangkum yang ada tanpa menambah. Bernalarlah diam-diam dan keluarkan hanya JSON murni tanpa pagar kode, contoh:',
  '{"excerpt":"..."}',
].join('\n');

function parseJsonRecord(text: string): Record<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  return parsed as Record<string, unknown>;
}

/**
 * Mengurai varian judul dari output model.
 *
 * @param text - Output mentah model.
 * @returns Tiga judul ternormalisasi; null bila tidak bisa diurai atau tanpa judul.
 */
export function parseTitleSuggestions(text: string): readonly string[] | null {
  const record = parseJsonRecord(text);
  if (record === null) return null;
  const raw = Array.isArray(record.titles) ? record.titles : Array.isArray(record.judul) ? record.judul : [];
  const titles = raw
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map((item) => item.trim().slice(0, 160))
    .slice(0, 3);
  if (titles.length === 0) return null;
  return titles;
}

/**
 * Mengurai deskripsi meta dari output model.
 *
 * @param text - Output mentah model.
 * @returns Deskripsi maksimal 160 karakter; null bila kosong atau tidak bisa diurai.
 */
export function parseMetaDescription(text: string): string | null {
  const record = parseJsonRecord(text);
  if (record === null) return null;
  const raw = typeof record.meta_description === 'string' && record.meta_description.trim() !== ''
    ? record.meta_description
    : typeof record.metaDescription === 'string'
      ? record.metaDescription
      : '';
  const meta = raw.trim().slice(0, 160);
  if (meta === '') return null;
  return meta;
}

/**
 * Mengurai kutipan ringkas dari output model.
 *
 * @param text - Output mentah model.
 * @returns Kutipan maksimal 400 karakter; null bila tidak bisa diurai.
 */
export function parseExcerptSuggestion(text: string): string | null {
  const record = parseJsonRecord(text);
  if (record === null) return null;
  const raw = typeof record.excerpt === 'string' ? record.excerpt : '';
  return raw.trim().slice(0, 400);
}

function baseInput(input: { readonly title: string; readonly body: string }): { readonly title: string; readonly body: string } | null {
  const title = truncateInput(input.title, AI_LIMITS.title);
  const body = truncateInput(input.body, AI_LIMITS.body);
  if (title === '' && body === '') return null;
  return { title, body };
}

/**
 * Menyarankan 3 varian judul untuk artikel.
 *
 * @param input.title - Judul artikel saat ini.
 * @param input.body - Isi artikel terpangkas.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Varian judul atau pesan sibuk yang aman.
 */
export async function suggestTitles(input: { readonly title: string; readonly body: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly titles: readonly string[] } | { readonly ok: false; readonly error: string }> {
  const base = baseInput(input);
  if (base === null) return { ok: false, error: 'Judul atau isi diperlukan.' };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Susun 3 varian judul ringkas untuk artikel berikut:\n\nJudul: ${base.title}\n\nIsi:\n${base.body}`,
    systemInstruction: SEO_TITLE_SYSTEM, temperature: 0.7, maxOutputTokens: 512, responseMimeType: 'application/json',
  });
  if (!result.ok) return result;
  const titles = parseTitleSuggestions(result.text);
  if (titles === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, titles };
}

/**
 * Menyarankan deskripsi meta 150-160 karakter untuk artikel.
 *
 * @param input.title - Judul artikel saat ini.
 * @param input.body - Isi artikel terpangkas.
 * @param input.current - Deskripsi yang sudah ada; bila diisi, model menyempurnakannya alih-alih membuat baru.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Deskripsi meta atau pesan sibuk yang aman.
 */
export async function suggestMetaDescription(input: { readonly title: string; readonly body: string; readonly current?: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly metaDescription: string } | { readonly ok: false; readonly error: string }> {
  const base = baseInput(input);
  if (base === null) return { ok: false, error: 'Judul atau isi diperlukan.' };
  const current = truncateInput(input.current ?? '', 400);
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Susun satu deskripsi meta untuk artikel berikut:\n\nJudul: ${base.title}\n\nIsi:\n${base.body}${current === '' ? '' : `\n\nDeskripsi saat ini (sempurnakan tanpa mengubah makna menjadi 150-160 karakter, sedekat mungkin ke 160):\n${current}`}`,
    systemInstruction: SEO_META_SYSTEM, temperature: 0.5, maxOutputTokens: 256, responseMimeType: 'application/json',
  });
  if (!result.ok) return result;
  const metaDescription = parseMetaDescription(result.text);
  if (metaDescription === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, metaDescription };
}

/**
 * Menyarankan kutipan ringkas untuk artikel.
 *
 * @param input.title - Judul artikel saat ini.
 * @param input.body - Isi artikel terpangkas.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Kutipan ringkas atau pesan sibuk yang aman.
 */
export async function suggestExcerpt(input: { readonly title: string; readonly body: string; readonly organizationId?: string }): Promise<{ readonly ok: true; readonly excerpt: string } | { readonly ok: false; readonly error: string }> {
  const base = baseInput(input);
  if (base === null) return { ok: false, error: 'Judul atau isi diperlukan.' };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Susun satu kutipan ringkas untuk artikel berikut:\n\nJudul: ${base.title}\n\nIsi:\n${base.body}`,
    systemInstruction: SEO_EXCERPT_SYSTEM, temperature: 0.7, maxOutputTokens: 512, responseMimeType: 'application/json',
  });
  if (!result.ok) return result;
  const excerpt = parseExcerptSuggestion(result.text);
  if (excerpt === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, excerpt };
}
