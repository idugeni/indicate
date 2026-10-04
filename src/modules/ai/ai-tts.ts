import 'server-only';

import type { AiServiceDeps } from '@/modules/ai/ai-service';
import { runTaskQuery } from '@/modules/ai/ai-task-query';
import { TASK_MODEL_PROFILE } from '@/modules/ai/ai-task-profiles';
import { truncateInput } from '@/modules/ai/ai-usage';

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
 * Synthesize article text into Indonesian speech audio.
 *
 * @param input.text - Article text, truncated to 4000 chars.
 * @param input.voice - Optional voice name; empty uses the default voice.
 * @param input.organizationId - Organization scoping credentials and audit.
 * @returns Base64 audio of type audio/*, or a safe busy message.
 */
export async function synthesizeSpeech(input: {
  readonly text: string;
  readonly voice?: string;
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly audio: TtsAudio } | { readonly ok: false; readonly error: string }> {
  const built = buildTtsInput(input.text, input.voice);
  if (!built.ok) return built;
  // TTS is a non-text task: forward thinkingBudget 0 via the tts profile.
  // AiThinkingConfig permits 0, so it travels as thinkingConfig as-is.
  const result = await runTaskQuery(configured, 'editor', input.organizationId, {
    prompt: built.prompt,
    systemInstruction: TTS_SYSTEM_INSTRUCTION,
    temperature: TASK_MODEL_PROFILE.tts.temperature,
    maxOutputTokens: 512,
    thinkingTask: 'tts',
    modelOverride: TTS_MODEL,
    responseModalities: ['AUDIO'],
    speechVoiceName: built.voiceName,
  });
  if (!result.ok) return result;
  const audio = pickAudio(result.inlineData);
  if (audio === null) return { ok: false, error: BUSY_MESSAGE };
  if (!isAudioWithinCap(audio)) return { ok: false, error: 'Audio hasil terlalu besar. Coba teks yang lebih pendek.' };
  return { ok: true, audio };
}
