import { describe, expect, it } from 'vitest';
import type { SQL } from 'drizzle-orm';

import {
  createAiSemanticCache,
  hashSemanticPrompt,
  SEMANTIC_CACHE_MAX_RESPONSE_CHARS,
} from '@/modules/ai/ai-semantic-cache';
import type { AiDb } from '@/modules/ai/ai-types';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const MODEL = 'gemini-2.5-flash';

interface StoredRow {
  readonly id: string;
  readonly org: string | null;
  readonly model: string;
  readonly hash: string;
  readonly text: string;
  hits: number;
  readonly expiresAt: string;
}

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

function makeFakeDb(seed: StoredRow[] = []): AiDb & { readonly rows: StoredRow[]; readonly seen: string[] } {
  const rows = [...seed];
  const seen: string[] = [];
  return {
    rows,
    seen,
    execute: async (query: SQL): Promise<unknown> => {
      const text = collectFragments(query);
      const params = collectParams(query);
      seen.push(text);
      if (text.includes('update ai_semantic_cache')) {
        const id = params.find((param) => typeof param === 'string');
        const row = rows.find((candidate) => candidate.id === id);
        if (row !== undefined) row.hits += 1;
        return [];
      }
      if (text.includes('insert into ai_semantic_cache')) {
        const strings = params.filter((param): param is string => typeof param === 'string');
        const hash = strings.find((param) => /^[0-9a-f]{64}$/.test(param)) ?? '';
        const model = strings.find((param) => param === MODEL) ?? MODEL;
        const org = strings.find((param) => param === ORG_A || param === ORG_B) ?? null;
        const expires = strings.find((param) => /^\d{4}-\d{2}-\d{2}T/.test(param)) ?? new Date().toISOString();
        const textParam = strings
          .filter((param) => param !== hash && param !== model && param !== org && param !== expires)
          .at(-1) ?? '';
        const key = `${org ?? 'global'}|${model}|${hash}`;
        const existing = rows.findIndex((candidate) => `${candidate.org ?? 'global'}|${candidate.model}|${candidate.hash}` === key);
        const row: StoredRow = {
          id: existing >= 0 ? (rows[existing] as StoredRow).id : `row-${rows.length + 1}`,
          org,
          model,
          hash,
          text: textParam,
          hits: 0,
          expiresAt: expires,
        };
        if (existing >= 0) rows[existing] = row;
        else rows.push(row);
        return [];
      }
      if (text.includes('from ai_semantic_cache')) {
        const strings = params.filter((param): param is string => typeof param === 'string');
        const hash = strings.find((param) => /^[0-9a-f]{64}$/.test(param)) ?? '';
        const requestOrg = strings.find((param) => param === ORG_A || param === ORG_B) ?? null;
        const now = strings.find((param) => /^\d{4}-\d{2}-\d{2}T/.test(param)) ?? new Date().toISOString();
        const match = rows.find(
          (candidate) =>
            candidate.hash === hash &&
            candidate.model === MODEL &&
            (candidate.org === null || candidate.org === requestOrg) &&
            candidate.expiresAt > now,
        );
        if (match === undefined) return [];
        return [{ id: match.id, response_text: match.text, model_name: match.model }];
      }
      return [];
    },
  };
}

describe('hashSemanticPrompt', () => {
  it('stabil untuk input sama dan berbentuk hex 64 karakter', () => {
    const first = hashSemanticPrompt('  Apa kabar?\nHari ini ', MODEL);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSemanticPrompt('Apa kabar? Hari ini', MODEL)).toBe(first);
  });

  it('peka terhadap prompt dan model berbeda', () => {
    const base = hashSemanticPrompt('berita banjir', MODEL);
    expect(hashSemanticPrompt('berita longsor', MODEL)).not.toBe(base);
    expect(hashSemanticPrompt('berita banjir', 'gemini-2.5-pro')).not.toBe(base);
    expect(hashSemanticPrompt('berita banjir', ' GEMINI-2.5-FLASH ')).toBe(base);
  });
});

describe('createAiSemanticCache', () => {
  it('miss saat kosong, hit setelah store, dan hits bertambah', async () => {
    const db = makeFakeDb();
    const cache = createAiSemanticCache(db, { organizationId: ORG_A });
    expect(await cache.lookup('berita banjir wonosobo', MODEL)).toBeNull();
    await cache.store('berita banjir wonosobo', 'Ringkasan: air surut.', MODEL, 3600);
    const hit = await cache.lookup('berita banjir wonosobo', MODEL);
    expect(hit?.responseText).toBe('Ringkasan: air surut.');
    expect(hit?.modelName).toBe(MODEL);
    await cache.lookup('berita banjir wonosobo', MODEL);
    expect(db.rows[0]?.hits).toBe(2);
  });

  it('setiap baca terproyeksi dan berbatas limit 1', async () => {
    const db = makeFakeDb();
    const cache = createAiSemanticCache(db, { organizationId: ORG_A });
    await cache.lookup('berita apa saja hari ini', MODEL);
    expect(db.seen.length).toBeGreaterThan(0);
    for (const text of db.seen) {
      expect(text).toContain('limit 1');
      expect(text).not.toContain('*');
    }
  });

  it('melewatkan entri kedaluwarsa', async () => {
    const db = makeFakeDb([
      {
        id: 'expired-1',
        org: ORG_A,
        model: MODEL,
        hash: hashSemanticPrompt('arsip lama sekali', MODEL),
        text: 'basi',
        hits: 0,
        expiresAt: '2020-01-01T00:00:00.000Z',
      },
    ]);
    const cache = createAiSemanticCache(db, {
      organizationId: ORG_A,
      clock: () => new Date('2026-09-30T00:00:00.000Z'),
    });
    expect(await cache.lookup('arsip lama sekali', MODEL)).toBeNull();
  });

  it('tidak bocor lintas organisasi, tapi berbagi entri global', async () => {
    const prompt = 'jadwal sidang paripurna';
    const db = makeFakeDb([
      {
        id: 'tenant-row',
        org: ORG_A,
        model: MODEL,
        hash: hashSemanticPrompt(prompt, MODEL),
        text: 'milik A',
        hits: 0,
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
      {
        id: 'global-row',
        org: null,
        model: MODEL,
        hash: hashSemanticPrompt('pengumuman libur nasional', MODEL),
        text: 'milik bersama',
        hits: 0,
        expiresAt: '2030-01-01T00:00:00.000Z',
      },
    ]);
    const cacheB = createAiSemanticCache(db, { organizationId: ORG_B });
    expect(await cacheB.lookup(prompt, MODEL)).toBeNull();
    expect((await cacheB.lookup('pengumuman libur nasional', MODEL))?.responseText).toBe('milik bersama');
    const cacheA = createAiSemanticCache(db, { organizationId: ORG_A });
    expect((await cacheA.lookup(prompt, MODEL))?.responseText).toBe('milik A');
  });

  it('memangkas respons ke batas simpan dan menelan kegagalan db', async () => {
    const db = makeFakeDb();
    const cache = createAiSemanticCache(db, { organizationId: ORG_A });
    await cache.store('prompt valid untuk uji', 'x'.repeat(SEMANTIC_CACHE_MAX_RESPONSE_CHARS + 500), MODEL, 60);
    expect(db.rows[0]?.text.length).toBe(SEMANTIC_CACHE_MAX_RESPONSE_CHARS);
    const broken: AiDb = { execute: async () => { throw new Error('down'); } };
    const fragile = createAiSemanticCache(broken, { organizationId: ORG_A });
    await expect(fragile.store('apapun', 'jawaban cukup panjang untuk disimpan', MODEL, 60)).resolves.toBeUndefined();
    await expect(fragile.lookup('apapun', MODEL)).resolves.toBeNull();
  });
});
