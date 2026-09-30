import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import { scanPrompt, truncateInput } from '@/modules/ai/ai-usage';

export const TTS_LIMITS = {
  text: 4000,
  audioBytes: 5242880,
} as const;

export const TTS_MODEL = 'gemini-3.8-flash-tts';

export const TTS_DEFAULT_VOICE = 'Kore';

const TTS_SYSTEM_INSTRUCTION = 'Bacakan teks berikut dengan jelas dalam Bahasa Indonesia.';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

const VOICE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

let configured: AiServiceDeps | null = null;

/**
 * Mengikat sintesis suara ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API.
 */
export function configureAiTts(deps: AiServiceDeps): void {
  configured = deps;
}

export interface TtsAudio {
  readonly mimeType: string;
  readonly base64: string;
}

/**
 * Memilih muatan audio pertama dari kandidat inline-data model.
 *
 * @param inlineData - Kandidat lampiran dari hasil generasi; kosong berarti tidak ada audio.
 * @returns Audio pertama bertipe audio/*; null bila tidak ada kandidat audio.
 */
export function pickAudio(
  inlineData: readonly { readonly mimeType: string; readonly base64: string }[] | undefined,
): TtsAudio | null {
  if (inlineData === undefined) return null;
  for (const item of inlineData) {
    if (
      typeof item?.mimeType === 'string' &&
      item.mimeType.toLowerCase().startsWith('audio/') &&
      typeof item.base64 === 'string' &&
      item.base64 !== ''
    ) {
      return { mimeType: item.mimeType, base64: item.base64 };
    }
  }
  return null;
}

/**
 * Memeriksa ukuran audio terhadap pagu 5 MiB setelah decode base64.
 *
 * @param audio - Audio kandidat dari model.
 * @returns Benar bila estimasi byte hasil decode masih dalam pagu.
 */
export function isAudioWithinCap(audio: TtsAudio): boolean {
  const compact = audio.base64.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '');
  return Math.floor(compact.length * 3 / 4) <= TTS_LIMITS.audioBytes;
}

/**
 * Memvalidasi dan membangun satu permintaan teks-ke-suara.
 *
 * @param text - Teks artikel mentah dari pemanggil.
 * @param voice - Nama suara opsional; kosong memakai suara bawaan.
 * @returns Prompt terpangkas dan nama suara, atau pesan penolakan yang aman.
 */
export function buildTtsInput(
  text: string,
  voice?: string,
): { readonly ok: true; readonly prompt: string; readonly voiceName: string } | { readonly ok: false; readonly error: string } {
  const prompt = truncateInput(text, TTS_LIMITS.text);
  if (prompt === '') return { ok: false, error: 'Teks diperlukan untuk teks-ke-suara.' };
  const trimmedVoice = (voice ?? '').trim();
  if (trimmedVoice === '') return { ok: true, prompt, voiceName: TTS_DEFAULT_VOICE };
  if (!VOICE_PATTERN.test(trimmedVoice)) return { ok: false, error: 'Nama suara tidak valid. Gunakan huruf, angka, tanda hubung, atau garis bawah.' };
  return { ok: true, prompt, voiceName: trimmedVoice };
}

/**
 * Mensintesis teks artikel menjadi audio Bahasa Indonesia.
 *
 * @param input.text - Teks artikel, dipangkas ke 4000 karakter.
 * @param input.voice - Nama suara opsional; kosong memakai suara bawaan.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Audio base64 bertipe audio/*, atau pesan sibuk yang aman.
 */
export async function synthesizeSpeech(input: {
  readonly text: string;
  readonly voice?: string;
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly audio: TtsAudio } | { readonly ok: false; readonly error: string }> {
  const built = buildTtsInput(input.text, input.voice);
  if (!built.ok) return built;
  const scanned = scanPrompt(built.prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const result = await executeAiQuery(configured, {
    prompt: built.prompt,
    organizationId: input.organizationId ?? null,
    systemInstruction: TTS_SYSTEM_INSTRUCTION,
    temperature: 0.3,
    maxOutputTokens: 512,
    channel: 'web',
    callerRole: 'editor',
    enableTools: false,
    modelOverride: TTS_MODEL,
    responseModalities: ['AUDIO'],
    speechVoiceName: built.voiceName,
  });
  if (result.error !== undefined || (result.text.trim() === '' && (result.inlineData?.length ?? 0) === 0)) {
    return { ok: false, error: BUSY_MESSAGE };
  }
  const audio = pickAudio(result.inlineData);
  if (audio === null) return { ok: false, error: BUSY_MESSAGE };
  if (!isAudioWithinCap(audio)) return { ok: false, error: 'Audio hasil terlalu besar. Coba teks yang lebih pendek.' };
  return { ok: true, audio };
}
