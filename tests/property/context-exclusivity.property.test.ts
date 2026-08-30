import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { resolveOperationContext } from '@/application/context/context-policy';
import type { ActorContext, HostnameContext } from '@/domain/context/operation-context';
import { assertProperty } from '../helpers/property';

const identifier = fc.uuid();
const actorBase = {
  actorId: identifier,
  organizationId: fc.option(identifier, { nil: null }),
  permissionSet: fc.array(fc.string({ minLength: 1, maxLength: 32 }), { maxLength: 8 }).map((values) => new Set(values)),
  entryPoint: fc.constantFrom('cms', 'api', 'telegram', 'worker', 'reconciler'),
  requestId: identifier,
};
const actorArbitrary: fc.Arbitrary<ActorContext> = fc.oneof(
  fc.record({ ...actorBase, actorType: fc.constant('user' as const), verifiedAuthUserId: identifier }),
  fc.record({ ...actorBase, actorType: fc.constantFrom('api_key' as const, 'telegram' as const, 'system' as const) }),
);
const hostnameArbitrary: fc.Arbitrary<HostnameContext> = fc.record({
  normalizedHostname: fc.domain(),
  organizationId: identifier,
  domainId: identifier,
  siteId: identifier,
  regionId: fc.option(identifier, { nil: null }),
  routingVersion: fc.integer({ min: 0, max: 1_000_000 }),
});

// Feature: indicate-mvp, Property 1: Every operation has one valid tenant or public context
// **Validates: Requirements 1.14, 1.15**
describe('Property 1: context exclusivity', () => {
  it('accepts exactly one authorized tenant or public context and rejects every other combination', () => {
    assertProperty(
      'Property 1: Every operation has one valid tenant or public context',
      fc.property(
        fc.option(actorArbitrary, { nil: undefined }),
        fc.option(hostnameArbitrary, { nil: undefined }),
        (actor, hostname) => {
          const candidate = {
            ...(actor === undefined ? {} : { actor }),
            ...(hostname === undefined ? {} : { hostname }),
          };
          const result = resolveOperationContext(candidate);
          const expectedSuccess = (actor !== undefined && actor.organizationId !== null && hostname === undefined)
            || (actor === undefined && hostname !== undefined);
          expect(result.ok).toBe(expectedSuccess);
          if (result.ok) {
            expect(result.value.kind).toBe(actor === undefined ? 'public' : 'tenant');
          }
        },
      ),
    );
  });
});
