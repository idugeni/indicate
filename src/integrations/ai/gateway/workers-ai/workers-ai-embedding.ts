import 'server-only';

import type { EmbedFetch } from '@/integrations/ai/embeddings';

/** Workers AI text-embedding model billed from the 10000 free Neurons/day allocation. */
export const WORKERS_AI_DEFAULT_EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';

/** Batch ceiling shared with the Gemini transport so one reindex stays bounded. */
export const WORKERS_AI_EMBED_MAX_BATCH = 20;

/** Per-text truncation shared with the Gemini transport. */
export const WORKERS_AI_EMBED_MAX_TEXT_CHARS = 8000;

/** Upper bound accepted from the provider; anything larger is treated as malformed. */
const WORKERS_AI_EMBED_MAX_DIMENSIONS = 4096;

/** Small backoff before the single retry on 429/5xx; keeps one reindex bounded. */
export const WORKERS_AI_EMBED_RETRY_DELAY_MS = 250;

/** Retryable transport statuses: rate-limited or server-side failures. */
export function isRetryableWorkersAiStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/** Credentials for the Workers AI REST transport; the key is never logged. */
export interface WorkersAiEmbeddingConfig {
  readonly accountId: string;
  readonly apiToken: string;
  readonly model?: string | undefined;
}

/** Transport overrides for one embedding batch. */
export interface WorkersAiEmbedOptions {
  readonly fetchImpl?: EmbedFetch | undefined;
  readonly signal?: AbortSignal | undefined;
  readonly retryDelayMs?: number | undefined;
}

function toFiniteVector(value: unknown): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0 || value.length > WORKERS_AI_EMBED_MAX_DIMENSIONS) return null;
  const out: number[] = [];
  for (const item of value) {
    const parsed = typeof item === 'string' ? Number(item) : typeof item === 'number' ? item : NaN;
    if (!Number.isFinite(parsed)) return null;
    out.push(parsed);
  }
  return out;
}

/**
 * Builds the Workers AI run URL for one embedding model.
 *
 * @param config - Account scope plus the model identifier.
 * @returns REST endpoint receiving `{ text: string[] }`.
 */
export function workersAiEmbeddingUrl(config: WorkersAiEmbeddingConfig): string {
  const model = (config.model ?? WORKERS_AI_DEFAULT_EMBEDDING_MODEL).replace(/^\/+/, '');
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${model}`;
}

function extractMatrix(body: unknown, expected: number): Array<readonly number[] | null> {
  const fallback = Array.from({ length: expected }, () => null);
  if (typeof body !== 'object' || body === null) return fallback;
  const result = (body as { readonly result?: unknown }).result;
  if (typeof result !== 'object' || result === null) return fallback;
  const data = (result as { readonly data?: unknown }).data;
  if (!Array.isArray(data)) return fallback;
  return Array.from({ length: expected }, (slot, index) => {
    void slot;
    return toFiniteVector(data[index] ?? null);
  });
}

/**
 * Embeds up to 20 texts through Workers AI in one REST call.
 *
 * @param config - Account id, API token, and optional model override.
 * @param texts - Input texts, each truncated server-side before transport.
 * @param options - Injectable fetch and abort signal.
 * @returns Vectors aligned with the input; a failed batch yields nulls so the
 * reindex caller can still store the chunks with NULL embeddings and report
 * them via `failedChunks` instead of failing silently. Only the
 * `ai-embeddings` module consumes this contract.
 * @throws {Error} When credentials are empty, no text is given, or the batch exceeds 20 texts.
 * @remarks A 429/5xx response is retried once after a small backoff; other
 * failures yield nulls immediately without throwing.
 */
export async function embedTextsViaWorkersAi(
  config: WorkersAiEmbeddingConfig,
  texts: readonly string[],
  options?: WorkersAiEmbedOptions | undefined,
): Promise<Array<readonly number[] | null>> {
  if (config.accountId === '' || config.apiToken === '') throw new Error('Workers AI transport requires account credentials.');
  if (texts.length === 0) throw new Error('Workers AI transport requires at least one text.');
  if (texts.length > WORKERS_AI_EMBED_MAX_BATCH) throw new Error('Workers AI transport supports at most 20 texts per batch.');
  if (options?.signal?.aborted === true) throw new Error('Workers AI transport aborted.');
  const payload = texts.map((raw) => raw.slice(0, WORKERS_AI_EMBED_MAX_TEXT_CHARS));
  if (payload.every((text) => text.trim() === '')) return texts.map(() => null);
  const fetchImpl = options?.fetchImpl ?? fetch;
  const delay = options?.retryDelayMs ?? WORKERS_AI_EMBED_RETRY_DELAY_MS;
  const request = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiToken}` },
    body: JSON.stringify({ text: payload }),
    ...(options?.signal === undefined ? {} : { signal: options.signal }),
  };
  const invalidDelay = !Number.isFinite(delay) || delay < 0;
  const backoffMs = invalidDelay ? WORKERS_AI_EMBED_RETRY_DELAY_MS : delay;
  try {
    const first = await fetchImpl(workersAiEmbeddingUrl(config), request);
    if (first.ok) {
      const body = (await first.json().catch(() => null)) as unknown;
      return extractMatrix(body, texts.length);
    }
    if (!isRetryableWorkersAiStatus(first.status)) return texts.map(() => null);
  } catch {
    return texts.map(() => null);
  }
  await new Promise((resolve) => {
    setTimeout(resolve, backoffMs);
  });
  try {
    const second = await fetchImpl(workersAiEmbeddingUrl(config), request);
    if (!second.ok) return texts.map(() => null);
    const body = (await second.json().catch(() => null)) as unknown;
    return extractMatrix(body, texts.length);
  } catch {
    return texts.map(() => null);
  }
}
