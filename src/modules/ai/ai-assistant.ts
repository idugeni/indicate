import 'server-only';

import { executeAiQuery, type AiServiceDeps } from '@/modules/ai/ai-service';
import { scanPrompt, truncateInput } from '@/modules/ai/ai-usage';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

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
 * Melipat riwayat percakapan menjadi satu prompt teks untuk model tanpa status.
 *
 * @param messages - Pesan user/asisten kronologis; enam terakhir dipakai.
 * @returns Transkrip berlabel plus pertanyaan saat ini, maksimal 4000 karakter.
 */
export function buildAssistantPrompt(messages: readonly AssistantMessage[]): string {
  const recent = messages.filter((message) => message.text.trim() !== '').slice(-ASSISTANT_HISTORY_LIMIT);
  const current = recent[recent.length - 1];
  if (current === undefined) return '';
  const transcript = recent.slice(0, -1).map((message) => `${message.role === 'user' ? 'Pengguna' : 'Asisten'}: ${truncateInput(message.text, ASSISTANT_MESSAGE_CAP)}`);
  const lines = [...transcript, `Pertanyaan saat ini: ${truncateInput(current.text, ASSISTANT_MESSAGE_CAP)}`];
  return `Percakapan staf redaksi:\n${lines.join('\n')}`.slice(0, ASSISTANT_PROMPT_CAP);
}

/**
 * Menjawab pertanyaan staf dengan konteks enam pesan terakhir yang dilipat ke prompt.
 *
 * @param input.messages - Riwayat percakapan; pesan terakhir adalah pertanyaan saat ini.
 * @param input.organizationId - Organisasi untuk cakupan kredensial dan audit.
 * @returns Balasan asisten atau pesan sibuk yang aman.
 */
export async function assistantChat(input: {
  readonly messages: readonly AssistantMessage[];
  readonly organizationId?: string;
}): Promise<{ readonly ok: true; readonly reply: string } | { readonly ok: false; readonly error: string }> {
  if (input.messages.length === 0) return { ok: false, error: 'Pesan diperlukan.' };
  const prompt = buildAssistantPrompt(input.messages);
  if (prompt === '') return { ok: false, error: 'Pesan diperlukan.' };
  const scanned = scanPrompt(prompt);
  if (!scanned.ok) return { ok: false, error: scanned.reason };
  if (configured === null) return { ok: false, error: BUSY_MESSAGE };
  const result = await executeAiQuery(configured, {
    prompt,
    organizationId: input.organizationId ?? null,
    systemInstruction: ASSISTANT_SYSTEM,
    temperature: 0.7,
    maxOutputTokens: 1024,
    channel: 'web',
    callerRole: 'editor',
    enableTools: false,
  });
  if (result.error !== undefined || result.text.trim() === '') return { ok: false, error: BUSY_MESSAGE };
  const reply = result.text.trim().slice(0, ASSISTANT_REPLY_CAP);
  if (reply === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, reply };
}
