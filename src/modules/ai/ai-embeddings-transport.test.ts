import { describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';

import { reindexArticleEmbeddings, embedArticleChunks, embedQueryVector, toSemanticCandidate } from '@/modules/ai/ai-embeddings';
import type { AiDb } from '@/modules/ai/ai-types';

const ORG = '11111111-1111-4111-8111-111111111111';
const ARTICLE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function chunksOf(query: SQL): readonly unknown[] {
  return (query as unknown as { readonly queryChunks: readonly unknown[] }).queryChunks ?? [];
}

function ctorName(chunk: object): string {
  return (chunk.constructor as { readonly name?: unknown } | undefined)?.name === undefined
    ? ''
    : String((chunk.constructor as { readonly name: unknown }).name);
}

function collectParams(query: SQL): unknown[] {
  const out: unknown[] = [];
  const visit = (chunks: readonly unknown[]): void => {
    for (const chunk of chunks) {
      if (typeof chunk === 'string' || typeof chunk === 'number' || typeof chunk === 'boolean' || typeof chunk === 'bigint') {
        out.push(chunk);
        continue;
      }
      if (typeof chunk !== 'object' || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (Array.isArray(record.queryChunks)) {
        visit(record.queryChunks as readonly unknown[]);
        continue;
      }
      if ('encoder' in record || ctorName(chunk) === 'Param') {
        out.push((record as { readonly value: unknown }).value);
      }
    }
  };
  visit(chunksOf(query));
  return out;
}

function collectFragments(query: SQL): string {
  const out: string[] = [];
  const visit = (chunks: readonly unknown[]): void => {
    for (const chunk of chunks) {
      if (typeof chunk !== 'object' || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (Array.isArray(record.queryChunks)) {
        visit(record.queryChunks as readonly unknown[]);
        continue;
      }
      if (ctorName(chunk) === 'StringChunk' && Array.isArray(record.value)) {
        out.push((record.value as readonly unknown[]).map((part) => String(part)).join(''));
      }
    }
  };
  visit(chunksOf(query));
  return out.join(' ').toLowerCase();
}

interface FakeDb extends AiDb {
  readonly vectors: string[];
}

function makeFakeDb(withCredential: boolean): FakeDb & { readonly execute: (query: SQL) => Promise<unknown> } {
  const vectors: string[] = [];
  return {
    vectors,
    execute: async (query: SQL): Promise<unknown> => {
      const text = collectFragments(query);
      if (text.includes('decrypt_ai_key')) return [{ plain: 'k-test' }];
      if (text.includes('ai_credentials')) {
        return withCredential
          ? [{ id: 'cred-1', provider_id: 'gemini', key_encrypted: 'enc', key_masked: 'ab••cd' }]
          : [];
      }
      if (text.includes('from articles')) {
        return [{ id: ARTICLE, title: 'Panen Raya', excerpt: 'Petani tersenyum.', body: 'Hujan turun merata.' }];
      }
      if (text.includes('delete from document_embeddings')) return [];
      if (text.includes('insert into document_embeddings')) {
        for (const param of collectParams(query)) {
          if (typeof param === 'string' && param.startsWith('[')) vectors.push(param);
        }
        return [];
      }
      return [];
    },
  };
}

function vectorFetch(): (input: string, init?: RequestInit) => Promise<Response> {
  return vi.fn(async () => new Response(JSON.stringify({ embedding: { values: [0.7, 0.7] } }), { status: 200 }));
}

describe('reindexArticleEmbeddings transport', () => {
  it('mengisi kolom embedding saat transport sehat', async () => {
    const db = makeFakeDb(true);
    const result = await reindexArticleEmbeddings(db, { organizationId: ORG, articleId: ARTICLE }, { fetchImpl: vectorFetch() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chunks).toBeGreaterThan(0);
    expect(result.embedded).toBe(result.chunks);
    expect(db.vectors).toHaveLength(result.chunks);
    for (const raw of db.vectors) {
      const parsed = JSON.parse(raw) as unknown;
      expect(Array.isArray(parsed)).toBe(true);
    }
  });

  it('tetap menulis chunk NULL dan lanjut saat transport gagal', async () => {
    const failing = vi.fn(async () => {
      throw new Error('putus');
    });
    const db = makeFakeDb(true);
    const result = await reindexArticleEmbeddings(db, { organizationId: ORG, articleId: ARTICLE }, { fetchImpl: failing });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.embedded).toBe(0);
    expect(db.vectors).toEqual([]);
  });

  it('tetap menulis chunk NULL dan lanjut saat kunci habis', async () => {
    const db = makeFakeDb(false);
    const result = await reindexArticleEmbeddings(db, { organizationId: ORG, articleId: ARTICLE }, { fetchImpl: vectorFetch() });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.embedded).toBe(0);
    expect(db.vectors).toEqual([]);
  });
});

describe('embedArticleChunks provider order', () => {
  const workersAi = { accountId: 'acct-1', apiToken: 'token-1' };
  const workersOk = (): ((input: string, init?: RequestInit) => Promise<Response>) =>
    vi.fn(async () => new Response(JSON.stringify({ success: true, result: { data: [[0.7, 0.7]] } }), { status: 200 }));
  const workersNull = (): ((input: string, init?: RequestInit) => Promise<Response>) =>
    vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 }));

  it('memakai Workers AI dulu saat sehat tanpa menyentuh Gemini', async () => {
    const db = makeFakeDb(true);
    const geminiFetch = vi.fn(async () => new Response(JSON.stringify({ embedding: { values: [0.1] } }), { status: 200 }));
    const resolved = await embedArticleChunks(['arsip panen'], db, ORG, {
      provider: 'auto',
      workersAi,
      workersAiFetchImpl: workersOk(),
      fetchImpl: geminiFetch,
    });
    expect(resolved.provider).toBe('workers-ai');
    expect(resolved.vectors).toEqual([[0.7, 0.7]]);
    expect(geminiFetch).not.toHaveBeenCalled();
  });

  it('jatuh ke Gemini saat Workers AI mengembalikan null semua', async () => {
    const db = makeFakeDb(true);
    const geminiFetch = vi.fn(async () => new Response(JSON.stringify({ embedding: { values: [0.2, 0.3] } }), { status: 200 }));
    const vector = await embedQueryVector(db, ORG, 'panen raya', {
      provider: 'auto',
      workersAi,
      workersAiFetchImpl: workersNull(),
      fetchImpl: geminiFetch,
    });
    expect(vector).toEqual([0.2, 0.3]);
    expect(geminiFetch).toHaveBeenCalledTimes(1);
  });

  it('provider gemini eksplisit tidak menyentuh Workers AI', async () => {
    const db = makeFakeDb(true);
    const workersFetch = vi.fn(async () => new Response(JSON.stringify({ success: true, result: { data: [[0.9]] } }), { status: 200 }));
    const geminiFetch = vi.fn(async () => new Response(JSON.stringify({ embedding: { values: [0.4] } }), { status: 200 }));
    const resolved = await embedArticleChunks(['panen'], db, ORG, {
      provider: 'gemini',
      workersAi,
      workersAiFetchImpl: workersFetch,
      fetchImpl: geminiFetch,
    });
    expect(resolved.provider).toBe('gemini');
    expect(workersFetch).not.toHaveBeenCalled();
  });
});

describe('toSemanticCandidate', () => {
  it('memetakan baris kandidat dan menolak baris tanpa id', () => {
    expect(toSemanticCandidate({ id: 'e1', article_id: 'a1', excerpt: 'cuplik', embedding: [1, 0] })).toMatchObject({ id: 'e1', articleId: 'a1' });
    expect(toSemanticCandidate({ article_id: 'a1' })).toBeNull();
    expect(toSemanticCandidate(null)).toBeNull();
  });
});
