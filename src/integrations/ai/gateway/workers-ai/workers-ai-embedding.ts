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
  return Array.from({ length: expected }, (_, index) => toFiniteVector(data[index] ?? null));
}

/**
 * Embeds up to 20 texts through Workers AI in one REST call.
 *
 * @param config - Account id, API token, and optional model override.
 * @param texts - Input texts, each truncated server-side before transport.
 * @param options - Injectable fetch and abort signal.
 * @returns Vectors aligned with the input; a failed batch yields nulls so callers can store NULL and continue.
 * @throws {Error} When credentials are empty, no text is given, or the batch exceeds 20 texts.
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
  try {
    const response = await fetchImpl(workersAiEmbeddingUrl(config), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiToken}` },
      body: JSON.stringify({ text: payload }),
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
    if (!response.ok) return texts.map(() => null);
    const body = (await response.json().catch(() => null)) as unknown;
    return extractMatrix(body, texts.length);
  } catch {
    return texts.map(() => null);
  }
}
