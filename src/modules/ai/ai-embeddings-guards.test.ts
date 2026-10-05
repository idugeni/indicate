import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';

import { embedArticleChunks } from '@/modules/ai/ai-embeddings';
import type { AiOperationControls, AiOperationLogEntry } from '@/modules/ai/ai-operation-guards';
import { recordModelInfraFailure } from '@/modules/ai/ai-router';
import type { AiDb } from '@/modules/ai/ai-types';
import type { AiRateLimitStore } from '@/modules/ai/ai-rate-limit';

const ORG = '11111111-1111-4111-8111-111111111111';

function queryChunksOf(query: SQL): readonly unknown[] {
  return (query as unknown as { readonly queryChunks?: readonly unknown[] }).queryChunks ?? [];
}

function sqlText(query: SQL): string {
  const out: string[] = [];
  const visit = (items: readonly unknown[]): void => {
    for (const chunk of items) {
      if (typeof chunk === 'string') {
        out.push(chunk);
        continue;
      }
      if (typeof chunk !== 'object' || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (Array.isArray(record.queryChunks)) {
        visit(record.queryChunks as readonly unknown[]);
        continue;
      }
      const name = (chunk.constructor as { readonly name?: unknown } | undefined)?.name;
      if (name === 'StringChunk' && Array.isArray(record.value)) {
        out.push((record.value as readonly unknown[]).map((part) => String(part)).join(''));
      }
    }
  };
  visit(queryChunksOf(query));
  return out.join(' ').toLowerCase();
}

interface FakeStore extends AiRateLimitStore {
  readonly counts: Map<string, number | string>;
}

function makeStore(): FakeStore {
  const counts = new Map<string, number | string>();
  return {
    counts,
    namespace: 'test',
    get: async (key: string) => counts.get(key) ?? null,
    incrby: async (key: string, delta: number) => {
      const next = Number(counts.get(key) ?? 0) + delta;
      counts.set(key, next);
      return next;
    },
    expire: async () => {},
    set: async (key: string, value: string) => {
      counts.set(key, value);
    },
  };
}

const allowBudget = {
  checkAiBudgetSafeguard: async () => ({ allowed: true, remainingBudget: 1000 }),
  recordAiTokenUsage: async () => {},
};

const denyBudget = {
  checkAiBudgetSafeguard: async () => ({ allowed: false, remainingBudget: 0 }),
  recordAiTokenUsage: async () => {},
};

interface FakeDb extends AiDb {
  readonly queries: SQL[];
}

function makeDb(options?: {
  readonly withCredential?: boolean | undefined;
  readonly quotaRow?: Record<string, unknown> | null | undefined;
  readonly limitsRow?: Record<string, unknown> | null | undefined;
}): FakeDb & { readonly execute: (query: SQL) => Promise<unknown> } {
  const queries: SQL[] = [];
  const withCredential = options?.withCredential ?? true;
  return {
    queries,
    execute: async (query: SQL): Promise<unknown> => {
      queries.push(query);
      const text = sqlText(query);
      if (text.includes('decrypt_ai_key')) return [{ plain: 'k-test' }];
      if (text.includes('from ai_credentials')) {
        return withCredential
          ? [{
            id: 'cred-1',
            provider_id: 'gemini',
            organization_id: null,
            label: 't',
            key_encrypted: 'enc',
            key_masked: 'ab••cd',
            status: 'active',
            priority: 1,
            weight: 100,
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            rate_limit_count: 0,
            quota_exhausted_count: 0,
            avg_latency_ms: 0,
          }]
          : [];
      }
      if (text.includes('from organizations')) {
        return options?.quotaRow === undefined || options.quotaRow === null ? [] : [options.quotaRow];
      }
      if (text.includes('from ai_models')) {
        return options?.limitsRow === undefined || options.limitsRow === null ? [] : [options.limitsRow];
      }
      return [];
    },
  };
}

function controlsFor(
  db: FakeDb,
  logged: AiOperationLogEntry[],
  overrides?: { readonly budget?: AiOperationControls['budget'] | undefined },
): AiOperationControls {
  return {
    db,
    budget: overrides?.budget ?? allowBudget,
    store: makeStore(),
    log: async (row: AiOperationLogEntry) => {
      logged.push(row);
    },
    clock: () => new Date('2026-10-05T10:00:00.000Z'),
  };
}

function vectorFetch(): (input: string, init?: RequestInit) => Promise<Response> {
  return vi.fn(async () => new Response(JSON.stringify({ embedding: { values: [0.7, 0.7] } }), { status: 200 }));
}

function workersVectorFetch(): (input: string, init?: RequestInit) => Promise<Response> {
  return vi.fn(async () => new Response(JSON.stringify({ result: { data: [[0.7, 0.7]] } }), { status: 200 }));
}

function nullFetch(): (input: string, init?: RequestInit) => Promise<Response> {
  return vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
}

describe('embedArticleChunks dengan controls', () => {
  let logged: AiOperationLogEntry[];

  beforeEach(() => {
    logged = [];
  });

  it('memblokir sebelum provider saat budget habis tanpa panggilan jaringan', async () => {
    const db = makeDb();
    const fetchImpl = vectorFetch();
    const controls = controlsFor(db, logged, { budget: denyBudget });
    const result = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'gemini',
      fetchImpl,
      controls,
      operation: 'ai.embed.query',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.provider).toBe('none');
    expect(result.vectors).toEqual([null]);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      channel: 'embed',
      providerId: 'embed-guardrail',
      status: 'blocked',
      organizationId: ORG,
      errorClass: 'quota_exhausted',
    });
    expect(logged[0]?.totalTokens).toBeGreaterThan(0);
  });

  it('mencatat atribusi provider, model, tenant, dan token saat Workers AI melayani', async () => {
    const db = makeDb();
    const geminiFetch = vectorFetch();
    const workersFetch = workersVectorFetch();
    const controls = controlsFor(db, logged);
    const result = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'auto',
      fetchImpl: geminiFetch,
      workersAiFetchImpl: workersFetch,
      workersAi: { accountId: 'acct', apiToken: 'tok' },
      controls,
      operation: 'ai.embed.query',
    });
    expect(result.provider).toBe('workers-ai');
    expect(workersFetch).toHaveBeenCalledTimes(1);
    expect(geminiFetch).not.toHaveBeenCalled();
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({
      channel: 'embed',
      providerId: 'workers-ai',
      modelName: '@cf/baai/bge-base-en-v1.5',
      status: 'success',
      organizationId: ORG,
    });
  });

  it('jatuh ke Gemini saat Workers AI mengembalikan null semua', async () => {
    const db = makeDb();
    const geminiFetch = vectorFetch();
    const controls = controlsFor(db, logged);
    const result = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'auto',
      fetchImpl: geminiFetch,
      workersAiFetchImpl: nullFetch(),
      workersAi: { accountId: 'acct', apiToken: 'tok' },
      controls,
      operation: 'ai.embed.query',
    });
    expect(result.provider).toBe('gemini');
    expect(geminiFetch).toHaveBeenCalledTimes(1);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ providerId: 'gemini', modelName: 'gemini-embedding-2', status: 'success' });
  });

  it('melewati Gemini yang ter-breaker dan mencatat blokir tanpa fetch', async () => {
    const db = makeDb();
    const fetchImpl = vectorFetch();
    const store = makeStore();
    for (let index = 0; index < 5; index += 1) {
      await recordModelInfraFailure(store, 'gemini', 'gemini-embedding-2');
    }
    const controls: AiOperationControls = {
      db,
      budget: allowBudget,
      store,
      log: async (row) => {
        logged.push(row);
      },
    };
    const result = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'gemini',
      fetchImpl,
      controls,
      operation: 'ai.embed.query',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.provider).toBe('none');
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ status: 'blocked', errorClass: 'breaker_open' });
  });

  it('memblokir RPM model tanpa panggilan provider kedua', async () => {
    const db = makeDb({ limitsRow: { rpm_limit: 1, tpm_limit: null } });
    const fetchImpl = vectorFetch();
    const controls = controlsFor(db, logged);
    const first = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'gemini',
      fetchImpl,
      controls,
      operation: 'ai.embed.query',
    });
    expect(first.provider).toBe('gemini');
    const callsAfterFirst = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls.length;
    const second = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'gemini',
      fetchImpl,
      controls,
      operation: 'ai.embed.query',
    });
    expect(second.provider).toBe('none');
    expect((fetchImpl as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callsAfterFirst);
    expect(logged[logged.length - 1]).toMatchObject({ status: 'blocked', errorClass: 'rpm_exceeded' });
  });

  it('mencatat kredensial hilang sebagai failed tanpa fetch', async () => {
    const db = makeDb({ withCredential: false });
    const fetchImpl = vectorFetch();
    const controls = controlsFor(db, logged);
    const result = await embedArticleChunks(['arsip berita'], db, ORG, {
      provider: 'gemini',
      fetchImpl,
      controls,
      operation: 'ai.embed.query',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.provider).toBe('none');
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ status: 'failed', errorClass: 'missing_credential' });
  });
});
