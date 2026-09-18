import { describe, expect, it, vi } from 'vitest';

import { RateLimitService } from '@/modules/integrations/rate-limit-service';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const POLICY = { allowance: 10, windowSeconds: 60, failureMode: 'closed' } as const;

const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

function harness(consume?: (...args: unknown[]) => Promise<unknown>) {
  const port = { consume: vi.fn(consume ?? (async () => ({ allowed: true, remaining: 9, retryAfterSeconds: 0, resetAt: NOW.toISOString() }))) };
  const service = new RateLimitService(port as never, { now: () => NOW });
  return { port, service };
}

describe('RateLimitService keys', () => {
  it('membentuk key terautentikasi dari endpoint, org, dan aktor', () => {
    const { service } = harness();
    expect(service.authenticatedKey('webhook.telegram', actor)).toBe('webhook_telegram:org:org-1:actor:user:user-1');
  });

  it('membersihkan karakter berbahaya pada key publik', () => {
    const { service } = harness();
    expect(service.publicKey('api v1!', '203.0.113.7/x')).toBe('api_v1_:public:203_0_113_7_x');
  });
});

describe('RateLimitService enforce', () => {
  it('menolak policy tidak valid sebagai configuration invalid', async () => {
    const { service } = harness();
    const result = await service.enforce('k', { allowance: 0 }, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFIGURATION_INVALID');
  });

  it('meloloskan keputusan allowed dari port', async () => {
    const decision = { allowed: true, remaining: 4, retryAfterSeconds: 0, resetAt: NOW.toISOString() };
    const { service, port } = harness(async () => decision);
    const result = await service.enforce('k', POLICY, 'req-1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual(decision);
    expect(port.consume).toHaveBeenCalledTimes(1);
  });

  it('memetakan keputusan ditolak ke rate limited beserta retry', async () => {
    const { service } = harness(async () => ({ allowed: false, remaining: 0, retryAfterSeconds: 42, resetAt: NOW.toISOString() }));
    const result = await service.enforce('k', POLICY, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RATE_LIMITED');
    expect(result.error.error.fields?.retryAfterSeconds).toEqual(['42']);
  });

  it('menolak tertutup saat port gagal pada mode closed', async () => {
    const { service } = harness(async () => {
      throw new Error('redis down');
    });
    const result = await service.enforce('k', POLICY, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('membuka akses darurat pada mode open_low_risk saat port gagal', async () => {
    const { service } = harness(async () => {
      throw new Error('redis down');
    });
    const result = await service.enforce('k', { ...POLICY, failureMode: 'open_low_risk' }, 'req-1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.allowed).toBe(true);
    expect(result.value.retryAfterSeconds).toBe(60);
  });
});
