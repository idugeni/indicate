import { describe, expect, it } from 'vitest';

import { aiScopedGet, aiScopedKey } from '@/modules/ai/ai-redis-namespace';
import {
  aiOrgQuotaRequestsKey,
  checkAiModelRateLimit,
  checkOrganizationQuota,
  type AiRateLimitStore,
} from '@/modules/ai/ai-rate-limit';
import {
  checkVercelGatewayBudget,
  recordVercelGatewayUsage,
  vercelGatewayBudgetScope,
  VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET,
} from '@/integrations/ai/gateway/vercel/vercel-gateway';

const NAMESPACE = 'indicate:production:v3';

function memoryStore(): AiRateLimitStore & { readonly counts: Map<string, number>; readonly reads: string[] } {
  const counts = new Map<string, number>();
  const reads: string[] = [];
  return {
    namespace: NAMESPACE,
    counts,
    reads,
    get: async (key: string) => {
      reads.push(key);
      return counts.get(key) ?? null;
    },
    incrby: async (key: string, delta: number) => {
      const next = (counts.get(key) ?? 0) + delta;
      counts.set(key, next);
      return next;
    },
    expire: async () => {},
  };
}

describe('aiScopedKey', () => {
  it('memberi prefix namespace pada kunci ai:*', () => {
    expect(aiScopedKey(NAMESPACE, 'ai:limit:rpm:m:1')).toBe(`${NAMESPACE}:ai:limit:rpm:m:1`);
  });

  it('mempertahankan kunci legacy bila namespace null atau kosong', () => {
    expect(aiScopedKey(null, 'ai:limit:rpm:m:1')).toBe('ai:limit:rpm:m:1');
    expect(aiScopedKey(undefined, 'ai:limit:rpm:m:1')).toBe('ai:limit:rpm:m:1');
    expect(aiScopedKey('', 'ai:limit:rpm:m:1')).toBe('ai:limit:rpm:m:1');
  });
});

describe('aiScopedGet', () => {
  it('membaca namespaced dulu lalu legacy bila miss', async () => {
    const seen: string[] = [];
    const get = async (key: string): Promise<unknown> => {
      seen.push(key);
      return key === 'ai:k' ? 7 : null;
    };
    await expect(aiScopedGet(get, NAMESPACE, 'ai:k')).resolves.toBe(7);
    expect(seen).toEqual([`${NAMESPACE}:ai:k`, 'ai:k']);
  });

  it('tidak menyentuh legacy saat namespaced hit', async () => {
    const seen: string[] = [];
    const get = async (key: string): Promise<unknown> => {
      seen.push(key);
      return 3;
    };
    await expect(aiScopedGet(get, NAMESPACE, 'ai:k')).resolves.toBe(3);
    expect(seen).toEqual([`${NAMESPACE}:ai:k`]);
  });
});

describe('namespaced rate limits', () => {
  const now = new Date('2026-09-30T00:01:30.000Z');

  it('check+charge menulis kunci namespaced, bukan global', async () => {
    const store = memoryStore();
    const verdict = await checkAiModelRateLimit(store, { rpmLimit: 15, tpmLimit: 1000000 }, 'gemini-2.5-flash', 100, now);
    expect(verdict).toEqual({ allowed: true });
    expect(store.counts.size).toBeGreaterThan(0);
    expect([...store.counts.keys()].every((key) => key.startsWith(`${NAMESPACE}:ai:`))).toBe(true);
  });

  it('kuota org membaca kontinuitas legacy saat namespaced kosong', async () => {
    const store = memoryStore();
    const day = '2026-09-30';
    store.counts.set(aiOrgQuotaRequestsKey('org-1', day), 60);
    const verdict = await checkOrganizationQuota(store, 'org-1', { dailyRequestLimit: 60, dailyTokenLimit: null }, 1, now);
    expect(verdict).toEqual({ allowed: false, reason: 'org_daily_requests_exceeded', remainingRequests: 0 });
    // Charge berikutnya (bila lolos) tercatat namespaced, bukan menimpa legacy.
    const open = memoryStore();
    open.counts.set(aiOrgQuotaRequestsKey('org-1', day), 10);
    const allowed = await checkOrganizationQuota(open, 'org-1', { dailyRequestLimit: 60, dailyTokenLimit: null }, 1, now);
    expect(allowed.allowed).toBe(true);
    expect(open.counts.has(`${NAMESPACE}:${aiOrgQuotaRequestsKey('org-1', day)}`)).toBe(true);
    expect(open.counts.get(aiOrgQuotaRequestsKey('org-1', day))).toBe(10);
  });
});

describe('namespaced gateway budget', () => {
  const now = new Date('2026-09-30T12:00:00.000Z');
  const scope = vercelGatewayBudgetScope('org-9');

  function gatewayStore(): { get: (key: string) => Promise<unknown>; incrby: (key: string, value: number) => Promise<unknown>; expire: (key: string, seconds: number) => Promise<unknown>; readonly counts: Map<string, number> } {
    const counts = new Map<string, number>();
    return {
      counts,
      get: async (key: string) => counts.get(key) ?? null,
      incrby: async (key: string, value: number) => {
        const next = (counts.get(key) ?? 0) + value;
        counts.set(key, next);
        return next;
      },
      expire: async () => {},
    };
  }

  it('check memakai pool namespaced dengan fallback legacy', async () => {
    const store = gatewayStore();
    store.counts.set(`ai:vercel-gateway:tokens:${scope}:2026-09`, VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET);
    const verdict = await checkVercelGatewayBudget(store, scope, now, NAMESPACE);
    expect(verdict.allowed).toBe(false);
  });

  it('record menulis namespaced dan tidak menyentuh kunci global', async () => {
    const store = gatewayStore();
    await recordVercelGatewayUsage(store, scope, 100, now, NAMESPACE);
    const keys = [...store.counts.keys()];
    expect(keys).toHaveLength(1);
    expect(keys[0]?.startsWith(`${NAMESPACE}:ai:vercel-gateway:tokens:`)).toBe(true);
  });

  it('tanpa namespace tetap memakai kunci legacy (kompatibel ke belakang)', async () => {
    const store = gatewayStore();
    await recordVercelGatewayUsage(store, scope, 100, now);
    expect([...store.counts.keys()]).toEqual([`ai:vercel-gateway:tokens:${scope}:2026-09`]);
  });
});
