import { describe, expect, it } from 'vitest';

import {
  AI_RATE_LIMIT_LUA,
  aiOrgQuotaRequestsKey,
  aiOrgQuotaTokensKey,
  aiRateLimitWindow,
  aiRpmKey,
  aiTpmKey,
  checkAiModelRateLimit,
  checkOrganizationQuota,
  estimateAiInputTokens,
  getAiModelLimits,
  getOrganizationQuotaLimits,
  readRateLimitVerdict,
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

describe('checkAiModelRateLimit lua atomik', () => {
  const now = new Date('2026-09-30T00:01:30.000Z');

  function luaStore(counts = new Map<string, number>(), fail = false): AiRateLimitStore & { readonly calls: string[]; readonly counts: Map<string, number>; readonly incrCalls: readonly string[] } {
    const calls: string[] = [];
    const base = memoryStore();
    for (const [key, value] of counts) base.counts.set(key, value);
    return {
      ...base,
      counts: base.counts,
      incrCalls: base.incrCalls,
      calls,
      eval: async (script: string, keys: readonly string[], args: ReadonlyArray<string | number>) => {
        calls.push(script);
        if (fail) throw new Error('redis down');
        const [rpmLimit, tpmLimit, charge] = [Number(args[0]), Number(args[1]), Number(args[2])];
        const rpm = base.counts.get(keys[0] ?? '') ?? 0;
        const tpm = base.counts.get(keys[1] ?? '') ?? 0;
        if (rpmLimit >= 0 && rpm >= rpmLimit) return ['rpm_exceeded'];
        if (tpmLimit >= 0 && tpm + charge > tpmLimit) return ['tpm_exceeded'];
        if (rpmLimit >= 0) base.counts.set(keys[0] ?? '', rpm + 1);
        if (tpmLimit >= 0) base.counts.set(keys[1] ?? '', tpm + charge);
        return ['ok'];
      },
    };
  }

  it('memakai satu eval untuk cek-dan-catat', async () => {
    const store = luaStore();
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: 1000000 }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: true });
    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]).toBe(AI_RATE_LIMIT_LUA);
    expect(store.incrCalls).toHaveLength(0);
  });

  it('memblokir rpm lewat eval tanpa legacy incr', async () => {
    const window = aiRateLimitWindow(now);
    const store = luaStore(new Map([[aiRpmKey('m', window), 15]]));
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: null }, 'm', 100, now);
    expect(verdict).toEqual({ allowed: false, reason: 'rpm_exceeded' });
    expect(store.incrCalls).toHaveLength(0);
  });

  it('eval gagal berarti lolos (fail-open)', async () => {
    const store = luaStore(new Map(), true);
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 1, tpmLimit: 1 }, 'm', 5000, now);
    expect(verdict).toEqual({ allowed: true });
  });

  it('readRateLimitVerdict memetakan token dan bentuk tak dikenal', () => {
    expect(readRateLimitVerdict(['ok'])).toEqual({ allowed: true });
    expect(readRateLimitVerdict(['rpm_exceeded'])).toEqual({ allowed: false, reason: 'rpm_exceeded' });
    expect(readRateLimitVerdict(['tpm_exceeded'])).toEqual({ allowed: false, reason: 'tpm_exceeded' });
    expect(readRateLimitVerdict('ok')).toEqual({ allowed: true });
    expect(readRateLimitVerdict(null)).toEqual({ allowed: true });
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

describe('checkOrganizationQuota', () => {
  const now = new Date('2026-09-30T00:01:30.000Z');
  const day = '2026-09-30';

  it('memblokir kuota request harian yang terlampaui tanpa membakar key', async () => {
    const store = memoryStore();
    store.counts.set(aiOrgQuotaRequestsKey('org-a', day), 100);
    const verdict = await checkOrganizationQuota(store, 'org-a', { dailyRequestLimit: 100, dailyTokenLimit: null }, 10, now);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe('org_daily_requests_exceeded');
    expect(store.incrCalls).toHaveLength(0);
  });

  it('memblokir kuota token harian yang terlampaui tanpa membakar key', async () => {
    const store = memoryStore();
    store.counts.set(aiOrgQuotaTokensKey('org-a', day), 9990);
    const verdict = await checkOrganizationQuota(store, 'org-a', { dailyRequestLimit: null, dailyTokenLimit: 10000 }, 50, now);
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toBe('org_daily_tokens_exceeded');
    expect(store.incrCalls).toHaveLength(0);
  });

  it('request lolos mengonsumsi counter harian per-org', async () => {
    const store = memoryStore();
    const verdict = await checkOrganizationQuota(store, 'org-a', { dailyRequestLimit: 100, dailyTokenLimit: 10000 }, 50, now);
    expect(verdict.allowed).toBe(true);
    expect(store.counts.get(aiOrgQuotaRequestsKey('org-a', day))).toBe(1);
    expect(store.counts.get(aiOrgQuotaTokensKey('org-a', day))).toBe(50);
  });

  it('org berbeda memakai kunci terpisah', async () => {
    const store = memoryStore();
    await checkOrganizationQuota(store, 'org-a', { dailyRequestLimit: 100, dailyTokenLimit: null }, 1, now);
    expect(store.counts.get(aiOrgQuotaRequestsKey('org-b', day))).toBeUndefined();
  });

  it('redis mati berarti lolos (fail-open)', async () => {
    const store = memoryStore(true);
    const verdict = await checkOrganizationQuota(store, 'org-a', { dailyRequestLimit: 1, dailyTokenLimit: 1 }, 5000, now);
    expect(verdict).toEqual({ allowed: true });
  });

  it('org tanpa batas selalu lolos tanpa menyentuh redis', async () => {
    const store = memoryStore();
    const verdict = await checkOrganizationQuota(store, 'org-a', { dailyRequestLimit: null, dailyTokenLimit: null }, 100, now);
    expect(verdict).toEqual({ allowed: true });
    expect(store.incrCalls).toHaveLength(0);
  });
});

describe('koersi numerik Upstash', () => {
  const now = new Date('2026-09-30T00:01:30.000Z');
  const window = aiRateLimitWindow(now);

  function stringStore(values: Map<string, string>): AiRateLimitStore {
    return {
      get: async (key: string) => values.get(key) ?? null,
      incrby: async () => 0,
      expire: async () => {},
    };
  }

  it('string numerik dari get diperlakukan sebagai angka', async () => {
    const store = stringStore(new Map([[aiRpmKey('gemini-2.5-flash', window), '15']]));
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: null }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: false, reason: 'rpm_exceeded' });
  });

  it('string non-numerik diperlakukan sebagai nol', async () => {
    const store = stringStore(new Map([[aiRpmKey('gemini-2.5-flash', window), 'bukan-angka']]));
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: null }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: true });
  });
});

describe('getOrganizationQuotaLimits', () => {
  it('membaca batas harian organisasi', async () => {
    const limits = await getOrganizationQuotaLimits(
      fakeDb([{ daily_request_limit: '100', daily_token_limit: 10000 }]),
      'org-a',
    );
    expect(limits).toEqual({ dailyRequestLimit: 100, dailyTokenLimit: 10000 });
  });

  it('baris hilang atau db gagal berarti unlimited (fail-open)', async () => {
    expect(await getOrganizationQuotaLimits(fakeDb([]), 'org-asing')).toEqual({
      dailyRequestLimit: null,
      dailyTokenLimit: null,
    });
    const broken: AiDb = { execute: async () => { throw new Error('db down'); } };
    expect(await getOrganizationQuotaLimits(broken, 'org-a')).toEqual({
      dailyRequestLimit: null,
      dailyTokenLimit: null,
    });
  });
});
