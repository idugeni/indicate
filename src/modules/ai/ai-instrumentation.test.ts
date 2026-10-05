import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordOperation = vi.fn();
const redisGet = vi.fn();
const redisIncrby = vi.fn();
const redisIncr = vi.fn();
const redisExpire = vi.fn();

vi.mock('@/core/observability/operation-metrics', () => ({
  recordOperation,
}));

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = redisGet;
    incrby = redisIncrby;
    incr = redisIncr;
    expire = redisExpire;
  },
}));

import type { AiRateLimitStore } from '@/modules/ai/ai-rate-limit';

const { checkAiModelRateLimit, checkOrganizationQuota } = await import('@/modules/ai/ai-rate-limit');
const { isModelBreakerTripped, nextChainStartIndex, recordModelInfraFailure, recordModelSuccess } = await import(
  '@/modules/ai/ai-router'
);
const { checkVercelGatewayBudget, recordVercelGatewayUsage, vercelGatewayBudgetScope } = await import(
  '@/integrations/ai/gateway/vercel/vercel-gateway'
);
const { createAiBudgetGuard } = await import('@/modules/ai/ai-security');

function memoryStore(fail = false): AiRateLimitStore {
  const counts = new Map<string, number>();
  return {
    get: async (key: string) => {
      if (fail) throw new Error('redis down');
      return counts.get(key) ?? null;
    },
    incrby: async (key: string, delta: number) => {
      if (fail) throw new Error('redis down');
      const next = (counts.get(key) ?? 0) + delta;
      counts.set(key, next);
      return next;
    },
    expire: async () => {
      if (fail) throw new Error('redis down');
    },
  };
}

function samples() {
  return recordOperation.mock.calls.map((call) => call[0] as Record<string, unknown>);
}

const NOW = new Date('2026-09-30T00:01:30.000Z');

describe('instrumentasi gerbang AI', () => {
  beforeEach(() => {
    recordOperation.mockReset();
  });

  it('mencatat Lua rate-limit sebagai satu perintah tanpa model di luar kunci', async () => {
    const store = { ...memoryStore(), eval: async () => ['ok'] as unknown };
    await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: 1000 }, 'gemini-2.5-flash', 100, NOW);
    expect(samples()).toHaveLength(1);
    expect(samples()[0]).toMatchObject({ route: 'ai', operation: 'ai.rate-limit', provider: 'upstash-redis', redisCommands: 1, status: 200 });
  });

  it('menghitung perintah legacy check-then-charge secara tepat', async () => {
    const store = memoryStore();
    await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: 1000000 }, 'gemini-2.5-flash', 100, NOW);
    expect(samples()[0]).toMatchObject({ operation: 'ai.rate-limit', redisCommands: 6, status: 200 });
  });

  it('kegagalan Redis tercatat 500 tanpa mengubah fail-open', async () => {
    const verdict = await checkAiModelRateLimit(memoryStore(true), { rpmLimit: 1, tpmLimit: 1 }, 'm', 1, NOW);
    expect(verdict).toEqual({ allowed: true });
    expect(samples()[0]).toMatchObject({ operation: 'ai.rate-limit', status: 500 });
  });

  it('kuota org membawa tenant dan menghitung baca-tulis', async () => {
    const store = memoryStore();
    const verdict = await checkOrganizationQuota(store, 'org-9', { dailyRequestLimit: 60, dailyTokenLimit: 1000 }, 10, NOW);
    expect(verdict.allowed).toBe(true);
    expect(samples()[0]).toMatchObject({ operation: 'ai.quota', tenantId: 'org-9', redisCommands: 6, status: 200 });
  });

  it('breaker baca/tulis/gagal/dingin tercatat per perintah', async () => {
    const store = memoryStore();
    await isModelBreakerTripped(store, 'gemini', 'flash');
    await recordModelInfraFailure(store, 'gemini', 'flash');
    await recordModelSuccess(store, 'gemini', 'flash');
    const breaker = samples().filter((sample) => sample.operation === 'ai.breaker');
    expect(breaker.map((sample) => sample.redisCommands)).toEqual([1, 2, 1]);
    expect(breaker.every((sample) => sample.status === 200)).toBe(true);
  });

  it('kursor rantai tercatat satu incrby; gagal tetap 0 tanpa melempar', async () => {
    await nextChainStartIndex(memoryStore());
    await nextChainStartIndex(memoryStore(true));
    expect(samples()).toMatchObject([
      { operation: 'ai.cursor', redisCommands: 1, status: 200 },
      { operation: 'ai.cursor', redisCommands: 1, status: 500 },
    ]);
  });

  it('gateway memakai fallback legacy lalu menulis namespaced', async () => {
    const counts = new Map<string, unknown>([[`ai:vercel-gateway:tokens:${vercelGatewayBudgetScope('org-9')}:2026-09`, 10]]);
    const store = {
      get: async (key: string) => counts.get(key) ?? null,
      incrby: async (key: string, value: number) => {
        counts.set(key, value);
        return value;
      },
      expire: async () => {},
    };
    const verdict = await checkVercelGatewayBudget(store, vercelGatewayBudgetScope('org-9'), NOW, 'indicate:test:v1');
    expect(verdict.allowed).toBe(true);
    expect(samples()[0]).toMatchObject({ operation: 'ai.gateway', redisCommands: 2, status: 200 });
    await recordVercelGatewayUsage(store, vercelGatewayBudgetScope('org-9'), 40, NOW, 'indicate:test:v1');
    expect(samples()[1]).toMatchObject({ operation: 'ai.gateway', redisCommands: 2, status: 200 });
    expect([...counts.keys()].some((key) => key.startsWith('indicate:test:v1:ai:vercel-gateway:tokens:'))).toBe(true);
  });

  it('budget guard memeriksa dua kunci dan mencatat empat tulis', async () => {
    redisGet.mockReset();
    redisIncrby.mockReset();
    redisIncr.mockReset();
    redisExpire.mockReset();
    redisGet.mockResolvedValue(null);
    const guard = createAiBudgetGuard({ url: 'https://redis.test', token: 't', namespace: 'indicate:test:v1' });
    const verdict = await guard.checkAiBudgetSafeguard();
    expect(verdict.allowed).toBe(true);
    expect(samples()[0]).toMatchObject({ operation: 'ai.budget', redisCommands: 2, status: 200 });
    await guard.recordAiTokenUsage(120);
    expect(samples()[1]).toMatchObject({ operation: 'ai.budget', redisCommands: 4, status: 200 });
    expect(redisGet).toHaveBeenCalledTimes(2);
    expect(redisIncrby).toHaveBeenCalledTimes(1);
    expect(redisIncr).toHaveBeenCalledTimes(1);
    expect(redisExpire).toHaveBeenCalledTimes(2);
  });

  it('tidak ada prompt, completion, token, atau kunci pada sampel', () => {
    const blob = JSON.stringify(samples());
    expect(blob).not.toMatch(/prompt|completion|Bearer|sk-|cookie/i);
  });
});
