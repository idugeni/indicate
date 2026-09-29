import { describe, expect, it } from 'vitest';

import {
  aiRateLimitWindow,
  aiRpmKey,
  aiTpmKey,
  checkAiModelRateLimit,
  estimateAiInputTokens,
  getAiModelLimits,
  type AiRateLimitStore,
} from '@/modules/ai/ai-rate-limit';
import type { AiDb } from '@/modules/ai/ai-types';

function memoryStore(fail = false): AiRateLimitStore & { readonly counts: Map<string, number>; readonly incrCalls: readonly string[] } {
  const counts = new Map<string, number>();
  const incrCalls: string[] = [];
  return {
    counts,
    incrCalls,
    get: async (key: string) => {
      if (fail) throw new Error('redis down');
      return counts.get(key) ?? null;
    },
    incrby: async (key: string, delta: number) => {
      if (fail) throw new Error('redis down');
      incrCalls.push(key);
      const next = (counts.get(key) ?? 0) + delta;
      counts.set(key, next);
      return next;
    },
    expire: async () => {
      if (fail) throw new Error('redis down');
    },
  };
}

function fakeDb(rows: readonly unknown[]): AiDb {
  return { execute: async () => [...rows] };
}

describe('getAiModelLimits', () => {
  it('model tidak terdaftar berarti unlimited', async () => {
    expect(await getAiModelLimits(fakeDb([]), 'model-asing')).toEqual({ rpmLimit: null, tpmLimit: null });
  });

  it('membaca batas rpm/tpm dari direktori model', async () => {
    const limits = await getAiModelLimits(fakeDb([{ rpm_limit: '15', tpm_limit: 1000000 }]), 'gemini-2.5-flash');
    expect(limits).toEqual({ rpmLimit: 15, tpmLimit: 1000000 });
  });

  it('gagal baca berarti unlimited (fail-open)', async () => {
    const broken: AiDb = { execute: async () => { throw new Error('db down'); } };
    expect(await getAiModelLimits(broken, 'gemini-2.5-flash')).toEqual({ rpmLimit: null, tpmLimit: null });
  });
});

describe('checkAiModelRateLimit', () => {
  const now = new Date('2026-09-30T00:01:30.000Z');
  const window = aiRateLimitWindow(now);

  it('memblokir rpm yang terlampaui tanpa membakar key', async () => {
    const store = memoryStore();
    store.counts.set(aiRpmKey('gemini-2.5-flash', window), 15);
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: null }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: false, reason: 'rpm_exceeded' });
    expect(store.incrCalls).toHaveLength(0);
  });

  it('memblokir tpm yang terlampaui tanpa membakar key', async () => {
    const store = memoryStore();
    store.counts.set(aiTpmKey('gemini-2.5-flash', window), 999990);
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: null, tpmLimit: 1000000 }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: false, reason: 'tpm_exceeded' });
    expect(store.incrCalls).toHaveLength(0);
  });

  it('request lolos mengonsumsi kedua window 60 detik', async () => {
    const store = memoryStore();
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: 1000000 }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: true });
    expect(store.counts.get(aiRpmKey('gemini-2.5-flash', window))).toBe(1);
    expect(store.counts.get(aiTpmKey('gemini-2.5-flash', window))).toBe(100);
  });

  it('redis mati berarti lolos (fail-open)', async () => {
    const store = memoryStore(true);
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 1, tpmLimit: 1 }, 'gemini-2.5-flash', 5000, now);
    expect(verdict).toEqual({ allowed: true });
  });

  it('model tanpa batas selalu lolos tanpa menyentuh redis', async () => {
    const store = memoryStore();
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: null, tpmLimit: null }, 'model-asing', 100, now);
    expect(verdict).toEqual({ allowed: true });
    expect(store.incrCalls).toHaveLength(0);
  });
});

describe('window helpers', () => {
  it('window stabil dalam satu menit dan berganti menit berikut', () => {
    const first = aiRateLimitWindow(new Date('2026-09-30T00:01:10.000Z'));
    expect(aiRateLimitWindow(new Date('2026-09-30T00:01:50.000Z'))).toBe(first);
    expect(aiRateLimitWindow(new Date('2026-09-30T00:02:00.000Z'))).toBe(first + 1);
  });

  it('key rpm dan tpm berbeda namespace', () => {
    expect(aiRpmKey('m', 7)).toBe('ai:limit:rpm:m:7');
    expect(aiTpmKey('m', 7)).toBe('ai:limit:tpm:m:7');
  });

  it('estimasi token minimal 1 dan tumbuh dengan panjang prompt', () => {
    expect(estimateAiInputTokens('', 0)).toBe(1);
    expect(estimateAiInputTokens('x'.repeat(400), 0)).toBe(100);
    expect(estimateAiInputTokens('x'.repeat(400), 2)).toBeGreaterThan(100);
  });
});
