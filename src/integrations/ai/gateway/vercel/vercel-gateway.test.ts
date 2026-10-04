import { describe, expect, it } from 'vitest';

import {
  VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET,
  checkVercelGatewayBudget,
  recordVercelGatewayUsage,
  vercelGatewayBudgetScope,
} from '@/integrations/ai/gateway/vercel/vercel-gateway';

function makeStore(values: Map<string, number>): {
  get(key: string): Promise<unknown>;
  incrby(key: string, value: number): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
} {
  return {
    get: async (key: string) => values.get(key) ?? null,
    incrby: async (key: string, value: number) => {
      values.set(key, (values.get(key) ?? 0) + value);
      return values.get(key);
    },
    expire: async () => undefined,
  };
}

const SCOPE = vercelGatewayBudgetScope('org-1');
const SCOPE_KEY = `ai:vercel-gateway:tokens:${SCOPE}:2026-10`;

describe('vercelGatewayBudgetScope', () => {
  it('memetakan setiap model ke satu pool organisasi', () => {
    expect(vercelGatewayBudgetScope('org-1')).toBe('org-1:vercel-gateway');
    expect(vercelGatewayBudgetScope(null)).toBe('global:vercel-gateway');
    expect(vercelGatewayBudgetScope(undefined)).toBe('global:vercel-gateway');
  });
});

describe('checkVercelGatewayBudget', () => {
  it('mengizinkan saat store tak terkonfigurasi dan saat di bawah plafon', async () => {
    await expect(checkVercelGatewayBudget(null, SCOPE)).resolves.toMatchObject({ allowed: true });
    const verdict = await checkVercelGatewayBudget(makeStore(new Map()), SCOPE, new Date('2026-10-01T00:00:00Z'));
    expect(verdict).toEqual({ allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET });
  });

  it('menolak saat plafon bulanan tercapai dan mencatat pemakaian', async () => {
    const values = new Map<string, number>([[SCOPE_KEY, VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET]]);
    await expect(checkVercelGatewayBudget(makeStore(values), SCOPE, new Date('2026-10-15T00:00:00Z'))).resolves.toMatchObject({
      allowed: false,
      remainingBudget: 0,
    });
    const fresh = new Map<string, number>();
    const store = makeStore(fresh);
    await recordVercelGatewayUsage(store, SCOPE, 40, new Date('2026-10-15T00:00:00Z'));
    await expect(checkVercelGatewayBudget(store, SCOPE, new Date('2026-10-15T00:00:00Z'))).resolves.toMatchObject({
      allowed: true,
      remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - 40,
    });
    await recordVercelGatewayUsage(null, SCOPE, 40);
  });

  it('berbagi satu pool antar model dalam organisasi yang sama', async () => {
    const values = new Map<string, number>();
    const store = makeStore(values);
    const now = new Date('2026-10-15T00:00:00Z');
    await recordVercelGatewayUsage(store, SCOPE, 100, now);
    await recordVercelGatewayUsage(store, SCOPE, 50, now);
    expect(values.get(SCOPE_KEY)).toBe(150);
    await expect(checkVercelGatewayBudget(store, SCOPE, now)).resolves.toMatchObject({
      allowed: true,
      remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - 150,
    });
  });
});
