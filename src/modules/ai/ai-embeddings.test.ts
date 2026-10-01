import { describe, expect, it } from 'vitest';
import type { SQL } from 'drizzle-orm';

import {
  EMBEDDING_CHUNK_CHARS,
  EMBEDDING_MAX_CHUNKS,
  reindexArticleEmbeddings,
  splitArticleChunks,
  TASK_MODEL_PROFILE,
  taskThinkingOverride,
} from '@/modules/ai/ai-embeddings';
import type { AiDb } from '@/modules/ai/ai-types';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
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
      if (ctorName(chunk) === 'StringChunk') continue;
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

interface ArticleSeed {
  readonly org: string;
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly body: string;
}

function makeFakeDb(article: ArticleSeed | null): AiDb & { readonly seen: string[]; readonly inserted: string[] } {
  const seen: string[] = [];
  const inserted: string[] = [];
  return {
    seen,
    inserted,
    execute: async (query: SQL): Promise<unknown> => {
      const text = collectFragments(query);
      const params = collectParams(query);
      seen.push(text);
      if (text.includes('from articles')) {
        const strings = params.filter((param): param is string => typeof param === 'string');
        if (article !== null && strings.includes(article.org) && strings.includes(article.id)) {
          return [{ id: article.id, title: article.title, excerpt: article.excerpt, body: article.body }];
        }
        return [];
      }
      if (text.includes('delete from document_embeddings')) return [];
      if (text.includes('insert into document_embeddings')) {
        for (const param of params) {
          if (typeof param === 'string' && param !== ORG_A && param !== ORG_B && param !== ARTICLE) inserted.push(param);
        }
        return [];
      }
      return [];
    },
  };
}

describe('splitArticleChunks', () => {
  it('satu chunk untuk artikel pendek', () => {
    expect(splitArticleChunks({ title: 'Banjir Surut', body: 'Air mulai surut.' })).toHaveLength(1);
  });

  it('kosong bila tanpa teks', () => {
    expect(splitArticleChunks({ title: '   ', body: '' })).toEqual([]);
  });

  it('dibatasi 20 chunk @ ≤2000 karakter untuk bodi sangat panjang', () => {
    const chunks = splitArticleChunks({ title: 'Laporan Tahunan', body: 'kata '.repeat(12000) });
    expect(chunks.length).toBeLessThanOrEqual(EMBEDDING_MAX_CHUNKS);
    expect(chunks.length).toBe(EMBEDDING_MAX_CHUNKS);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(EMBEDDING_CHUNK_CHARS);
  });
});

describe('reindexArticleEmbeddings', () => {
  it('menulis chunk terbatas dan membaca artikel scope org + limit 1', async () => {
    const db = makeFakeDb({
      org: ORG_A,
      id: ARTICLE,
      title: 'Panen Raya',
      excerpt: 'Petani tersenyum.',
      body: 'paragraf '.repeat(3000),
    });
    const result = await reindexArticleEmbeddings(db, { organizationId: ORG_A, articleId: ARTICLE });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.chunks).toBeLessThanOrEqual(EMBEDDING_MAX_CHUNKS);
    expect(db.inserted.length).toBeGreaterThan(0);
    expect(db.inserted.length).toBeLessThanOrEqual(EMBEDDING_MAX_CHUNKS);
    for (const chunk of db.inserted) expect(chunk.length).toBeLessThanOrEqual(EMBEDDING_CHUNK_CHARS);
    const articleRead = db.seen.find((text) => text.includes('from articles')) ?? '';
    expect(articleRead).toContain('organization_id');
    expect(articleRead).toContain('limit 1');
  });

  it('menolak artikel milik organisasi lain', async () => {
    const db = makeFakeDb({ org: ORG_A, id: ARTICLE, title: 'Rahasia A', excerpt: '', body: 'isi' });
    const result = await reindexArticleEmbeddings(db, { organizationId: ORG_B, articleId: ARTICLE });
    expect(result.ok).toBe(false);
    expect(db.inserted).toEqual([]);
  });

  it('menolak artikel hilang dan artikel kosong', async () => {
    const missing = makeFakeDb(null);
    expect((await reindexArticleEmbeddings(missing, { organizationId: ORG_A, articleId: ARTICLE })).ok).toBe(false);
    const empty = makeFakeDb({ org: ORG_A, id: ARTICLE, title: '  ', excerpt: '', body: '' });
    expect((await reindexArticleEmbeddings(empty, { organizationId: ORG_A, articleId: ARTICLE })).ok).toBe(false);
  });
});

describe('TASK_MODEL_PROFILE dan taskThinkingOverride embed', () => {
  it('memetakan tujuh tugas ke tier murah dengan provider embed auto', () => {
    expect(Object.keys(TASK_MODEL_PROFILE).sort()).toEqual(['caption', 'chat', 'embed', 'polish', 'ringkas', 'sampul', 'seo']);
    expect(TASK_MODEL_PROFILE.embed).toMatchObject({ modelTier: 'murah', provider: 'auto' });
  });

  it('mengembalikan undefined untuk embed dan menghormati override pemanggil', () => {
    expect(taskThinkingOverride('embed')).toBeUndefined();
    expect(taskThinkingOverride('ringkas')).toEqual({ thinkingBudget: 8192, includeThoughts: true });
    expect(taskThinkingOverride('embed', { thinkingBudget: 1024 })).toEqual({ thinkingBudget: 1024 });
  });
});
