import 'server-only';

import { GoogleGenAI } from '@google/genai';

import type { AiAdapterResponse, AiChatPrompt, AiToolExecutor } from '@/integrations/ai/ai-prompt';
import {
  buildCloudflareGatewayBaseUrl,
  buildCloudflareGatewayHeaders,
  CLOUDFLARE_GATEWAY_GOOGLE_PATH,
  type CloudflareGatewayConfig,
} from '@/integrations/ai/gateway/cloudflare/cloudflare-gateway';

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

const UPSTREAM_DETAIL_LIMIT = 300;
const GEMINI_KEY_PATTERN = /AIza[0-9A-Za-z_-]{10,}/g;

/**
 * Describe a provider failure without losing the signal or leaking the key.
 *
 * `classifyAiError` routes on substrings such as `429` or `quota exceeded`, and
 * `ai_credentials.last_error_message` is what an operator reads, so a bare
 * `catch` that replaced the message with a constant turned every real provider
 * fault into the same unactionable `application_error`. The key is redacted
 * because the detail is persisted and echoed into logs.
 *
 * @param error - Thrown SDK or transport error.
 * @param secret - Plain API key that must never reach the message.
 * @returns Single-line detail carrying the HTTP status when the SDK reported one.
 */
function describeUpstreamError(error: unknown, secret: string): string {
  const status = (error as { readonly status?: unknown } | null | undefined)?.status;
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const redacted = (secret === '' ? raw : raw.split(secret).join('[redacted]')).replace(
    GEMINI_KEY_PATTERN,
    '[redacted]',
  );
  const detail = redacted.replace(/\s+/g, ' ').trim().slice(0, UPSTREAM_DETAIL_LIMIT);
  const prefix = typeof status === 'number' ? `http ${status}` : 'no status';
  return detail === '' ? prefix : `${prefix}: ${detail}`;
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
  if (promptData.responseModalities !== undefined && promptData.responseModalities.length > 0) {
    config.responseModalities = [...promptData.responseModalities];
  }
  if (promptData.speechVoiceName !== undefined && promptData.speechVoiceName !== '') {
    config.speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: promptData.speechVoiceName } } };
  }
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
  for (const audio of promptData.audio ?? []) {
    userParts.push({ inlineData: { data: audio.base64, mimeType: audio.mimeType } });
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
  readonly gateway?: CloudflareGatewayConfig | null | undefined;
}

/**
 * Builds SDK transport overrides routing one turn through Cloudflare AI Gateway.
 *
 * @param gateway - Resolved gateway routing; null or undefined keeps the direct Google host.
 * @returns `httpOptions` for the SDK client, or undefined when direct.
 */
export function buildGeminiHttpOptions(
  gateway: CloudflareGatewayConfig | null | undefined,
): { readonly baseUrl?: string; readonly headers?: Record<string, string> } | undefined {
  if (gateway === null || gateway === undefined) return undefined;
  return {
    baseUrl: buildCloudflareGatewayBaseUrl(gateway, CLOUDFLARE_GATEWAY_GOOGLE_PATH),
    headers: buildCloudflareGatewayHeaders(gateway),
  };
}

function createGeminiClient(plainKey: string, gateway: CloudflareGatewayConfig | null | undefined): GoogleGenAI {
  const httpOptions = buildGeminiHttpOptions(gateway);
  return new GoogleGenAI({ apiKey: plainKey, ...(httpOptions === undefined ? {} : { httpOptions }) });
}

function isStreamAborted(options: GeminiStreamOptions | undefined): boolean {
  return options?.signal?.aborted === true;
}

/**
 * Runs one streamed Gemini chat turn with an explicitly provided router key.
 *
 * @remarks Key format does not select an API version; see {@link executeGeminiAdapter}.
 * @param plainKey - Decrypted API key from the router database, never from environment.
 * @param modelName - Gemini model identifier owned by the router model config.
 * @param promptData - Prompt, history, and generation controls.
 * @param options - Abort signal plus an optional per-delta callback for SSE fan-out.
 * @returns Full model text, token usage when the provider reports it, and no tool calls.
 * @throws {Error} When the provider rejects the request or the signal aborts; the message
 * carries the upstream status and detail with the key redacted, never key material.
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
  if ((promptData.audio ?? []).length > 1) throw new Error('Gemini adapter supports at most 1 audio input per request.');
  const client = createGeminiClient(plainKey, options?.gateway);
  const contents = buildContents(promptData);
  let stream: AsyncIterable<unknown>;
  try {
    stream = (await client.models.generateContentStream({
      model: modelName,
      contents,
      config: buildConfig(promptData, modelName),
    })) as AsyncIterable<unknown>;
  } catch (error) {
    throw new Error(`Gemini stream request failed (${describeUpstreamError(error, plainKey)}).`);
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
    throw new Error(`Gemini stream interrupted (${describeUpstreamError(error, plainKey)}).`);
  }
  return {
    text: text === '' ? 'Informasi telah diproses oleh sistem.' : text,
    toolCallsExecuted: [],
    ...(tokensUsage === undefined ? {} : { tokensUsage }),
  };
}
/**
 * Collects binary parts (generated image/audio) from a generation response.
 *
 * @param response - SDK generation response with candidate parts.
 * @returns Inline payloads in response order; empty when text-only.
 */
function collectInlineData(response: {
  readonly candidates?: ReadonlyArray<{ readonly content?: { readonly parts?: ReadonlyArray<unknown> } | undefined }> | undefined;
}): Array<{ mimeType: string; base64: string }> {
  const out: Array<{ mimeType: string; base64: string }> = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part !== 'object' || part === null) continue;
      const inline = (part as { readonly inlineData?: unknown }).inlineData;
      if (typeof inline !== 'object' || inline === null) continue;
      const record = inline as Record<string, unknown>;
      if (typeof record.data === 'string' && record.data !== '' && typeof record.mimeType === 'string' && record.mimeType !== '') {
        out.push({ mimeType: record.mimeType, base64: record.data });
      }
    }
  }
  return out;
}

/**
 * Run one non-streaming generation against the Gemini API.
 *
 * @remarks Both Gemini API key formats are constructed identically, with no
 * `apiVersion` override. Google is migrating standard keys to authorization
 * keys, and the API key guide states that auth keys are "restricted to the
 * Generative Language API (Gemini API) by default" — the same host and path as
 * standard keys — while `generateContent` is documented only under `v1beta`,
 * which is also the SDK default. Forcing `v1alpha` for `AQ.` keys therefore
 * pointed at an undocumented path and failed every authorization key in the
 * pool. See https://ai.google.dev/gemini-api/docs/api-key and
 * https://ai.google.dev/api/generate-content.
 * @param plainKey - Decrypted Gemini API key, either standard or authorization format.
 * @param modelName - Gemini model identifier owned by the router model config.
 * @param promptData - Prompt, history, and generation controls.
 * @param toolExecutor - Optional executor for provider tool calls.
 * @param gateway - Optional Cloudflare AI Gateway routing for cache and spend observability.
 * @returns Model text, token usage, inline media, and the tool names executed.
 * @throws {Error} When the provider rejects the request; the message carries the
 * upstream status and detail with the key redacted, never key material.
 */
export async function executeGeminiAdapter(
  plainKey: string,
  modelName: string,
  promptData: AiChatPrompt,
  toolExecutor?: AiToolExecutor,
  gateway?: CloudflareGatewayConfig | null | undefined,
): Promise<AiAdapterResponse> {
  if (plainKey.length === 0) throw new Error('Gemini adapter requires a router-provided key.');
  const images = promptData.images ?? [];
  if (images.length > MAX_IMAGES) throw new Error('Gemini adapter supports at most 4 images per request.');
  if ((promptData.audio ?? []).length > 1) throw new Error('Gemini adapter supports at most 1 audio input per request.');
  const client = createGeminiClient(plainKey, gateway);
  const contents = buildContents(promptData);
  const executedTools: string[] = [];
  const toolResults: Record<string, unknown> = {};
  const useTools = promptData.enableTools === true;
  let response;
  try {
    response = await client.models.generateContent({ model: modelName, contents, config: buildConfig(promptData, modelName) });
  } catch (error) {
    throw new Error(`Gemini request failed (${describeUpstreamError(error, plainKey)}).`);
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
  const inlineData = collectInlineData(response);
  const tokensUsage =
    usage === undefined
      ? undefined
      : {
          prompt: usage.promptTokenCount ?? 0,
          completion: usage.candidatesTokenCount ?? 0,
          total: usage.totalTokenCount ?? 0,
        };
  if (tokensUsage === undefined) {
    return {
      text: response.text ?? 'Informasi telah diproses oleh sistem.',
      toolCallsExecuted: executedTools,
      toolResults,
      ...(inlineData.length === 0 ? {} : { inlineData }),
    };
  }
  return {
    text: response.text ?? 'Informasi telah diproses oleh sistem.',
    toolCallsExecuted: executedTools,
    toolResults,
    tokensUsage,
    ...(inlineData.length === 0 ? {} : { inlineData }),
  };
}
