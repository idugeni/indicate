import 'server-only';

import { sql } from 'drizzle-orm';

import { embedTexts, type EmbedFetch } from '@/integrations/ai/embeddings';
import type { SemanticCandidate } from '@/integrations/ai/embeddings';
import {
  WORKERS_AI_DEFAULT_EMBEDDING_MODEL,
  embedTextsViaWorkersAi,
} from '@/integrations/ai/gateway/workers-ai/workers-ai-embedding';
import { resolveApiKey } from '@/modules/ai/ai-router';
import type { AiDb } from '@/modules/ai/ai-types';

/** Lebar maksimum satu chunk, sejajar dengan check `document_embeddings_chunk_nonempty`. */
export const EMBEDDING_CHUNK_CHARS = 2000;

/** Plafon chunk per aksi reindex; menjaga insert satu request tetap kecil. */
export const EMBEDDING_MAX_CHUNKS = 20;

/** Plafon kandidat vektor per pencarian arsip; cosine dihitung di JS. */
export const SEMANTIC_CANDIDATE_LIMIT = 100;

/** Opsi transport untuk satu aksi reindex. */
export interface ReindexEmbeddingsOptions {
  readonly fetchImpl?: EmbedFetch | undefined;
  readonly embedModel?: string | undefined;
  readonly provider?: EmbeddingProvider | undefined;
  readonly workersAiFetchImpl?: EmbedFetch | undefined;
  readonly workersAi?: WorkersAiCredentials | undefined;
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
 * Potong artikel menjadi chunk siap indeks, masing-masing ≤ 2000 karakter.
 *
 * @param input.title - Judul artikel, selalu menjadi awal chunk pertama.
 * @param input.excerpt - Ringkasan opsional di bawah judul.
 * @param input.body - Isi artikel; dipecah per paragraf lalu per kata.
 * @returns Maksimal 20 chunk; kosong bila tidak ada teks.
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
  return chunks.slice(0, EMBEDDING_MAX_CHUNKS);
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
 */
export async function embedArticleChunks(
  chunks: readonly string[],
  db: AiDb,
  organizationId: string,
  options?: ReindexEmbeddingsOptions | undefined,
): Promise<{ readonly vectors: Array<readonly number[] | null>; readonly provider: 'workers-ai' | 'gemini' | 'none' }> {
  const provider = options?.provider ?? 'auto';
  const empty = chunks.map(() => null);
  if (chunks.length === 0) return { vectors: [], provider: 'none' };
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
  });
  return vectors[0] ?? null;
}

/**
 * Indeks ulang satu artikel milik organisasi ke `document_embeddings`.
 *
 * @param db - Port database runtime.
 * @param input.organizationId - Organisasi pemilik; artikel organisasi lain tidak terbaca.
 * @param input.articleId - Artikel yang diindeks ulang.
 * @param options - Transport embedding yang dapat diinjeksi untuk pengujian.
 * @returns Jumlah chunk tertulis dan vektor terisi, atau kegagalan tanpa bocor lintas tenant.
 * @remarks Menghapus indeks lama artikel itu lalu menulis maksimal 20 chunk
 * dalam satu `INSERT`; kolom `embedding` diisi dari transport bila sehat,
 * atau `null` per chunk bila transport gagal, sehingga reindex tidak pernah
 * gagal hanya karena embedding dan pencarian arsip tetap memakai `chunk` ILIKE.
 */
export async function reindexArticleEmbeddings(
  db: AiDb,
  input: { readonly organizationId: string; readonly articleId: string },
  options?: ReindexEmbeddingsOptions | undefined,
): Promise<{ readonly ok: true; readonly chunks: number; readonly embedded: number; readonly embeddingProvider: 'workers-ai' | 'gemini' | 'none' } | { readonly ok: false; readonly error: string }> {
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
    await db.execute(
      sql`delete from document_embeddings where organization_id = ${input.organizationId}::uuid and article_id = ${input.articleId}::uuid`,
    );
    let vectors: Array<readonly number[] | null> = chunks.map(() => null);
    let embeddingProvider: 'workers-ai' | 'gemini' | 'none' = 'none';
    try {
      const resolved = await embedArticleChunks(chunks, db, input.organizationId, options);
      vectors = resolved.vectors;
      embeddingProvider = resolved.provider;
    } catch {
      vectors = chunks.map(() => null);
    }
    let embedded = 0;
    const values = chunks.map((chunk, index) => {
      const vector = vectors[index] ?? null;
      if (vector === null) return sql`(${input.organizationId}::uuid, ${input.articleId}::uuid, ${chunk}, null)`;
      embedded += 1;
      return sql`(${input.organizationId}::uuid, ${input.articleId}::uuid, ${chunk}, ${JSON.stringify([...vector])}::jsonb)`;
    });
    await db.execute(
      sql`insert into document_embeddings (organization_id, article_id, chunk, embedding) values ${sql.join(values, sql`, `)}`,
    );
    return { ok: true, chunks: chunks.length, embedded, embeddingProvider };
  } catch {
    return { ok: false, error: 'Indeks semantik belum tersedia; gunakan pencarian judul/slug.' };
  }
}
