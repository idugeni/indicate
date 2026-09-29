import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkAiBudgetSafeguard, recordAiTokenUsage } from '@/integrations/ai/ai-budget';

function fakeRedis(values: Record<string, number> = {}, fail = false) {
  const store = new Map<string, number>(Object.entries(values));
  return {
    store,
    get: vi.fn(async (key: string) => {
      if (fail) throw new Error('redis down');
      return store.get(key) ?? null;
    }),
    incrby: vi.fn(async (key: string, value: number) => {
      if (fail) throw new Error('redis down');
      store.set(key, (store.get(key) ?? 0) + value);
      return store.get(key);
    }),
    incr: vi.fn(async (key: string) => {
      if (fail) throw new Error('redis down');
      store.set(key, (store.get(key) ?? 0) + 1);
      return store.get(key);
    }),
    expire: vi.fn(async () => true),
  };
}

const NOW = new Date('2026-09-30T10:00:00.000Z');
const DAY = 'ai:budget:tokens:2026-09-30';
const HOUR = 'ai:budget:reqs:2026-09-30T10';

describe('checkAiBudgetSafeguard', () => {
  it('mengizinkan saat di bawah kedua ambang', async () => {
    const redis = fakeRedis({ [DAY]: 100, [HOUR]: 5 });
    const verdict = await checkAiBudgetSafeguard(redis, NOW);
    expect(verdict).toEqual({ allowed: true, remainingBudget: 250_000 - 100 });
  });

  it('menolak saat token harian habis', async () => {
    const redis = fakeRedis({ [DAY]: 250_000, [HOUR]: 1 });
    const verdict = await checkAiBudgetSafeguard(redis, NOW);
    expect(verdict.allowed).toBe(false);
    expect(verdict.remainingBudget).toBe(0);
  });

  it('menolak saat request per jam habis', async () => {
    const redis = fakeRedis({ [DAY]: 10, [HOUR]: 60 });
    const verdict = await checkAiBudgetSafeguard(redis, NOW);
    expect(verdict.allowed).toBe(false);
  });

  it('fail-open saat redis null atau error', async () => {
    expect(await checkAiBudgetSafeguard(null, NOW)).toMatchObject({ allowed: true });
    const redis = fakeRedis({}, true);
    expect(await checkAiBudgetSafeguard(redis, NOW)).toMatchObject({ allowed: true });
  });
});

describe('recordAiTokenUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mencatat token dan request dengan TTL', async () => {
    const redis = fakeRedis();
    await recordAiTokenUsage(redis, 120, NOW);
    expect(redis.incrby).toHaveBeenCalledWith(DAY, 120);
    expect(redis.incr).toHaveBeenCalledWith(HOUR);
    expect(redis.expire).toHaveBeenCalledTimes(2);
    expect(redis.store.get(DAY)).toBe(120);
    expect(redis.store.get(HOUR)).toBe(1);
  });

  it('membulatkan pemakaian invalid menjadi minimal satu tanpa melempar', async () => {
    const redis = fakeRedis();
    await recordAiTokenUsage(redis, 0, NOW);
    expect(redis.incrby).toHaveBeenCalledWith(DAY, 1);
    await recordAiTokenUsage(null, 50, NOW);
    await recordAiTokenUsage(fakeRedis({}, true), 50, NOW);
  });
});
