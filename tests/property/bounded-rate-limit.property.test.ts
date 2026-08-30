import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';
import { assertAsyncProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 32: Rate limits never exceed configured allowances
// **Validates: Requirements 17.10, 17.11, 17.12, 17.13, 17.14**
describe('Property 32: bounded rate limiting', () => {
  it('never permits more than the bounded allowance and partitions tenant and source identities', async () => {
    await assertAsyncProperty('Property 32: Rate limits never exceed configured allowances', fc.asyncProperty(
      fc.record({ allowance: fc.integer({ min: 1, max: 30 }), extra: fc.integer({ min: 1, max: 20 }), windowSeconds: fc.integer({ min: 1, max: 300 }), organization: fc.uuid(), actorId: fc.uuid(), otherOrganization: fc.uuid() }),
      async ({ allowance, extra, windowSeconds, organization, actorId, otherOrganization }) => {
        fc.pre(organization !== otherOrganization); const now = new Date('2026-08-30T00:00:00.000Z'); const service = new RateLimitService(new InMemoryRateLimitAdapter(), { now: () => now }); const policy = { allowance, windowSeconds, failureMode: 'closed' as const };
        const actor = { actorType: 'api_key' as const, actorId, organizationId: organization, permissionSet: new Set<string>(), entryPoint: 'api' as const, requestId: 'rate' };
        const key = service.authenticatedKey('mutation', actor); let allowed = 0; let lastRetry = 0;
        for (let index = 0; index < allowance + extra; index += 1) { const result = await service.enforce(key, policy, `rate-${index}`); if (result.ok) allowed += 1; else { expect(result.error.error.code).toBe('RATE_LIMITED'); lastRetry = Number(result.error.error.fields?.retryAfterSeconds?.[0] ?? 0); } }
        expect(allowed).toBe(allowance); expect(lastRetry).toBeGreaterThan(0); expect(lastRetry).toBeLessThanOrEqual(windowSeconds);
        const other = { ...actor, organizationId: otherOrganization, requestId: 'other' }; expect((await service.enforce(service.authenticatedKey('mutation', other), policy, 'other')).ok).toBe(true);
        expect(service.publicKey('webhook', '203.0.113.10')).not.toBe(service.publicKey('webhook', '203.0.113.11'));
      },
    ));
  });
});
