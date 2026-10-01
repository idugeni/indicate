import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import type { AiThinkingConfig } from '@/modules/ai/ai-types';
import { scanPrompt, truncateInput } from '@/modules/ai/ai-usage';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

const GROUNDING_SENTENCE =
  'Gunakan hanya fakta dari judul, kutipan, dan isi yang diberikan; jangan menambah fakta baru di luar teks tersebut.';

/**
 * Jenis tugas AI yang dipetakan ke profil model hemat.
 *
 * @remarks Kunci `ringkas` adalah alias tugas `summarize` di control plane.
 */
export type AiTaskKind = 'caption' | 'seo' | 'polish' | 'ringkas' | 'sampul' | 'chat' | 'embed';

/**
 * Profil model hemat per tugas: tier murah, suhu yang disarankan, dan anggaran thinking.
 *
 * @remarks `thinkingBudget` yang `undefined` berarti memakai default kanal adapter.
 */
export interface TaskModelProfile {
  readonly modelTier: 'murah';
  readonly temperature: number;
  readonly thinkingBudget?: number | undefined;
}

/**
 * Matriks tugas ke profil model hemat.
 *
 * @remarks Caption dan SEO memakai penalaran pendek agar cepat; polish dan
 * ringkas memakai anggaran besar agar hasilnya matang; sampul, chat, dan
 * embed memakai default kanal tanpa thinking tambahan.
 */
export const TASK_MODEL_PROFILE: Record<AiTaskKind, TaskModelProfile> = {
  caption: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 1024 },
  seo: { modelTier: 'murah', temperature: 0.5, thinkingBudget: 2048 },
  polish: { modelTier: 'murah', temperature: 0.5, thinkingBudget: 8192 },
  ringkas: { modelTier: 'murah', temperature: 0.3, thinkingBudget: 8192 },
  sampul: { modelTier: 'murah', temperature: 0.8 },
  chat: { modelTier: 'murah', temperature: 0.7 },
  embed: { modelTier: 'murah', temperature: 0 },
};

/**
 * Mengembalikan override thinking untuk satu tugas dari matriks profil.
 *
 * @param task - Tugas yang menentukan anggaran default.
 * @param userOverride - Override eksplisit pemanggil, dihormati lebih dulu.
 * @returns Konfigurasi thinking tugas tersebut, atau undefined bila memakai default kanal.
 */
export function taskThinkingOverride(
  task: AiTaskKind | (string & {}),
  userOverride?: AiThinkingConfig | undefined,
): AiThinkingConfig | undefined {
  if (userOverride?.thinkingBudget !== undefined) return userOverride;
  const profile = (TASK_MODEL_PROFILE as Record<string, TaskModelProfile>)[task];
  if (profile?.thinkingBudget === undefined) return undefined;
  return { thinkingBudget: profile.thinkingBudget, includeThoughts: true };
}

const ASSISTANT_HISTORY_LIMIT = 6;
const ASSISTANT_MESSAGE_CAP = 1000;
const ASSISTANT_PROMPT_CAP = 4000;
const ASSISTANT_REPLY_CAP = 3000;

const ASSISTANT_SYSTEM = [
  'Kamu adalah kopilot staf redaksi jaringan media multi-portal Indonesia.',
  'Jawab lugas dalam Bahasa Indonesia.',
  'Tolak topik di luar redaksi dengan sopan dan arahkan kembali ke kerja redaksi.',
  'Teks biasa tanpa markdown berat.',
].join('\n');

let configured: AiServiceDeps | null = null;

export interface AssistantMessage {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

/**
 * Mengikat asisten dasbor ke control plane AI paralel.
 *
 * @param deps - Batas database, budget, dan adapter dari rute API.
 */
export function configureAiAssistant(deps: AiServiceDeps): void {
  configured = deps;
}

/**
 * Konteks artikel acuan opsional untuk grounding jawaban asisten.
 *
 * @remarks Kedua field kosong berarti perilaku lama tanpa grounding artikel.
 */
export interface AssistantArticleContext {
  readonly excerpt?: string | undefined;
  readonly body?: string | undefined;
}

/**
 * Melipat riwayat percakapan menjadi satu prompt teks untuk model tanpa status.
 *
 * @param messages - Pesan user/asisten kronologis; enam terakhir dipakai.
 * @param context - Kutipan dan isi artikel acuan opsional; kosong berarti perilaku lama.
 * @returns Transkrip berlabel plus pertanyaan saat ini, maksimal 4000 karakter.
 */
export function buildAssistantPrompt(messages: readonly AssistantMessage[], context?: AssistantArticleContext | undefined): string {
  const recent = messages.filter((message) => message.text.trim() !== '').slice(-ASSISTANT_HISTORY_LIMIT);
  const current = recent[recent.length - 1];
  if (current === undefined) return '';
  const transcript = recent.slice(0, -1).map((message) => `${message.role === 'user' ? 'Pengguna' : 'Asisten'}: ${truncateInput(message.text, ASSISTANT_MESSAGE_CAP)}`);
  const lines = [...transcript, `Pertanyaan saat ini: ${truncateInput(current.text, ASSISTANT_MESSAGE_CAP)}`];
  const excerpt = truncateInput(context?.excerpt ?? '', 2000);
  const body = truncateInput(context?.body ?? '', 2000);
  const grounding = excerpt === '' && body === ''
    ? ''
    : `\n\nKonteks artikel acuan:${excerpt === '' ? '' : `\nKutipan:\n${excerpt}`}${body === '' ? '' : `\nIsi (terpotong):\n${body}`}\n${GROUNDING_SENTENCE}`;
  return `Percakapan staf redaksi:\n${lines.join('\n')}${grounding}`.slice(0, ASSISTANT_PROMPT_CAP);
}

/**
 * Menjawab pertanyaan staf dengan konteks enam pesan terakhir yang dilipat ke prompt.
 *
 * @param input.messages - Riwayat percakapan; pesan terakhir adalah pertanyaan saat ini.
 * @param input.excerpt - Kutipan artikel acuan opsional untuk grounding; kosong berarti perilaku lama.
 * @param input.body - Isi artikel acuan terpotong opsional untuk grounding; kosong berarti perilaku lama.
 * @param input.thinkingConfig - Override thinking eksplisit; default memakai profil tugas chat.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Balasan asisten atau pesan sibuk yang aman.
 */
export async function assistantChat(input: {
  readonly messages: readonly AssistantMessage[];
  readonly excerpt?: string;
  readonly body?: string;
  readonly thinkingConfig?: AiThinkingConfig;
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly reply: string } | { readonly ok: false; readonly error: string }> {
  if (input.messages.length === 0) return { ok: false, error: 'Pesan diperlukan.' };
  const prompt = buildAssistantPrompt(input.messages, input.excerpt === undefined && input.body === undefined
    ? undefined
    : { excerpt: input.excerpt, body: input.body });
  if (prompt === '') return { ok: false, error: 'Pesan diperlukan.' };
  const scanned = scanPrompt(prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const result = await executeAiQuery(configured, {
    prompt,
    organizationId: input.organizationId ?? null,
    systemInstruction: ASSISTANT_SYSTEM,
    temperature: TASK_MODEL_PROFILE.chat.temperature,
    maxOutputTokens: 1024,
    thinkingConfig: input.thinkingConfig ?? taskThinkingOverride('chat'),
    channel: 'web',
    callerRole: 'editor',
    enableTools: false,
  });
  if (result.error !== undefined || result.text.trim() === '') return { ok: false, error: BUSY_MESSAGE };
  const reply = result.text.trim().slice(0, ASSISTANT_REPLY_CAP);
  if (reply === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, reply };
}
