import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SQL } from 'drizzle-orm';

import {
  AI_EMBED_GUARD_PROVIDER,
  checkEmbeddingTransport,
  checkOperationBudgetQuota,
  estimateEmbeddingTokens,
  logOperationResult,
  recordEmbeddingOperation,
  recordEmbeddingTransportOutcome,
  type AiOperationControls,
  type AiOperationLogEntry,
} from '@/modules/ai/ai-operation-guards';
import type { AiDb } from '@/modules/ai/ai-types';
import type { AiRateLimitStore } from '@/modules/ai/ai-rate-limit';

const recorded: unknown[] = [];

vi.mock('@/core/observability/operation-metrics', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    recordOperation: (sample: unknown) => {
      recorded.push(sample);
    },
  };
});

const ORG = '11111111-1111-4111-8111-111111111111';
const FIXED_NOW = new Date('2026-10-05T10:00:00.000Z');

function ctorName(chunk: object): string {
  const name = (chunk.constructor as { readonly name?: unknown } | undefined)?.name;
  return typeof name === 'string' ? name : '';
}

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
      if (ctorName(chunk) === 'StringChunk' && Array.isArray(record.value)) {
        out.push((record.value as readonly unknown[]).map((part) => String(part)).join(''));
      }
    }
  };
  visit(queryChunksOf(query));
  return out.join(' ').toLowerCase();
}

function sqlParams(query: SQL): unknown[] {
  const out: unknown[] = [];
  const visit = (items: readonly unknown[]): void => {
    for (const item of items) {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean' || typeof item === 'bigint') {
        out.push(item);
        continue;
      }
      if (typeof item !== 'object' || item === null) continue;
      const record = item as Record<string, unknown>;
      if (Array.isArray(record.queryChunks)) {
        visit(record.queryChunks as readonly unknown[]);
        continue;
      }
      if ('value' in record && ctorName(item) === 'Param') {
        out.push(record.value);
      }
    }
  };
  visit(queryChunksOf(query));
  return out;
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

const throwBudget = {
  checkAiBudgetSafeguard: async (): Promise<{ allowed: boolean; remainingBudget: number }> => {
    throw new Error('redis down');
  },
  recordAiTokenUsage: async () => {},
};

interface FakeDb extends AiDb {
  readonly queries: SQL[];
  readonly quotaRow: Record<string, unknown> | null;
  readonly limitsRow: Record<string, unknown> | null;
}

function makeDb(options?: {
  readonly quotaRow?: Record<string, unknown> | null | undefined;
  readonly limitsRow?: Record<string, unknown> | null | undefined;
}): FakeDb & { readonly execute: (query: SQL) => Promise<unknown> } {
  const queries: SQL[] = [];
  const quotaRow = options?.quotaRow === undefined ? null : (options.quotaRow ?? null);
  const limitsRow = options?.limitsRow === undefined ? null : (options.limitsRow ?? null);
  return {
    queries,
    quotaRow,
    limitsRow,
    execute: async (query: SQL): Promise<unknown> => {
      queries.push(query);
      const text = sqlText(query);
      if (text.includes('from organizations')) return quotaRow === null ? [] : [quotaRow];
      if (text.includes('from ai_models')) return limitsRow === null ? [] : [limitsRow];
      if (text.includes('insert into ai_request_logs')) return [];
      return [];
    },
  };
}

function controlsFor(db: FakeDb, overrides?: Partial<AiOperationControls>): AiOperationControls {
  return {
    db,
    budget: allowBudget,
    store: makeStore(),
    log: undefined,
    clock: () => FIXED_NOW,
    ...overrides,
  };
}

describe('estimateEmbeddingTokens', () => {
  it('menjumlahkan heuristik chars/4 per teks', () => {
    expect(estimateEmbeddingTokens(['abcd', 'abcdefgh'])).toBe(3);
    expect(estimateEmbeddingTokens([])).toBe(0);
    expect(estimateEmbeddingTokens([''])).toBe(1);
  });
});

describe('checkOperationBudgetQuota', () => {
  it('mengizinkan saat budget longgar dan tanpa batas org', async () => {
    const db = makeDb();
    const verdict = await checkOperationBudgetQuota(controlsFor(db), { organizationId: ORG, estimatedTokens: 10 });
    expect(verdict).toEqual({ allowed: true });
    expect(db.queries.some((query) => sqlText(query).includes('insert'))).toBe(false);
  });

  it('melewati quota org saat organizationId null tanpa membaca db', async () => {
    const db = makeDb();
    const verdict = await checkOperationBudgetQuota(controlsFor(db), { organizationId: null, estimatedTokens: 10 });
    expect(verdict).toEqual({ allowed: true });
    expect(db.queries).toHaveLength(0);
  });

  it('melewati quota org saat store absen', async () => {
    const db = makeDb();
    const verdict = await checkOperationBudgetQuota(controlsFor(db, { store: undefined }), {
      organizationId: ORG,
      estimatedTokens: 10,
    });
    expect(verdict).toEqual({ allowed: true });
    expect(db.queries).toHaveLength(0);
  });

  it('memblokir saat budget global habis tanpa menyentuh quota', async () => {
    const db = makeDb();
    const verdict = await checkOperationBudgetQuota(controlsFor(db, { budget: denyBudget }), {
      organizationId: ORG,
      estimatedTokens: 10,
    });
    expect(verdict).toEqual({
      allowed: false,
      gate: 'budget',
      errorClass: 'quota_exhausted',
      message: 'Daily/hourly AI budget exceeded',
    });
    expect(db.queries).toHaveLength(0);
  });

  it('fail-open saat budget melempar', async () => {
    const db = makeDb();
    const verdict = await checkOperationBudgetQuota(controlsFor(db, { budget: throwBudget }), {
      organizationId: ORG,
      estimatedTokens: 10,
    });
    expect(verdict).toEqual({ allowed: true });
  });

  it('mengizinkan lalu memblokir saat kuota harian habis', async () => {
    const db = makeDb({ quotaRow: { daily_request_limit: 1, daily_token_limit: null } });
    const controls = controlsFor(db);
    const first = await checkOperationBudgetQuota(controls, { organizationId: ORG, estimatedTokens: 5 });
    expect(first).toEqual({ allowed: true });
    const second = await checkOperationBudgetQuota(controls, { organizationId: ORG, estimatedTokens: 5 });
    expect(second).toEqual({
      allowed: false,
      gate: 'org-quota',
      errorClass: 'org_daily_requests_exceeded',
      message: 'Organization daily AI quota exceeded',
    });
  });

  it('fail-open saat baca batas org gagal', async () => {
    const db: AiDb = {
      execute: async (query: SQL): Promise<unknown> => {
        if (sqlText(query).includes('from organizations')) throw new Error('db down');
        return [];
      },
    };
    const verdict = await checkOperationBudgetQuota({ db, budget: allowBudget, store: makeStore() }, {
      organizationId: ORG,
      estimatedTokens: 5,
    });
    expect(verdict).toEqual({ allowed: true });
  });
});

describe('checkEmbeddingTransport', () => {
  it('mengizinkan tanpa store', async () => {
    const db = makeDb();
    const verdict = await checkEmbeddingTransport({ db, store: undefined }, {
      providerId: 'gemini',
      modelName: 'gemini-embedding-2',
      estimatedTokens: 4,
    });
    expect(verdict).toEqual({ allowed: true });
  });

  it('mengizinkan lalu memblokir RPM model', async () => {
    const db = makeDb({ limitsRow: { rpm_limit: 1, tpm_limit: null } });
    const controls = controlsFor(db);
    const gate = { providerId: 'gemini', modelName: 'gemini-embedding-2', estimatedTokens: 4 };
    expect(await checkEmbeddingTransport(controls, gate)).toEqual({ allowed: true });
    const blocked = await checkEmbeddingTransport(controls, gate);
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.gate).toBe('rate-limit');
      expect(blocked.errorClass).toBe('rpm_exceeded');
    }
  });

  it('memblokir saat breaker model trip', async () => {
    const db = makeDb();
    const store = makeStore();
    const controls = controlsFor(db, { store });
    const { recordModelInfraFailure } = await import('@/modules/ai/ai-router');
    for (let index = 0; index < 5; index += 1) {
      await recordModelInfraFailure(store, 'gemini', 'gemini-embedding-2');
    }
    const verdict = await checkEmbeddingTransport(controls, {
      providerId: 'gemini',
      modelName: 'gemini-embedding-2',
      estimatedTokens: 4,
    });
    expect(verdict.allowed).toBe(false);
    if (!verdict.allowed) {
      expect(verdict.gate).toBe('breaker');
      expect(verdict.errorClass).toBe('breaker_open');
    }
  });

  it('fail-open saat Redis melempar', async () => {
    const db = makeDb();
    const base = makeStore();
    const store: AiRateLimitStore = {
      ...base,
      get: async (): Promise<number | string | null> => {
        throw new Error('redis down');
      },
    };
    const verdict = await checkEmbeddingTransport({ db, store }, {
      providerId: 'gemini',
      modelName: 'gemini-embedding-2',
      estimatedTokens: 4,
    });
    expect(verdict).toEqual({ allowed: true });
  });
});

describe('recordEmbeddingTransportOutcome', () => {
  it('tidak pernah melempar tanpa store', async () => {
    await expect(
      recordEmbeddingTransportOutcome({ store: undefined }, { providerId: 'gemini', modelName: 'm', succeeded: true }),
    ).resolves.toBeUndefined();
  });

  it('mencatat sukses dan gagal tanpa melempar', async () => {
    const store = makeStore();
    await expect(
      recordEmbeddingTransportOutcome({ store }, { providerId: 'gemini', modelName: 'm', succeeded: false }),
    ).resolves.toBeUndefined();
    await expect(
      recordEmbeddingTransportOutcome({ store }, { providerId: 'gemini', modelName: 'm', succeeded: true }),
    ).resolves.toBeUndefined();
  });
});

describe('logOperationResult', () => {
  it('menulis baris audit tanpa vektor atau konten mentah', async () => {
    const db = makeDb();
    const entry: AiOperationLogEntry = {
      correlationId: 'emb_1',
      channel: 'embed',
      providerId: 'gemini',
      modelName: 'gemini-embedding-2',
      credentialId: null,
      organizationId: ORG,
      status: 'success',
      retryCount: 0,
      latencyMs: 12,
      promptTokens: 9,
      completionTokens: 0,
      totalTokens: 9,
    };
    await logOperationResult({ db, log: undefined }, entry);
    expect(db.queries).toHaveLength(1);
    const params = sqlParams(db.queries[0] as SQL);
    expect(params).toContain('emb_1');
    expect(params).toContain('embed');
    expect(params).toContain('gemini');
    expect(params).toContain('gemini-embedding-2');
    expect(params).toContain(ORG);
    expect(params).toContain('success');
    const joined = params.map((param) => String(param)).join(' ');
    expect(joined).not.toMatch(/0\.7,0\.7|\[0\./);
  });

  it('memakai log override dan menelan kegagalan log', async () => {
    const seen: AiOperationLogEntry[] = [];
    await logOperationResult(
      { db: makeDb(), log: async (row) => { seen.push(row); } },
      {
        correlationId: 'emb_2',
        channel: 'embed',
        providerId: AI_EMBED_GUARD_PROVIDER,
        modelName: AI_EMBED_GUARD_PROVIDER,
        credentialId: null,
        organizationId: ORG,
        status: 'blocked',
        retryCount: 0,
        latencyMs: 2,
        errorClass: 'quota_exhausted',
        errorMessage: 'x',
      },
    );
    expect(seen).toHaveLength(1);
    await expect(
      logOperationResult(
        {
          db: makeDb(),
          log: async () => {
            throw new Error('log down');
          },
        },
        seen[0] as AiOperationLogEntry,
      ),
    ).resolves.toBeUndefined();
  });
});

describe('recordEmbeddingOperation', () => {
  beforeEach(() => {
    recorded.length = 0;
  });

  it('mencatat dimensi operasi, provider, model, tenant, status, dan token', () => {
    recordEmbeddingOperation({
      operation: 'ai.embed.query',
      provider: 'gemini',
      model: 'gemini-embedding-2',
      organizationId: ORG,
      durationMs: 34,
      status: 200,
      tokens: 42,
    });
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      route: 'ai',
      operation: 'ai.embed.query',
      provider: 'gemini',
      model: 'gemini-embedding-2',
      tenantId: ORG,
      durationMs: 34,
      status: 200,
      tokens: 42,
    });
  });

  it('menghilangkan tenant saat organisasi null dan tidak pernah melempar', () => {
    expect(() =>
      recordEmbeddingOperation({
        operation: 'ai.embed.reindex',
        provider: AI_EMBED_GUARD_PROVIDER,
        model: AI_EMBED_GUARD_PROVIDER,
        organizationId: null,
        durationMs: Number.NaN,
        status: 429,
      }),
    ).not.toThrow();
    expect(recorded[0]).toMatchObject({ operation: 'ai.embed.reindex', status: 429 });
    expect(recorded[0] as Record<string, unknown>).not.toHaveProperty('tenantId');
  });
});
