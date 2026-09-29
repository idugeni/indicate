import 'server-only';

/** Default embedding model for archive semantic search. */
export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

/** Hard ceiling per embedding batch; the reindex path never exceeds it. */
export const EMBED_MAX_BATCH = 20;

/** Per-text truncation before transport; keeps one request bounded. */
export const EMBED_MAX_TEXT_CHARS = 8000;

/** Upper bound accepted from the provider; anything larger is treated as malformed. */
const EMBED_MAX_DIMENSIONS = 4096;

/** Relevance floor for vector hits; below it the route falls back to ILIKE. */
export const SEMANTIC_SCORE_THRESHOLD = 0.35;

/** Maximum vector hits returned to one archive search. */
export const SEMANTIC_TOP_K = 20;

/** Fetch boundary for the embedding transport; injectable so tests never touch the network. */
export type EmbedFetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Optional transport overrides for one embedding batch. */
export interface EmbedTextsOptions {
  readonly fetchImpl?: EmbedFetch | undefined;
  readonly model?: string | undefined;
  readonly signal?: AbortSignal | undefined;
}

/** One archive candidate scored against a query vector. */
export interface SemanticCandidate {
  readonly id: string;
  readonly articleId: string | null;
  readonly excerpt: string;
  readonly embedding: unknown;
}

/** One vector hit above the relevance threshold. */
export interface SemanticHit {
  readonly id: string;
  readonly articleId: string | null;
  readonly excerpt: string;
  readonly score: number;
}

/** Ranking controls for vector search. */
export interface RankSemanticOptions {
  readonly threshold?: number | undefined;
  readonly topK?: number | undefined;
}

function toFiniteVector(value: unknown): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0 || value.length > EMBED_MAX_DIMENSIONS) return null;
  const out: number[] = [];
  for (const item of value) {
    const parsed = typeof item === 'string' ? Number(item) : typeof item === 'number' ? item : NaN;
    if (!Number.isFinite(parsed)) return null;
    out.push(parsed);
  }
  return out;
}

/**
 * Measures angular closeness between two embedding vectors.
 *
 * @param left - First vector.
 * @param right - Second vector; extra dimensions beyond the shorter side are ignored.
 * @returns Cosine in [-1, 1]; 0 when either side is empty or has zero norm.
 */
export function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;
  let dot = 0;
  let normLeft = 0;
  let normRight = 0;
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    normLeft += a * a;
    normRight += b * b;
  }
  if (normLeft === 0 || normRight === 0) return 0;
  return dot / (Math.sqrt(normLeft) * Math.sqrt(normRight));
}

/**
 * Ranks archive candidates against a query vector above a relevance floor.
 *
 * @param query - Query embedding from the transport.
 * @param candidates - Bounded candidate rows with raw jsonb embeddings.
 * @param options - Relevance threshold and hit ceiling.
 * @returns Hits ordered by descending score, at most `topK` entries.
 */
export function rankSemanticCandidates(
  query: readonly number[],
  candidates: readonly SemanticCandidate[],
  options?: RankSemanticOptions | undefined,
): SemanticHit[] {
  const threshold = options?.threshold ?? SEMANTIC_SCORE_THRESHOLD;
  const topK = Math.min(Math.max(options?.topK ?? SEMANTIC_TOP_K, 1), 100);
  const hits: SemanticHit[] = [];
  for (const candidate of candidates) {
    const vector = toFiniteVector(candidate.embedding);
    if (vector === null) continue;
    const score = cosineSimilarity(query, vector);
    if (score >= threshold) hits.push({ id: candidate.id, articleId: candidate.articleId, excerpt: candidate.excerpt, score });
  }
  hits.sort((left, right) => right.score - left.score);
  return hits.slice(0, topK);
}

function endpointFor(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
}

function extractVector(body: unknown): readonly number[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const embedding = (body as { readonly embedding?: unknown }).embedding;
  if (typeof embedding !== 'object' || embedding === null) return null;
  return toFiniteVector((embedding as { readonly values?: unknown }).values);
}

/**
 * Embeds up to 20 texts through the Gemini embedding transport.
 *
 * @param plainKey - Decrypted router key; never logged or returned.
 * @param texts - Input texts, each truncated server-side before transport.
 * @param options - Injectable fetch, model override, and abort signal.
 * @returns Vectors aligned with the input; a failed text yields null so callers can store NULL and continue.
 * @throws {Error} When the key is empty, no text is given, or the batch exceeds 20 texts.
 */
export async function embedTexts(
  plainKey: string,
  texts: readonly string[],
  options?: EmbedTextsOptions | undefined,
): Promise<Array<readonly number[] | null>> {
  if (plainKey.length === 0) throw new Error('Embedding transport requires a router-provided key.');
  if (texts.length === 0) throw new Error('Embedding transport requires at least one text.');
  if (texts.length > EMBED_MAX_BATCH) throw new Error('Embedding transport supports at most 20 texts per batch.');
  if (options?.signal?.aborted === true) throw new Error('Embedding transport aborted.');
  const fetchImpl = options?.fetchImpl ?? fetch;
  const model = options?.model ?? GEMINI_EMBEDDING_MODEL;
  const endpoint = endpointFor(model);
  const out: Array<readonly number[] | null> = [];
  for (const raw of texts) {
    const text = raw.slice(0, EMBED_MAX_TEXT_CHARS);
    if (text.trim() === '') {
      out.push(null);
      continue;
    }
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': plainKey },
        body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
        ...(options?.signal === undefined ? {} : { signal: options.signal }),
      });
      if (!response.ok) {
        out.push(null);
        continue;
      }
      const body = (await response.json().catch(() => null)) as unknown;
      out.push(extractVector(body));
    } catch {
      out.push(null);
    }
  }
  return out;
}
