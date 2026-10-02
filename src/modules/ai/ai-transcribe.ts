import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import {
  ARTICLE_DRAFT_SCHEMA,
  CLASSIFY_ARTICLE_SCHEMA,
  TRANSCRIPT_SCHEMA,
} from '@/modules/ai/ai-response-schemas';
import { scanPrompt, stripCodeFence, parseArticleDraft, type ArticleDraft } from '@/modules/ai/ai-usage';
import { parseClassification, type ArticleClassification } from '@/modules/ai/ai-polish';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

let configured: AiServiceDeps | null = null;

export const TRANSCRIBE_BASE64_LIMIT = 10_000_000;

export const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';

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
  const stripped = stripCodeFence(text);
  if (stripped === '') return null;
  try {
    const parsed: unknown = JSON.parse(stripped) as unknown;
    if (typeof parsed === 'string') {
      const transcript = parsed.trim().slice(0, 20000);
      return transcript === '' ? null : transcript;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const record = parsed as Record<string, unknown>;
      if (typeof record.transcript === 'string') {
        const transcript = record.transcript.trim().slice(0, 20000);
        return transcript === '' ? null : transcript;
      }
    }
  } catch {
    /* Bukan JSON; diperlakukan sebagai transkrip mentah di bawah. */
  }
  const raw = stripped.trim().slice(0, 20000);
  return raw === '' ? null : raw;
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
  const scanned = scanPrompt(TRANSCRIBE_PROMPT);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const result = await executeAiQuery(configured, {
    prompt: TRANSCRIBE_PROMPT,
    organizationId: input.organizationId ?? null,
    systemInstruction: TRANSCRIBE_SYSTEM,
    temperature: 0.2,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseSchema: TRANSCRIPT_SCHEMA,
    channel: 'web',
    callerRole: 'editor',
    enableTools: false,
    audio: [{ base64: compact, mimeType }],
    modelOverride: TRANSCRIBE_MODEL,
  });
  if (result.error !== undefined || result.text.trim() === '') return { ok: false, error: BUSY_MESSAGE };
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
 * Mengubah rekaman audio menjadi naskah berita lengkap siap isi formulir.
 *
 * @param input.base64 - Audio base64 (boleh data URL), dibatasi 10 juta karakter.
 * @param input.mimeType - Tipe MIME audio dari allowlist.
 * @param input.categories - Nama kategori yang boleh dipilih klasifikasi.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Transkrip, draf (judul, kutipan, isi, slug), dan klasifikasi; atau pesan galat aman.
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
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const allowed = [...new Set(input.categories.map((name) => name.trim()).filter((name) => name !== ''))].slice(0, 80);
  const draftResult = await executeAiQuery(configured, {
    prompt: `Susun naskah berita dari transkrip berikut:\n\n${transcribed.transcript.slice(0, 8000)}`,
    organizationId: input.organizationId ?? null,
    systemInstruction: ARTICLE_SYSTEM,
    temperature: 0.7,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json',
    responseSchema: ARTICLE_DRAFT_SCHEMA,
    channel: 'web',
    callerRole: 'editor',
    enableTools: false,
  });
  if (draftResult.error !== undefined || draftResult.text.trim() === '') return { ok: false, error: BUSY_MESSAGE };
  const draft = parseArticleDraft(draftResult.text, 'Hasil transkrip');
  if (draft === null) return { ok: false, error: BUSY_MESSAGE };
  const classifyResult = await executeAiQuery(configured, {
    prompt: `Klasifikasikan artikel berikut.\n\nJudul: ${draft.title}\n\nIsi:\n${draft.content.slice(0, 8000)}\n\nDaftar kategori:\n${allowed.map((name) => `- ${name}`).join('\n')}`,
    organizationId: input.organizationId ?? null,
    systemInstruction: 'Kamu adalah editor taksonomi jaringan media Indonesia. Pilih hingga 3 kategori dari daftar (nama persis), urut paling relevan. Jangan mengarang di luar daftar. Sarankan tag slug kecil bertanda hubung, maksimal 10. Keluarkan JSON murni: {"categories":["..."],"tags":["..."]}',
    temperature: 0.3,
    maxOutputTokens: 512,
    responseMimeType: 'application/json',
    responseSchema: CLASSIFY_ARTICLE_SCHEMA,
    channel: 'web',
    callerRole: 'editor',
    enableTools: false,
  });
  const classification = classifyResult.error !== undefined
    ? { categories: [], tags: [] as readonly string[] }
    : (parseClassification(classifyResult.text, allowed) ?? { categories: [], tags: [] as readonly string[] });
  return { ok: true, article: { transcript: transcribed.transcript, draft, classification } };
}
