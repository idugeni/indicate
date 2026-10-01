import { describe, expect, it } from 'vitest';

import {
  VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET,
  checkVercelGatewayBudget,
  recordVercelGatewayUsage,
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

describe('checkVercelGatewayBudget', () => {
  it('mengizinkan saat store tak terkonfigurasi dan saat di bawah plafon', async () => {
    await expect(checkVercelGatewayBudget(null, 'cred-1')).resolves.toMatchObject({ allowed: true });
    const verdict = await checkVercelGatewayBudget(makeStore(new Map()), 'cred-1', new Date('2026-10-01T00:00:00Z'));
    expect(verdict).toEqual({ allowed: true, remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET });
  });

  it('menolak saat plafon bulanan tercapai dan mencatat pemakaian', async () => {
    const values = new Map<string, number>([['ai:vercel-gateway:tokens:cred-1:2026-10', VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET]]);
    await expect(checkVercelGatewayBudget(makeStore(values), 'cred-1', new Date('2026-10-15T00:00:00Z'))).resolves.toMatchObject({
      allowed: false,
      remainingBudget: 0,
    });
    const fresh = new Map<string, number>();
    const store = makeStore(fresh);
    await recordVercelGatewayUsage(store, 'cred-1', 40, new Date('2026-10-15T00:00:00Z'));
    await expect(checkVercelGatewayBudget(store, 'cred-1', new Date('2026-10-15T00:00:00Z'))).resolves.toMatchObject({
      allowed: true,
      remainingBudget: VERCEL_GATEWAY_MONTHLY_TOKEN_BUDGET - 40,
    });
    await recordVercelGatewayUsage(null, 'cred-1', 40);
  });
});
