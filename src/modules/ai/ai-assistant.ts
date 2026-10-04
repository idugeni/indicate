import 'server-only';

import type { AiServiceDeps } from '@/modules/ai/ai-service';
import { runTaskQuery } from '@/modules/ai/ai-task-query';
import { TASK_MODEL_PROFILE } from '@/modules/ai/ai-task-profiles';
import type { AiThinkingConfig } from '@/modules/ai/ai-types';
import { truncateInput } from '@/modules/ai/ai-usage';

export type { AiTaskKind } from '@/modules/ai/ai-task-profiles';
export { TASK_MODEL_PROFILE, taskThinkingOverride } from '@/modules/ai/ai-task-profiles';

const BUSY_MESSAGE = 'Layanan AI sedang sibuk. Silakan coba lagi.';

const GROUNDING_SENTENCE =
  'Gunakan hanya fakta dari judul, kutipan, dan isi yang diberikan; jangan menambah fakta baru di luar teks tersebut.';

const ASSISTANT_HISTORY_LIMIT = 6;
const ASSISTANT_MESSAGE_CAP = 1000;
const ASSISTANT_PROMPT_CAP = 4000;
/** Last characters always kept whole when history overflows the prompt cap. */
const ASSISTANT_TAIL_RESERVE = 800;
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
 * Fold conversation history into one stateless text prompt.
 *
 * @param messages - Chronological user/assistant messages; last six are used.
 * @param context - Optional article excerpt and body for grounding.
 * @returns Labelled transcript plus current question; head is sliced on
 * overflow so the last 800 chars (question + grounding) stay whole.
 */
export function buildAssistantPrompt(messages: readonly AssistantMessage[], context?: AssistantArticleContext | undefined): string {
  const recent = messages.filter((message) => message.text.trim() !== '').slice(-ASSISTANT_HISTORY_LIMIT);
  const current = recent[recent.length - 1];
  if (current === undefined) return '';
  const transcript = recent.slice(0, -1).map((message) => `${message.role === 'user' ? 'Pengguna' : 'Asisten'}: ${truncateInput(message.text, ASSISTANT_MESSAGE_CAP)}`);
  const currentLine = `Pertanyaan saat ini: ${truncateInput(current.text, ASSISTANT_MESSAGE_CAP)}`;
  const excerpt = truncateInput(context?.excerpt ?? '', 2000);
  const body = truncateInput(context?.body ?? '', 2000);
  const grounding = excerpt === '' && body === ''
    ? ''
    : `\n\nKonteks artikel acuan:${excerpt === '' ? '' : `\nKutipan:\n${excerpt}`}${body === '' ? '' : `\nIsi (terpotong):\n${body}`}\n${GROUNDING_SENTENCE}`;
  const head = transcript.length === 0 ? 'Percakapan staf redaksi:\n' : `Percakapan staf redaksi:\n${transcript.join('\n')}\n`;
  const tail = `${currentLine}${grounding}`;
  if (head.length + tail.length <= ASSISTANT_PROMPT_CAP) return head + tail;
  // Tail holds the current question plus grounding; keep its last CAP chars
  // on solo overflow so the final TAIL_RESERVE chars always survive intact.
  if (tail.length >= ASSISTANT_PROMPT_CAP) return tail.slice(-ASSISTANT_PROMPT_CAP);
  const minTailKeep = Math.min(ASSISTANT_TAIL_RESERVE, tail.length);
  const headKeep = ASSISTANT_PROMPT_CAP - tail.length;
  return `${head.slice(head.length - headKeep)}${tail.slice(-Math.max(tail.length, minTailKeep))}`;
}

/**
 * Answer one staff question with the last six folded messages as prompt.
 *
 * @param input.messages - Conversation history; last message is the question.
 * @param input.excerpt - Optional article excerpt for grounding.
 * @param input.body - Optional truncated article body for grounding.
 * @param input.thinkingConfig - Explicit thinking override; else chat profile.
 * @param input.organizationId - Organization scoping credentials and audit.
 * @returns Assistant reply or a safe busy message.
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
  const result = await runTaskQuery(configured, 'editor', input.organizationId, {
    prompt,
    systemInstruction: ASSISTANT_SYSTEM,
    temperature: TASK_MODEL_PROFILE.chat.temperature,
    maxOutputTokens: 1024,
    thinkingTask: 'chat',
    ...(input.thinkingConfig === undefined ? {} : { thinkingConfig: input.thinkingConfig }),
  });
  if (!result.ok) return result;
  const reply = result.text.trim().slice(0, ASSISTANT_REPLY_CAP);
  if (reply === '') return { ok: false, error: BUSY_MESSAGE };
  return { ok: true, reply };
}
