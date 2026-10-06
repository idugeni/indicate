import 'server-only';

import type { AiAdapterResponse, AiChatPrompt, AiProviderAdapter } from '@/integrations/ai/ai-prompt';

const ERROR_BODY_LIMIT = 300;

/** Per-delta delivery controls for one streamed turn. */
export interface OpenAiCompatibleStreamOptions {
  readonly signal?: AbortSignal | undefined;
  readonly onChunk?: ((delta: string) => void) | undefined;
}

/**
 * Maps a thinking budget to an OpenAI reasoning effort level.
 *
 * @param budget - Thinking budget from the prompt; -1 or undefined means unset.
 * @returns Effort level, or undefined when reasoning must be omitted.
 */
function resolveReasoningEffort(budget: number | undefined): 'low' | 'medium' | 'high' | undefined {
  if (budget === undefined || budget === -1) return undefined;
  if (budget <= 8192) return 'low';
  if (budget <= 32768) return 'medium';
  return 'high';
}

/**
 * Maps one Gemini-style schema type to its JSON Schema lowercase form.
 *
 * @param value - Raw `type` value from a catalog schema.
 * @returns Lowercase JSON Schema type; unknown values pass through untouched.
 * @remarks Catalog schemas (`ai-response-schemas.ts`) speak Gemini (`STRING`,
 * `OBJECT`, `ARRAY`); OpenAI-compatible providers reject anything but
 * lowercase (`Invalid type: OBJECT` observed live on Nvidia, 2026-10-05).
 */
function toJsonSchemaType(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  switch (value) {
    case 'STRING':
      return 'string';
    case 'NUMBER':
      return 'number';
    case 'INTEGER':
      return 'integer';
    case 'BOOLEAN':
      return 'boolean';
    case 'ARRAY':
      return 'array';
    case 'OBJECT':
      return 'object';
    default:
      return value;
  }
}

/**
 * Converts a Gemini-style response schema to provider-neutral JSON Schema.
 *
 * @param schema - Catalog schema with possible uppercase type tokens.
 * @returns Deep copy with type tokens lowercased; structure, enums, and
 * required lists preserved.
 */
export function toOpenAiJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type') {
      out[key] = toJsonSchemaType(value);
    } else if (key === 'properties' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const props: Record<string, unknown> = {};
      for (const [propKey, propValue] of Object.entries(value as Record<string, unknown>)) {
        props[propKey] =
          typeof propValue === 'object' && propValue !== null && !Array.isArray(propValue)
            ? toOpenAiJsonSchema(propValue as Record<string, unknown>)
            : propValue;
      }
      out[key] = props;
    } else if (key === 'items' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out[key] = toOpenAiJsonSchema(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Builds the response format for structured output.
 *
 * @param promptData - Prompt carrying an optional schema and MIME type.
 * @returns JSON schema format when a non-empty object schema exists, JSON object
 * format for bare JSON MIME, otherwise undefined.
 */
function buildResponseFormat(promptData: AiChatPrompt): Record<string, unknown> | undefined {
  const schema = promptData.responseSchema;
  if (
    schema !== undefined &&
    typeof schema === 'object' &&
    schema !== null &&
    !Array.isArray(schema) &&
    Object.keys(schema).length > 0
  ) {
    return { type: 'json_schema', json_schema: { name: 'indicate', strict: true, schema: toOpenAiJsonSchema(schema as Record<string, unknown>) } };
  }
  if (promptData.responseMimeType === 'application/json') return { type: 'json_object' };
  return undefined;
}

/**
 * Builds chat message payloads shared by non-streaming and streaming calls.
 *
 * @param promptData - Prompt, history, and optional image parts.
 * @returns OpenAI chat message list with image parts preserved as image_url.
 */
function buildMessages(promptData: AiChatPrompt): Array<{ role: string; content: unknown }> {
  const messages: Array<{ role: string; content: unknown }> = [];
  if (promptData.systemInstruction !== undefined) {
    messages.push({ role: 'system', content: promptData.systemInstruction });
  }
  for (const message of (promptData.history ?? []).slice(-6)) {
    messages.push({ role: message.role === 'model' ? 'assistant' : message.role, content: message.text });
  }
  const images = promptData.images ?? [];
  if (images.length > 0) {
    const content: Array<Record<string, unknown>> = [{ type: 'text', text: promptData.prompt }];
    for (const image of images.slice(0, 4)) {
      content.push({ type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } });
    }
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: promptData.prompt });
  }
  return messages;
}

/** Provider routing preferences for OpenAI-compatible gateways. */
export interface OpenAiCompatibleRouting {
  readonly sort?: 'price' | 'throughput' | 'latency';
  readonly allowFallbacks?: boolean;
  readonly requireParameters?: boolean;
  readonly dataCollection?: 'allow' | 'deny';
}

/**
 * Builds the provider routing object for gateways that support it.
 *
 * @param routing - Static per-adapter routing preferences.
 * @param responseFormat - Structured-output format of this request, if any.
 * @param costMode - Cost preference; `price` pins the provider sort to cheapest.
 * @returns Provider object, or undefined when nothing is configured.
 * @remarks `require_parameters` defaults on for structured requests so JSON
 * traffic only reaches endpoints that support it; explicit false opts out.
 */
function buildProviderRouting(
  routing: OpenAiCompatibleRouting,
  responseFormat: Record<string, unknown> | undefined,
  costMode: 'throughput' | 'price' | undefined,
): Record<string, unknown> | undefined {
  const provider: Record<string, unknown> = {};
  const sort = costMode === 'price' && routing.sort !== undefined ? 'price' : routing.sort;
  if (sort !== undefined) provider.sort = sort;
  if (routing.allowFallbacks !== undefined) provider.allow_fallbacks = routing.allowFallbacks;
  if (routing.dataCollection !== undefined) provider.data_collection = routing.dataCollection;
  const requireParameters = routing.requireParameters ?? responseFormat !== undefined;
  if (requireParameters) provider.require_parameters = true;
  return Object.keys(provider).length === 0 ? undefined : provider;
}

/**
 * Builds the chat-completions request body.
 *
 * @param modelName - Model identifier owned by the router model config.
 * @param promptData - Prompt, history, and generation controls.
 * @param stream - Whether the provider should return server-sent events.
 * @param routing - Static per-adapter routing preferences.
 * @returns Serializable request body without key material.
 */
function buildRequestBody(
  modelName: string,
  promptData: AiChatPrompt,
  stream: boolean,
  routing: OpenAiCompatibleRouting = {},
): Record<string, unknown> {
  const effort = resolveReasoningEffort(promptData.thinkingConfig?.thinkingBudget);
  const responseFormat = buildResponseFormat(promptData);
  const provider = buildProviderRouting(routing, responseFormat, promptData.costMode);
  return {
    model: modelName,
    messages: buildMessages(promptData),
    temperature: promptData.temperature ?? 1.0,
    max_tokens: promptData.maxOutputTokens ?? 32768,
    top_p: promptData.topP,
    presence_penalty: promptData.presencePenalty,
    frequency_penalty: promptData.frequencyPenalty,
    seed: promptData.seed,
    ...(responseFormat === undefined ? {} : { response_format: responseFormat }),
    ...(effort === undefined ? {} : { reasoning: { effort } }),
    ...(promptData.thinkingConfig?.includeThoughts === true ? { include_reasoning: true } : {}),
    ...(provider === undefined ? {} : { provider }),
    ...(stream ? { stream: true } : {}),
  };
}

/**
 * Removes key material from an upstream detail string.
 *
 * @param detail - Raw provider detail with whitespace collapsed.
 * @param plainKey - Router key that must never appear in the message.
 * @returns Detail with key occurrences replaced.
 */
function redactKey(detail: string, plainKey: string): string {
  if (plainKey !== '' && detail.includes(plainKey)) return detail.split(plainKey).join('[redacted]');
  return detail;
}

/**
 * Reads up to 300 characters of error body as a single line.
 *
 * @param res - Non-ok provider response.
 * @param plainKey - Router key redacted from the detail.
 * @returns Collapsed detail without key material.
 */
async function readErrorDetail(res: Response, plainKey: string): Promise<string> {
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    raw = '';
  }
  return redactKey(raw.replace(/\s+/g, ' ').trim().slice(0, ERROR_BODY_LIMIT), plainKey);
}

/**
 * Formats the retry-after marker when the provider sent the header.
 *
 * @param res - Non-ok provider response.
 * @returns Marker suffix, or empty string when the header is absent.
 */
function retryAfterSuffix(res: Response): string {
  const value = res.headers.get('retry-after')?.trim();
  if (value === undefined || value === null || value === '') return '';
  return ` retry_after:${value}`;
}

/**
 * Builds a rejection error carrying status, capped body, and retry marker.
 *
 * @param kind - Request kind used as the message prefix.
 * @param res - Non-ok provider response.
 * @param plainKey - Router key excluded from the message.
 * @returns Error without key material.
 */
async function buildRejectionError(kind: 'request' | 'stream', res: Response, plainKey: string): Promise<Error> {
  const detail = await readErrorDetail(res, plainKey);
  const suffix = retryAfterSuffix(res);
  const base =
    kind === 'request' ? 'OpenAI-compatible request rejected' : 'OpenAI-compatible stream rejected';
  return new Error(
    detail === '' ? `${base} with status ${res.status}.${suffix}` : `${base} with status ${res.status}: ${detail}.${suffix}`,
  );
}

/**
 * Extracts one text delta from a streamed chat-completions chunk.
 *
 * @param chunk - Parsed SSE payload from the provider.
 * @returns Text delta, or empty string when the chunk carries none.
 */
function readStreamDelta(chunk: unknown): string {
  if (typeof chunk !== 'object' || chunk === null) return '';
  const choices = (chunk as { readonly choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (typeof first !== 'object' || first === null) return '';
  const record = first as { readonly delta?: unknown; readonly message?: unknown };
  for (const part of [record.delta, record.message]) {
    if (typeof part === 'object' && part !== null) {
      const content = (part as { readonly content?: unknown }).content;
      if (typeof content === 'string') return content;
    }
  }
  return '';
}

/**
 * Extracts token usage from a streamed chat-completions chunk.
 *
 * @param chunk - Parsed SSE payload from the provider.
 * @returns Token usage when present, otherwise undefined.
 */
function readChunkUsage(chunk: unknown): AiAdapterResponse['tokensUsage'] {
  if (typeof chunk !== 'object' || chunk === null) return undefined;
  const usage = (chunk as { readonly usage?: unknown }).usage;
  if (typeof usage !== 'object' || usage === null) return undefined;
  const record = usage as Record<string, unknown>;
  const prompt = typeof record.prompt_tokens === 'number' ? record.prompt_tokens : 0;
  const completion = typeof record.completion_tokens === 'number' ? record.completion_tokens : 0;
  const total = typeof record.total_tokens === 'number' ? record.total_tokens : 0;
  return { prompt, completion, total };
}

/**
 * Handles one parsed SSE payload for text and usage accumulation.
 *
 * @param payload - Raw text after the `data:` prefix.
 * @param state - Mutable text and usage accumulator.
 * @param onChunk - Optional per-delta callback.
 */
function handleSsePayload(
  payload: string,
  state: { text: string; tokensUsage: AiAdapterResponse['tokensUsage'] },
  onChunk: ((delta: string) => void) | undefined,
): void {
  if (payload === '' || payload === '[DONE]') return;
  let chunk: unknown;
  try {
    chunk = JSON.parse(payload) as unknown;
  } catch {
    return;
  }
  const delta = readStreamDelta(chunk);
  if (delta !== '') {
    state.text += delta;
    onChunk?.(delta);
  }
  const usage = readChunkUsage(chunk);
  if (usage !== undefined) state.tokensUsage = usage;
}

/**
 * Parses SSE `data:` lines from buffered stream text.
 *
 * @param buffer - Decoded stream text possibly holding several events.
 * @param state - Mutable text and usage accumulator.
 * @param onChunk - Optional per-delta callback.
 */
function parseSseBuffer(
  buffer: string,
  state: { text: string; tokensUsage: AiAdapterResponse['tokensUsage'] },
  onChunk: ((delta: string) => void) | undefined,
): void {
  for (const line of buffer.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    handleSsePayload(trimmed.slice(5).trim(), state, onChunk);
  }
}

/**
 * Reports whether one streamed turn was aborted.
 *
 * @param signal - Optional abort signal from the caller.
 * @returns True when the signal exists and fired.
 * @remarks Module scope keeps control-flow narrowing of one check from
 * leaking into later ones under exactOptionalPropertyTypes.
 */
function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

/**
 * Calls any OpenAI-compatible chat-completions endpoint with a router key.
 *
 * @remarks No key or URL is hardcoded; both arrive per call from the router database.
 */
export class OpenAiCompatibleAdapter implements AiProviderAdapter {
  readonly providerId: string;
  private readonly baseUrl: string;
  private readonly extraHeaders: Readonly<Record<string, string>>;
  private readonly routing: OpenAiCompatibleRouting;

  constructor(
    providerId = 'openai-compatible',
    baseUrl = 'https://api.openai.com/v1',
    extraHeaders: Readonly<Record<string, string>> = {},
    routing: OpenAiCompatibleRouting = {},
  ) {
    this.providerId = providerId;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.extraHeaders = extraHeaders;
    this.routing = routing;
  }

  /**
   * Sends chat messages to the configured base URL.
   *
   * @param plainKey - Decrypted API key from the router database, never from environment.
   * @param modelName - Model identifier owned by the router model config.
   * @param promptData - Prompt, history, and generation controls.
   * @returns Model text and token usage; tool calls are never executed by this stub.
   * @throws {Error} When the provider rejects the request; the message never carries key material.
   */
  async execute(plainKey: string, modelName: string, promptData: AiChatPrompt): Promise<AiAdapterResponse> {
    if (plainKey.length === 0) throw new Error('OpenAI-compatible adapter requires a router-provided key.');
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${plainKey}`, ...this.extraHeaders },
        body: JSON.stringify(buildRequestBody(modelName, promptData, false, this.routing)),
      });
    } catch {
      throw new Error('OpenAI-compatible request failed.');
    }
    if (!res.ok) throw await buildRejectionError('request', res, plainKey);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const usage = data.usage;
    if (usage === undefined) return { text: data.choices?.[0]?.message?.content ?? '', toolCallsExecuted: [] };
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      toolCallsExecuted: [],
      tokensUsage: {
        prompt: usage.prompt_tokens ?? 0,
        completion: usage.completion_tokens ?? 0,
        total: usage.total_tokens ?? 0,
      },
    };
  }

  /**
   * Streams chat deltas as server-sent events with an optional per-delta callback.
   *
   * @param plainKey - Decrypted API key from the router database, never from environment.
   * @param modelName - Model identifier owned by the router model config.
   * @param promptData - Prompt, history, and generation controls.
   * @param opts - Abort signal plus an optional per-delta callback.
   * @returns Full model text with usage from the final chunk when reported.
   * @throws {Error} When the stream aborts or the provider rejects; never carries key material.
   */
  async executeStream(
    plainKey: string,
    modelName: string,
    promptData: AiChatPrompt,
    opts?: OpenAiCompatibleStreamOptions,
  ): Promise<AiAdapterResponse> {
    if (plainKey.length === 0) throw new Error('OpenAI-compatible adapter requires a router-provided key.');
    if (isAborted(opts?.signal)) throw new Error('OpenAI-compatible stream aborted.');
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${plainKey}`, ...this.extraHeaders },
        body: JSON.stringify(buildRequestBody(modelName, promptData, true, this.routing)),
        ...(opts?.signal === undefined ? {} : { signal: opts.signal }),
      });
    } catch (error) {
      if (isAborted(opts?.signal) || (error instanceof Error && error.name === 'AbortError')) {
        throw new Error('OpenAI-compatible stream aborted.');
      }
      throw new Error('OpenAI-compatible stream request failed.');
    }
    if (!res.ok) throw await buildRejectionError('stream', res, plainKey);
    const state: { text: string; tokensUsage: AiAdapterResponse['tokensUsage'] } = { text: '', tokensUsage: undefined };
    const onChunk = opts?.onChunk;
    const signal = opts?.signal;
    if (res.body === null || res.body === undefined) {
      if (isAborted(signal)) throw new Error('OpenAI-compatible stream aborted.');
      parseSseBuffer(await res.text(), state, onChunk);
      return { text: state.text, toolCallsExecuted: [], ...(state.tokensUsage === undefined ? {} : { tokensUsage: state.tokensUsage }) };
    }
    const reader = res.body.getReader();
    const cancelOnAbort = (): void => {
      void reader.cancel();
    };
    signal?.addEventListener('abort', cancelOnAbort, { once: true });
    try {
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        if (isAborted(signal)) {
          await reader.cancel();
          throw new Error('OpenAI-compatible stream aborted.');
        }
        let read: ReadableStreamReadResult<Uint8Array>;
        try {
          read = await reader.read();
        } catch (error) {
          if (isAborted(signal) || (error instanceof Error && error.name === 'AbortError')) {
            throw new Error('OpenAI-compatible stream aborted.');
          }
          throw new Error('OpenAI-compatible stream interrupted.');
        }
        if (read.done) {
          parseSseBuffer(buffer + decoder.decode(), state, onChunk);
          break;
        }
        buffer += decoder.decode(read.value, { stream: true });
        const boundary = buffer.lastIndexOf('\n');
        if (boundary === -1) continue;
        parseSseBuffer(buffer.slice(0, boundary + 1), state, onChunk);
        buffer = buffer.slice(boundary + 1);
      }
    } finally {
      signal?.removeEventListener('abort', cancelOnAbort);
      reader.releaseLock();
    }
    return { text: state.text, toolCallsExecuted: [], ...(state.tokensUsage === undefined ? {} : { tokensUsage: state.tokensUsage }) };
  }
}
