import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import { scanPrompt, stripCodeFence } from '@/modules/ai/ai-usage';

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
