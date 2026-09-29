import 'server-only';

import { GoogleGenAI } from '@google/genai';

import type { AiAdapterResponse, AiChatPrompt, AiToolExecutor } from '@/integrations/ai/ai-prompt';

const MAX_TOOL_TURNS = 3;
const MAX_HISTORY_MESSAGES = 6;
const MAX_IMAGES = 4;

function isGemini3(modelName: string): boolean {
  return /^gemini-3(\.|-|$)/.test(modelName);
}

function resolveThinkingLevel(budget: number | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
  if (budget === undefined || budget === -1) return undefined;
  if (budget <= 8192) return 'LOW';
  if (budget <= 32768) return 'MEDIUM';
  return 'HIGH';
}

function buildConfig(promptData: AiChatPrompt, modelName: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  if (promptData.systemInstruction !== undefined) config.systemInstruction = promptData.systemInstruction;
  if (!isGemini3(modelName)) {
    config.temperature = promptData.temperature ?? 1.0;
    config.topP = promptData.topP ?? 1.0;
    config.topK = promptData.topK ?? 64;
  }
  config.maxOutputTokens = promptData.maxOutputTokens ?? 65536;
  if (promptData.presencePenalty !== undefined) config.presencePenalty = promptData.presencePenalty;
  if (promptData.frequencyPenalty !== undefined) config.frequencyPenalty = promptData.frequencyPenalty;
  if (promptData.seed !== undefined) config.seed = promptData.seed;
  if (promptData.stopSequences !== undefined && promptData.stopSequences.length > 0) {
    config.stopSequences = [...promptData.stopSequences];
  }
  if (promptData.responseMimeType !== undefined) config.responseMimeType = promptData.responseMimeType;
  if (promptData.responseSchema !== undefined) config.responseSchema = promptData.responseSchema;
  if (promptData.thinkingConfig !== undefined) {
    const budget = promptData.thinkingConfig.thinkingBudget;
    if (isGemini3(modelName)) {
      const thinking: Record<string, unknown> = {};
      const level = resolveThinkingLevel(budget);
      if (level !== undefined) thinking.thinkingLevel = level;
      if (promptData.thinkingConfig.includeThoughts !== undefined) {
        thinking.includeThoughts = promptData.thinkingConfig.includeThoughts;
      }
      if (Object.keys(thinking).length > 0) config.thinkingConfig = thinking;
    } else {
      config.thinkingConfig = {
        thinkingBudget: budget,
        includeThoughts: promptData.thinkingConfig.includeThoughts,
      };
    }
  }
  if (promptData.safetySettings !== undefined && promptData.safetySettings.length > 0) {
    config.safetySettings = [...promptData.safetySettings];
  }
  return config;
}

function buildContents(promptData: AiChatPrompt): Array<{ role: string; parts: Array<Record<string, unknown>> }> {
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
  for (const message of (promptData.history ?? []).slice(-MAX_HISTORY_MESSAGES)) {
    contents.push({
      role: message.role === 'assistant' ? 'model' : message.role,
      parts: [{ text: message.text }],
    });
  }
  const userParts: Array<Record<string, unknown>> = [{ text: promptData.prompt }];
  for (const image of promptData.images ?? []) {
    userParts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
  }
  contents.push({ role: 'user', parts: userParts });
  return contents;
}

function readStreamUsage(chunk: unknown): AiAdapterResponse['tokensUsage'] {
  if (typeof chunk !== 'object' || chunk === null) return undefined;
  const meta = (chunk as { readonly usageMetadata?: unknown }).usageMetadata;
  if (typeof meta !== 'object' || meta === null) return undefined;
  const record = meta as Record<string, unknown>;
  const prompt = typeof record.promptTokenCount === 'number' ? record.promptTokenCount : 0;
  const completion = typeof record.candidatesTokenCount === 'number' ? record.candidatesTokenCount : 0;
  const total = typeof record.totalTokenCount === 'number' ? record.totalTokenCount : 0;
  return { prompt, completion, total };
}

/**
 * Reads one text delta from a streamed generation chunk.
 *
 * @param chunk - Single SDK stream item with an optional text payload.
 * @returns Text delta, or empty string when the chunk carries none.
 */
export function extractStreamText(chunk: unknown): string {
  if (typeof chunk !== 'object' || chunk === null) return '';
  const text = (chunk as { readonly text?: unknown }).text;
  return typeof text === 'string' ? text : '';
}

/** Delivery controls for one streamed Gemini turn. */
export interface GeminiStreamOptions {
  readonly signal?: AbortSignal | undefined;
  readonly onChunk?: ((delta: string) => void) | undefined;
}

function isStreamAborted(options: GeminiStreamOptions | undefined): boolean {
  return options?.signal?.aborted === true;
}

/**
 * Runs one streamed Gemini chat turn with an explicitly provided router key.
 *
 * @param plainKey - Decrypted API key from the router database, never from environment.
 * @param modelName - Gemini model identifier owned by the router model config.
 * @param promptData - Prompt, history, and generation controls.
 * @param options - Abort signal plus an optional per-delta callback for SSE fan-out.
 * @returns Full model text, token usage when the provider reports it, and no tool calls.
 * @throws {Error} When the provider rejects the request or the signal aborts; the message never carries key material.
 */
export async function executeGeminiStream(
  plainKey: string,
  modelName: string,
  promptData: AiChatPrompt,
  options?: GeminiStreamOptions | undefined,
): Promise<AiAdapterResponse> {
  if (plainKey.length === 0) throw new Error('Gemini adapter requires a router-provided key.');
  if (isStreamAborted(options)) throw new Error('Gemini stream aborted.');
  const images = promptData.images ?? [];
  if (images.length > MAX_IMAGES) throw new Error('Gemini adapter supports at most 4 images per request.');
  const client = new GoogleGenAI(
    plainKey.startsWith('AQ.') ? { apiKey: plainKey, apiVersion: 'v1alpha' } : { apiKey: plainKey },
  );
  const contents = buildContents(promptData);
  let stream: AsyncIterable<unknown>;
  try {
    stream = (await client.models.generateContentStream({
      model: modelName,
      contents,
      config: buildConfig(promptData, modelName),
    })) as AsyncIterable<unknown>;
  } catch {
    throw new Error('Gemini stream request failed.');
  }
  let text = '';
  let tokensUsage: AiAdapterResponse['tokensUsage'];
  try {
    for await (const chunk of stream) {
      if (isStreamAborted(options)) throw new Error('Gemini stream aborted.');
      const delta = extractStreamText(chunk);
      if (delta !== '') {
        text += delta;
        options?.onChunk?.(delta);
      }
      const usage = readStreamUsage(chunk);
      if (usage !== undefined) tokensUsage = usage;
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Gemini stream aborted.') throw error;
    throw new Error('Gemini stream interrupted.');
  }
  return {
    text: text === '' ? 'Informasi telah diproses oleh sistem.' : text,
    toolCallsExecuted: [],
    ...(tokensUsage === undefined ? {} : { tokensUsage }),
  };
}
export async function executeGeminiAdapter(
  plainKey: string,
  modelName: string,
  promptData: AiChatPrompt,
  toolExecutor?: AiToolExecutor,
): Promise<AiAdapterResponse> {
  if (plainKey.length === 0) throw new Error('Gemini adapter requires a router-provided key.');
  const images = promptData.images ?? [];
  if (images.length > MAX_IMAGES) throw new Error('Gemini adapter supports at most 4 images per request.');
  const client = new GoogleGenAI(
    plainKey.startsWith('AQ.') ? { apiKey: plainKey, apiVersion: 'v1alpha' } : { apiKey: plainKey },
  );
  const contents = buildContents(promptData);
  const executedTools: string[] = [];
  const toolResults: Record<string, unknown> = {};
  const useTools = promptData.enableTools === true;
  let response;
  try {
    response = await client.models.generateContent({ model: modelName, contents, config: buildConfig(promptData, modelName) });
  } catch {
    throw new Error('Gemini request failed.');
  }
  let turns = 0;
  while (useTools && response.functionCalls !== undefined && response.functionCalls.length > 0 && turns < MAX_TOOL_TURNS) {
    turns += 1;
    const calls = response.functionCalls;
    const functionResponses: Array<Record<string, unknown>> = [];
    for (const call of calls) {
      const toolName = call.name ?? '';
      executedTools.push(toolName);
      let result: unknown = null;
      if (toolExecutor !== undefined) {
        result = await toolExecutor(toolName, (call.args ?? {}) as Record<string, unknown>);
      }
      toolResults[toolName] = result;
      functionResponses.push({
        functionResponse: {
          ...(typeof call.id === 'string' && call.id.length > 0 ? { id: call.id } : {}),
          name: toolName,
          response: { output: typeof result === 'object' && result !== null ? result : { result } },
        },
      });
    }
    const modelParts = (response.candidates?.[0]?.content?.parts ?? []) as unknown as Array<Record<string, unknown>>;
    contents.push({ role: 'model', parts: modelParts });
    contents.push({ role: 'user', parts: functionResponses });
    try {
      response = await client.models.generateContent({ model: modelName, contents, config: buildConfig(promptData, modelName) });
    } catch {
      throw new Error('Gemini tool continuation failed.');
    }
  }
  const usage = response.usageMetadata;
  const tokensUsage =
    usage === undefined
      ? undefined
      : {
          prompt: usage.promptTokenCount ?? 0,
          completion: usage.candidatesTokenCount ?? 0,
          total: usage.totalTokenCount ?? 0,
        };
  if (tokensUsage === undefined) {
    return { text: response.text ?? 'Informasi telah diproses oleh sistem.', toolCallsExecuted: executedTools, toolResults };
  }
  return {
    text: response.text ?? 'Informasi telah diproses oleh sistem.',
    toolCallsExecuted: executedTools,
    toolResults,
    tokensUsage,
  };
}
