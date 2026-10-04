import 'server-only';

import { BUSY_MESSAGE, runQuery, scanPrompt, stripCodeFence, truncateInput } from '@/modules/ai/ai-usage';
import { CLASSIFY_ARTICLE_SCHEMA, POLISH_BODY_SCHEMA } from '@/modules/ai/ai-response-schemas';
import { TASK_MODEL_PROFILE } from '@/modules/ai/ai-task-profiles';

export type { AiTaskKind } from '@/modules/ai/ai-task-profiles';
export { TASK_MODEL_PROFILE, taskThinkingOverride } from '@/modules/ai/ai-task-profiles';

const GROUNDING_SENTENCE =
  'Gunakan hanya fakta dari judul, kutipan, dan isi yang diberikan; jangan menambah fakta baru di luar teks tersebut.';

const POLISH_SYSTEM = [
  'Kamu adalah editor bahasa senior media Indonesia.',
  'Poles naskah berikut: perbaiki alur, EYD, dan struktur paragraf tanpa mengubah fakta.',
  'JANGAN menambah fakta, angka, nama, kutipan, atau peristiwa baru.',
  'JANGAN menghapus informasi penting. Pertahankan makna setiap paragraf.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"body":"paragraf1\\n\\nparagraf2\\n\\n..."}',
].join('\n');

const CLASSIFY_SYSTEM = [
  'Kamu adalah editor taksonomi jaringan media Indonesia.',
  'Pilih hingga 3 kategori dari daftar yang diberikan, urut dari paling relevan; daftar boleh kosong bila tidak ada yang cocok.',
  'Jangan mengarang kategori di luar daftar. Sarankan tag slug kecil bertanda hubung, maksimal 10.',
  'Keluarkan JSON murni tanpa pagar kode:',
  '{"categories":["..."],"tags":["..."]}',
].join('\n');

/**
 * Memoles isi artikel tanpa mengubah fakta di dalamnya.
 *
 * @param input.title - Judul sebagai konteks nada tulisan.
 * @param input.body - Isi mentah yang dipoles per paragraf.
 * @param input.excerpt - Kutipan acuan opsional sebagai sumber grounding tambahan; kosong berarti perilaku lama.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Isi yang sudah dipoles atau pesan sibuk yang aman.
 */
export async function polishBody(input: {
  readonly title: string;
  readonly body: string;
  readonly excerpt?: string;
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly body: string } | { readonly ok: false; readonly error: string }> {
  const title = truncateInput(input.title, 200);
  const body = truncateInput(input.body, 8000);
  const excerpt = truncateInput(input.excerpt ?? '', 2000);
  if (body === '') return { ok: false, error: 'Isi artikel masih kosong.' };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Poles naskah berikut${title === '' ? '' : ` (konteks judul: ${title})`}:\n\n${body}${excerpt === '' ? '' : `\n\nKutipan acuan:\n${excerpt}`}\n${GROUNDING_SENTENCE}`,
    systemInstruction: POLISH_SYSTEM,
    temperature: TASK_MODEL_PROFILE.polish.temperature,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseSchema: POLISH_BODY_SCHEMA,
    thinkingTask: 'polish',
  });
  if (!result.ok) return result;
  const polished = parsePolishedBody(result.text);
  if (polished === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, body: polished };
}

/**
 * Mengurai isi poles dari output model.
 *
 * @param text - Output mentah model.
 * @returns Isi bersih atau null bila tidak bisa diurai.
 */
export function parsePolishedBody(text: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const body = (parsed as Record<string, unknown>).body;
  if (typeof body !== 'string' || body.trim() === '') return null;
  return body.trim().slice(0, 20000);
}

export interface ArticleClassification {
  readonly categories: readonly string[];
  readonly tags: readonly string[];
}

/**
 * Mengklasifikasi artikel ke kategori dan tag dari isi lengkapnya.
 *
 * @param input.title - Judul artikel.
 * @param input.body - Isi lengkap artikel.
 * @param input.excerpt - Kutipan acuan opsional sebagai sumber grounding tambahan; kosong berarti perilaku lama.
 * @param input.categories - Nama kategori yang boleh dipilih; di luar itu ditolak.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Kategori terpilih plus tag atau pesan sibuk yang aman.
 */
export async function classifyArticle(input: {
  readonly title: string;
  readonly body: string;
  readonly excerpt?: string;
  readonly categories: readonly string[];
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly classification: ArticleClassification } | { readonly ok: false; readonly error: string }> {
  const title = truncateInput(input.title, 200);
  const body = truncateInput(input.body, 8000);
  const excerpt = truncateInput(input.excerpt ?? '', 2000);
  if (title === '' && body === '') return { ok: false, error: 'Judul atau isi diperlukan.' };
  const allowed = [...new Set(input.categories.map((name) => name.trim()).filter((name) => name !== ''))].slice(0, 80);
  if (allowed.length === 0) return { ok: false, error: 'Belum ada kategori untuk dipilih.' };
  const scanned = scanPrompt(`${title}\n${body}`);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  const result = await runQuery('editor', input.organizationId, {
    prompt: `Klasifikasikan artikel berikut.\n\nJudul: ${title}\n\nIsi:\n${body}${excerpt === '' ? '' : `\n\nKutipan acuan:\n${excerpt}`}\n\nDaftar kategori:\n${allowed.map((name) => `- ${name}`).join('\n')}\n${GROUNDING_SENTENCE}`,
    systemInstruction: CLASSIFY_SYSTEM,
    temperature: 0.3,
    maxOutputTokens: 512,
    responseMimeType: 'application/json',
    responseSchema: CLASSIFY_ARTICLE_SCHEMA,
    thinkingTask: 'seo',
  });
  if (!result.ok) return result;
  const classification = parseClassification(result.text, allowed);
  if (classification === null) return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, classification };
}

/**
 * Mengurai klasifikasi model dan memvalidasi kategorinya.
 *
 * @param text - Output mentah model.
 * @param allowed - Nama kategori yang sah; kecocokan case-insensitive.
 * @returns Klasifikasi ternormalisasi (maksimal 3 kategori) atau null bila tidak bisa diurai.
 */
export function parseClassification(text: string, allowed: readonly string[]): ArticleClassification | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text)) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const raw = Array.isArray(record.categories)
    ? record.categories
    : typeof record.category === 'string'
      ? [record.category]
      : [];
  const categories = [...new Set(
    raw
      .filter((item): item is string => typeof item === 'string')
      .map((item) => allowed.find((name) => name.toLowerCase() === item.trim().toLowerCase()))
      .filter((item): item is string => item !== undefined),
  )].slice(0, 3);
  const tags = Array.isArray(record.tags)
    ? record.tags
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
        .filter((item) => item !== '')
        .slice(0, 10)
    : [];
  return { categories, tags: [...new Set(tags)] };
}
