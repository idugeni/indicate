import 'server-only';

import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';

import { embedTexts, GEMINI_EMBEDDING_MODEL, type EmbedFetch } from '@/integrations/ai/embeddings';
import type { SemanticCandidate } from '@/integrations/ai/embeddings';
import {
  WORKERS_AI_DEFAULT_EMBEDDING_MODEL,
  embedTextsViaWorkersAi,
} from '@/integrations/ai/gateway/workers-ai/workers-ai-embedding';
import {
  AI_EMBED_GUARD_PROVIDER,
  AI_EMBED_OPERATION,
  AI_EMBED_OPERATION_QUERY,
  AI_EMBED_OPERATION_REINDEX,
  checkEmbeddingTransport,
  checkOperationBudgetQuota,
  estimateEmbeddingTokens,
  logOperationResult,
  recordEmbeddingOperation,
  recordEmbeddingTransportOutcome,
  type AiOperationControls,
} from '@/modules/ai/ai-operation-guards';
import { resolveApiKey } from '@/modules/ai/ai-router';
import type { AiDb, AiThinkingConfig } from '@/modules/ai/ai-types';

/** Lebar maksimum satu chunk, sejajar dengan check `document_embeddings_chunk_nonempty`. */
export const EMBEDDING_CHUNK_CHARS = 2000;

/** Plafon chunk per aksi reindex; menjaga insert satu request tetap kecil. */
export const EMBEDDING_MAX_CHUNKS = 20;

/** Plafon kandidat vektor per pencarian arsip; cosine dihitung di JS. */
export const SEMANTIC_CANDIDATE_LIMIT = 100;

/**
 * Jenis tugas AI yang dipetakan ke profil model hemat.
 *
 * @remarks Kunci `ringkas` adalah alias tugas `summarize` di control plane.
 */
export type AiTaskKind = 'caption' | 'seo' | 'polish' | 'ringkas' | 'sampul' | 'chat' | 'embed';

/**
 * Profil model hemat per tugas: tier murah, suhu yang disarankan, dan anggaran thinking.
 *
 * @remarks `thinkingBudget` yang `undefined` berarti memakai default kanal adapter;
 * `provider` hanya diisi tugas embed sebagai urutan provider default.
 */
export interface TaskModelProfile {
  readonly modelTier: 'murah';
  readonly temperature: number;
  readonly thinkingBudget?: number | undefined;
  readonly provider?: EmbeddingProvider | undefined;
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
  embed: { modelTier: 'murah', temperature: 0, provider: 'auto' },
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

/** Opsi transport untuk satu aksi reindex. */
export interface ReindexEmbeddingsOptions {
  readonly fetchImpl?: EmbedFetch | undefined;
  readonly embedModel?: string | undefined;
  readonly provider?: EmbeddingProvider | undefined;
  readonly workersAiFetchImpl?: EmbedFetch | undefined;
  readonly workersAi?: WorkersAiCredentials | undefined;
  /**
   * Shared budget/quota/rate-limit/breaker/logging boundary; absent keeps the
   * legacy unguarded behavior (fail-open) for offline callers and unit tests.
   */
  readonly controls?: AiOperationControls | undefined;
  /** Metrics/audit operation label; defaults per caller (`ai.embed.reindex` here). */
  readonly operation?: string | undefined;
  /** Audit correlation id; generated per call when absent. */
  readonly correlationId?: string | undefined;
}

/** Urutan provider embedding; `auto` memakai Workers AI dulu lalu Gemini. */
export type EmbeddingProvider = 'gemini' | 'workers-ai' | 'auto';

/** Kredensial Workers AI dari runtime config; kunci tak pernah dicatat. */
export interface WorkersAiCredentials {
  readonly accountId: string;
  readonly apiToken: string;
  readonly model?: string | undefined;
}

/** Konfigurasi embedding untuk satu kueri arsip. */
export interface QueryEmbeddingConfig {
  readonly provider?: EmbeddingProvider | undefined;
  readonly fetchImpl?: EmbedFetch | undefined;
  readonly workersAiFetchImpl?: EmbedFetch | undefined;
  readonly workersAi?: WorkersAiCredentials | undefined;
  /**
   * Shared budget/quota/rate-limit/breaker/logging boundary; absent keeps the
   * legacy unguarded behavior (fail-open) for offline callers and unit tests.
   */
  readonly controls?: AiOperationControls | undefined;
  /** Metrics/audit operation label; defaults to `ai.embed.query`. */
  readonly operation?: string | undefined;
  /** Audit correlation id; generated per call when absent. */
  readonly correlationId?: string | undefined;
}

function toRowArray(value: unknown): readonly unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'object' && value !== null) {
    const rows = (value as { readonly rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows;
  }
  return [];
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Builds the continuation marker appended to the last kept chunk.
 *
 * @param kept - Chunks stored by this reindex.
 * @param total - Chunks the article actually produced.
 * @returns Marker such as `[bersambung… bagian 20/35]`.
 */
export function continuationMarker(kept: number, total: number): string {
  return `[bersambung… bagian ${kept}/${total}]`;
}

/**
 * Potong artikel menjadi chunk siap indeks, masing-masing ≤ 2000 karakter.
 *
 * @param input.title - Judul artikel, selalu menjadi awal chunk pertama.
 * @param input.excerpt - Ringkasan opsional di bawah judul.
 * @param input.body - Isi artikel; dipecah per paragraf lalu per kata.
 * @returns Maksimal 20 chunk; kosong bila tidak ada teks.
 * @remarks Bila artikel menghasilkan lebih dari 20 chunk, 20 chunk pertama
 * disimpan dan chunk terakhir diberi penanda `continuationMarker` agar
 * pemotongan terlihat pembaca, bukan hilang diam-diam.
 */
export function splitArticleChunks(input: {
  readonly title: string;
  readonly excerpt?: string | undefined;
  readonly body?: string | undefined;
}): string[] {
  const head = [input.title.trim(), (input.excerpt ?? '').trim()].filter((part) => part !== '').join('\n\n');
  const paragraphs = `${head}${head === '' ? '' : '\n\n'}${(input.body ?? '').replace(/\r\n?/gu, '\n')}`
    .split('\n')
    .map((part) => part.trim().replace(/\s+/gu, ' '))
    .filter((part) => part !== '');
  const chunks: string[] = [];
  let current = '';
  const flush = (): void => {
    if (current !== '') chunks.push(current);
    current = '';
  };
  for (const paragraph of paragraphs) {
    if (paragraph.length > EMBEDDING_CHUNK_CHARS) {
      flush();
      for (const word of paragraph.split(' ')) {
        if (word === '') continue;
        if ((current === '' ? 0 : current.length + 1) + word.length > EMBEDDING_CHUNK_CHARS) flush();
        current = current === '' ? word : `${current} ${word}`;
        if (current.length >= EMBEDDING_CHUNK_CHARS) flush();
      }
      flush();
      continue;
    }
    if (current !== '' && current.length + 2 + paragraph.length > EMBEDDING_CHUNK_CHARS) flush();
    current = current === '' ? paragraph : `${current}\n\n${paragraph}`;
  }
  flush();
  if (chunks.length <= EMBEDDING_MAX_CHUNKS) return chunks;
  const kept = chunks.slice(0, EMBEDDING_MAX_CHUNKS);
  const marker = `\n\n${continuationMarker(EMBEDDING_MAX_CHUNKS, chunks.length)}`;
  const last = kept[EMBEDDING_MAX_CHUNKS - 1] ?? '';
  const room = EMBEDDING_CHUNK_CHARS - marker.length;
  kept[EMBEDDING_MAX_CHUNKS - 1] = `${last.slice(0, Math.max(0, room)).trimEnd()}${marker}`;
  return kept;
}

/**
 * Memetakan satu baris kandidat arsip ke kandidat vektor.
 *
 * @param row - Baris mentah `document_embeddings` dengan proyeksi id, article_id, excerpt, dan embedding.
 * @returns Kandidat vektor, atau null bila id hilang.
 */
export function toSemanticCandidate(row: unknown): SemanticCandidate | null {
  if (typeof row !== 'object' || row === null) return null;
  const record = row as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  if (id === null) return null;
  const articleId = typeof record.article_id === 'string' ? record.article_id : null;
  const excerpt = typeof record.excerpt === 'string' ? record.excerpt : '';
  return { id, articleId, excerpt, embedding: record.embedding ?? null };
}

/**
 * Embeds one batch, preferring Workers AI before the Gemini transport.
 *
 * @param chunks - Truncated article chunks, at most 20 entries.
 * @param db - Runtime database port for Gemini key resolution.
 * @param organizationId - Tenant scope for the Gemini credential lookup.
 * @param options - Provider order plus injectable transports for tests.
 * @returns Vectors aligned with the input plus the provider that filled them.
 * @remarks When `options.controls` is present, one budget-plus-quota
 * pre-flight runs first (fail-open), then each attempted transport passes a
 * per-model rate-limit plus breaker gate. Guards add Redis/DB calls only —
 * never extra provider calls. Exactly one audit row and at least one metrics
 * sample describe the outcome; vectors and raw texts are never logged.
 */
export async function embedArticleChunks(
  chunks: readonly string[],
  db: AiDb,
  organizationId: string,
  options?: ReindexEmbeddingsOptions | undefined,
): Promise<{ readonly vectors: Array<readonly number[] | null>; readonly provider: 'workers-ai' | 'gemini' | 'none' }> {
  const provider = options?.provider ?? TASK_MODEL_PROFILE.embed.provider ?? 'auto';
  const empty = chunks.map(() => null);
  if (chunks.length === 0) return { vectors: [], provider: 'none' };
  const controls = options?.controls;
  if (controls === undefined) return embedArticleChunksUnguarded(chunks, db, organizationId, options, provider, empty);
  const operation = options?.operation ?? AI_EMBED_OPERATION;
  const correlationId = options?.correlationId ?? `emb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedMs = Date.now();
  const estimatedTokens = estimateEmbeddingTokens(chunks);
  const budgetQuota = await checkOperationBudgetQuota(controls, { organizationId, estimatedTokens });
  if (!budgetQuota.allowed) {
    await logOperationResult(controls, {
      correlationId,
      channel: 'embed',
      providerId: AI_EMBED_GUARD_PROVIDER,
      modelName: AI_EMBED_GUARD_PROVIDER,
      credentialId: null,
      organizationId,
      status: 'blocked',
      retryCount: 0,
      latencyMs: Date.now() - startedMs,
      promptTokens: estimatedTokens,
      completionTokens: 0,
      totalTokens: estimatedTokens,
      errorClass: budgetQuota.errorClass,
      errorMessage: budgetQuota.message,
    });
    recordEmbeddingOperation({
      operation,
      provider: AI_EMBED_GUARD_PROVIDER,
      model: AI_EMBED_GUARD_PROVIDER,
      organizationId,
      durationMs: Date.now() - startedMs,
      status: 429,
      tokens: estimatedTokens,
    });
    return { vectors: [...empty], provider: 'none' };
  }
  const workersModel = options?.workersAi?.model ?? WORKERS_AI_DEFAULT_EMBEDDING_MODEL;
  const geminiModel = options?.embedModel ?? GEMINI_EMBEDDING_MODEL;
  const attemptStartedMs = Date.now();
  if ((provider === 'workers-ai' || provider === 'auto') && options?.workersAi !== undefined) {
    const gate = await checkEmbeddingTransport(controls, {
      providerId: 'workers-ai',
      modelName: workersModel,
      estimatedTokens,
    });
    if (!gate.allowed) {
      recordEmbeddingOperation({
        operation,
        provider: 'workers-ai',
        model: workersModel,
        organizationId,
        durationMs: Date.now() - attemptStartedMs,
        status: 429,
        tokens: estimatedTokens,
      });
      if (provider === 'workers-ai') {
        await logOperationResult(controls, {
          correlationId,
          channel: 'embed',
          providerId: 'workers-ai',
          modelName: workersModel,
          credentialId: null,
          organizationId,
          status: 'blocked',
          retryCount: 0,
          latencyMs: Date.now() - startedMs,
          promptTokens: estimatedTokens,
          completionTokens: 0,
          totalTokens: estimatedTokens,
          errorClass: gate.errorClass,
          errorMessage: gate.message,
        });
        return { vectors: [...empty], provider: 'workers-ai' };
      }
    } else {
      try {
        const vectors = await embedTextsViaWorkersAi(
          {
            accountId: options.workersAi.accountId,
            apiToken: options.workersAi.apiToken,
            model: options.workersAi.model ?? WORKERS_AI_DEFAULT_EMBEDDING_MODEL,
          },
          chunks,
          { ...(options.workersAiFetchImpl === undefined ? {} : { fetchImpl: options.workersAiFetchImpl }) },
        );
        const served = vectors.some((vector) => vector !== null);
        await recordEmbeddingTransportOutcome(controls, {
          providerId: 'workers-ai',
          modelName: workersModel,
          succeeded: served,
        });
        recordEmbeddingOperation({
          operation,
          provider: 'workers-ai',
          model: workersModel,
          organizationId,
          durationMs: Date.now() - attemptStartedMs,
          status: 200,
          tokens: estimatedTokens,
        });
        if (served) {
          await logOperationResult(controls, {
            correlationId,
            channel: 'embed',
            providerId: 'workers-ai',
            modelName: workersModel,
            credentialId: null,
            organizationId,
            status: 'success',
            retryCount: 0,
            latencyMs: Date.now() - startedMs,
            promptTokens: estimatedTokens,
            completionTokens: 0,
            totalTokens: estimatedTokens,
          });
          return { vectors, provider: 'workers-ai' };
        }
        if (provider === 'workers-ai') {
          await logOperationResult(controls, {
            correlationId,
            channel: 'embed',
            providerId: 'workers-ai',
            modelName: workersModel,
            credentialId: null,
            organizationId,
            status: 'success',
            retryCount: 0,
            latencyMs: Date.now() - startedMs,
            promptTokens: estimatedTokens,
            completionTokens: 0,
            totalTokens: estimatedTokens,
          });
          return { vectors, provider: 'workers-ai' };
        }
      } catch {
        await recordEmbeddingTransportOutcome(controls, {
          providerId: 'workers-ai',
          modelName: workersModel,
          succeeded: false,
        });
        recordEmbeddingOperation({
          operation,
          provider: 'workers-ai',
          model: workersModel,
          organizationId,
          durationMs: Date.now() - attemptStartedMs,
          status: 500,
          tokens: estimatedTokens,
        });
        if (provider === 'workers-ai') {
          await logOperationResult(controls, {
            correlationId,
            channel: 'embed',
            providerId: 'workers-ai',
            modelName: workersModel,
            credentialId: null,
            organizationId,
            status: 'failed',
            retryCount: 0,
            latencyMs: Date.now() - startedMs,
            promptTokens: estimatedTokens,
            completionTokens: 0,
            totalTokens: estimatedTokens,
            errorClass: 'transport_error',
            errorMessage: 'Workers AI embedding transport failed.',
          });
          return { vectors: [...empty], provider: 'workers-ai' };
        }
      }
    }
  }
  if (provider === 'workers-ai') return { vectors: [...empty], provider: 'workers-ai' };
  const geminiGate = await checkEmbeddingTransport(controls, {
    providerId: 'gemini',
    modelName: geminiModel,
    estimatedTokens,
  });
  if (!geminiGate.allowed) {
    recordEmbeddingOperation({
      operation,
      provider: 'gemini',
      model: geminiModel,
      organizationId,
      durationMs: Date.now() - attemptStartedMs,
      status: 429,
      tokens: estimatedTokens,
    });
    await logOperationResult(controls, {
      correlationId,
      channel: 'embed',
      providerId: 'gemini',
      modelName: geminiModel,
      credentialId: null,
      organizationId,
      status: 'blocked',
      retryCount: 0,
      latencyMs: Date.now() - startedMs,
      promptTokens: estimatedTokens,
      completionTokens: 0,
      totalTokens: estimatedTokens,
      errorClass: geminiGate.errorClass,
      errorMessage: geminiGate.message,
    });
    return { vectors: [...empty], provider: 'none' };
  }
  const geminiStartedMs = Date.now();
  try {
    const plainKey = await resolveApiKey(db, 'gemini', { organizationId });
    if (plainKey === null) {
      recordEmbeddingOperation({
        operation,
        provider: 'gemini',
        model: geminiModel,
        organizationId,
        durationMs: Date.now() - geminiStartedMs,
        status: 500,
        tokens: estimatedTokens,
      });
      await logOperationResult(controls, {
        correlationId,
        channel: 'embed',
        providerId: 'gemini',
        modelName: geminiModel,
        credentialId: null,
        organizationId,
        status: 'failed',
        retryCount: 0,
        latencyMs: Date.now() - startedMs,
        promptTokens: estimatedTokens,
        completionTokens: 0,
        totalTokens: estimatedTokens,
        errorClass: 'missing_credential',
        errorMessage: 'No active Gemini credential for this organization.',
      });
      return { vectors: [...empty], provider: 'none' };
    }
    const vectors = await embedTexts(plainKey, chunks, {
      ...(options?.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
      ...(options?.embedModel === undefined ? {} : { model: options.embedModel }),
    });
    const served = vectors.some((vector) => vector !== null);
    await recordEmbeddingTransportOutcome(controls, {
      providerId: 'gemini',
      modelName: geminiModel,
      succeeded: served,
    });
    recordEmbeddingOperation({
      operation,
      provider: 'gemini',
      model: geminiModel,
      organizationId,
      durationMs: Date.now() - geminiStartedMs,
      status: 200,
      tokens: estimatedTokens,
    });
    await logOperationResult(controls, {
      correlationId,
      channel: 'embed',
      providerId: 'gemini',
      modelName: geminiModel,
      credentialId: null,
      organizationId,
      status: 'success',
      retryCount: 0,
      latencyMs: Date.now() - startedMs,
      promptTokens: estimatedTokens,
      completionTokens: 0,
      totalTokens: estimatedTokens,
    });
    return { vectors, provider: served ? 'gemini' : 'none' };
  } catch {
    await recordEmbeddingTransportOutcome(controls, {
      providerId: 'gemini',
      modelName: geminiModel,
      succeeded: false,
    });
    recordEmbeddingOperation({
      operation,
      provider: 'gemini',
      model: geminiModel,
      organizationId,
      durationMs: Date.now() - geminiStartedMs,
      status: 500,
      tokens: estimatedTokens,
    });
    await logOperationResult(controls, {
      correlationId,
      channel: 'embed',
      providerId: 'gemini',
      modelName: geminiModel,
      credentialId: null,
      organizationId,
      status: 'failed',
      retryCount: 0,
      latencyMs: Date.now() - startedMs,
      promptTokens: estimatedTokens,
      completionTokens: 0,
      totalTokens: estimatedTokens,
      errorClass: 'transport_error',
      errorMessage: 'Gemini embedding transport failed.',
    });
    return { vectors: [...empty], provider: 'none' };
  }
}

/**
 * Legacy unguarded embedding path, preserved byte-for-byte for callers without
 * controls (offline callers and unit tests).
 */
async function embedArticleChunksUnguarded(
  chunks: readonly string[],
  db: AiDb,
  organizationId: string,
  options: ReindexEmbeddingsOptions | undefined,
  provider: EmbeddingProvider,
  empty: Array<null>,
): Promise<{ readonly vectors: Array<readonly number[] | null>; readonly provider: 'workers-ai' | 'gemini' | 'none' }> {
  if ((provider === 'workers-ai' || provider === 'auto') && options?.workersAi !== undefined) {
    try {
      const vectors = await embedTextsViaWorkersAi(
        {
          accountId: options.workersAi.accountId,
          apiToken: options.workersAi.apiToken,
          model: options.workersAi.model ?? WORKERS_AI_DEFAULT_EMBEDDING_MODEL,
        },
        chunks,
        { ...(options.workersAiFetchImpl === undefined ? {} : { fetchImpl: options.workersAiFetchImpl }) },
      );
      if (vectors.some((vector) => vector !== null)) return { vectors, provider: 'workers-ai' };
      if (provider === 'workers-ai') return { vectors, provider: 'workers-ai' };
    } catch {
      if (provider === 'workers-ai') return { vectors: [...empty], provider: 'workers-ai' };
    }
  }
  if (provider === 'workers-ai') return { vectors: [...empty], provider: 'workers-ai' };
  try {
    const plainKey = await resolveApiKey(db, 'gemini', { organizationId });
    if (plainKey === null) return { vectors: [...empty], provider: 'none' };
    const vectors = await embedTexts(plainKey, chunks, {
      ...(options?.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
      ...(options?.embedModel === undefined ? {} : { model: options.embedModel }),
    });
    return { vectors, provider: vectors.some((vector) => vector !== null) ? 'gemini' : 'none' };
  } catch {
    return { vectors: [...empty], provider: 'none' };
  }
}

/**
 * Embeds one archive query, preferring Workers AI before the Gemini transport.
 *
 * @param db - Runtime database port for Gemini key resolution.
 * @param organizationId - Tenant scope for the Gemini credential lookup.
 * @param query - Raw archive query text.
 * @param config - Provider order plus injectable transports for tests.
 * @returns Query vector, or null when no provider could embed it.
 */
export async function embedQueryVector(
  db: AiDb,
  organizationId: string,
  query: string,
  config?: QueryEmbeddingConfig | undefined,
): Promise<readonly number[] | null> {
  const { vectors } = await embedArticleChunks([query], db, organizationId, {
    ...(config?.provider === undefined ? {} : { provider: config.provider }),
    ...(config?.fetchImpl === undefined ? {} : { fetchImpl: config.fetchImpl }),
    ...(config?.workersAiFetchImpl === undefined ? {} : { workersAiFetchImpl: config.workersAiFetchImpl }),
    ...(config?.workersAi === undefined ? {} : { workersAi: config.workersAi }),
    ...(config?.controls === undefined ? {} : { controls: config.controls }),
    operation: config?.operation ?? AI_EMBED_OPERATION_QUERY,
    ...(config?.correlationId === undefined ? {} : { correlationId: config.correlationId }),
  });
  return vectors[0] ?? null;
}

/**
 * Successful reindex summary with explicit per-chunk failure indexes.
 */
export interface ReindexEmbeddingsSuccess {
  readonly ok: true;
  readonly chunks: number;
  readonly embedded: number;
  readonly failedChunks: readonly number[];
  readonly embeddingProvider: 'workers-ai' | 'gemini' | 'none';
}

/**
 * Reindexes one tenant-owned article into `document_embeddings`.
 *
 * Crash-safe without assuming multi-statement transactions (raw `AiDb`
 * execute on a pooler): new chunks are inserted first with client-generated
 * ids, then stale rows for the same article that are missing from the new
 * batch are deleted, scoped to `organization_id` + `article_id`. A crash
 * between the two statements leaves duplicates (cleaned by the next
 * reindex) instead of an empty index. At most 20 chunks are stored; a
 * truncated article marks its last chunk via `continuationMarker`.
 *
 * @param db - Runtime database port.
 * @param input.organizationId - Owning org; other orgs' articles are invisible.
 * @param input.articleId - Article to reindex.
 * @param options - Injectable embedding transports for tests.
 * @returns Chunk/vector counts plus failed chunk indexes, or a tenant-safe failure.
 */
export async function reindexArticleEmbeddings(
  db: AiDb,
  input: { readonly organizationId: string; readonly articleId: string },
  options?: ReindexEmbeddingsOptions | undefined,
): Promise<ReindexEmbeddingsSuccess | { readonly ok: false; readonly error: string }> {
  try {
    const value = await db.execute(
      sql`select id, title, excerpt, body from articles where organization_id = ${input.organizationId}::uuid and id = ${input.articleId}::uuid limit 1`,
    );
    const row = toRowArray(value)[0] as Record<string, unknown> | undefined;
    if (row === undefined || typeof row !== 'object' || row === null) {
      return { ok: false, error: 'Artikel tidak ditemukan di organisasi ini.' };
    }
    const chunks = splitArticleChunks({
      title: toText(row.title),
      excerpt: toText(row.excerpt),
      body: toText(row.body),
    });
    if (chunks.length === 0) return { ok: false, error: 'Artikel kosong; tidak ada yang diindeks.' };
    let vectors: Array<readonly number[] | null> = chunks.map(() => null);
    let embeddingProvider: 'workers-ai' | 'gemini' | 'none' = 'none';
    try {
      const resolved = await embedArticleChunks(chunks, db, input.organizationId, {
        ...options,
        operation: options?.operation ?? AI_EMBED_OPERATION_REINDEX,
      });
      vectors = resolved.vectors;
      embeddingProvider = resolved.provider;
    } catch {
      vectors = chunks.map(() => null);
    }
    const ids = chunks.map(() => randomUUID());
    let embedded = 0;
    const failedChunks: number[] = [];
    const values = chunks.map((chunk, index) => {
      const vector = vectors[index] ?? null;
      if (vector === null) {
        failedChunks.push(index);
        return sql`(${ids[index]}::uuid, ${input.organizationId}::uuid, ${input.articleId}::uuid, ${chunk}, null)`;
      }
      embedded += 1;
      return sql`(${ids[index]}::uuid, ${input.organizationId}::uuid, ${input.articleId}::uuid, ${chunk}, ${JSON.stringify([...vector])}::jsonb)`;
    });
    await db.execute(
      sql`insert into document_embeddings (id, organization_id, article_id, chunk, embedding) values ${sql.join(values, sql`, `)}`,
    );
    await db.execute(
      sql`delete from document_embeddings where organization_id = ${input.organizationId}::uuid and article_id = ${input.articleId}::uuid and id not in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})`,
    );
    return { ok: true, chunks: chunks.length, embedded, failedChunks, embeddingProvider };
  } catch {
    return { ok: false, error: 'Indeks semantik belum tersedia; gunakan pencarian judul/slug.' };
  }
}
