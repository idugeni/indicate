import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { AuthorizationService } from '@/application/auth/authorization-service';
import { InMemoryStage2Database } from '@/infrastructure/testing/stage2-memory';
import { assertAsyncProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 8: RBAC permits only matching authorized combinations
// **Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.13, 6.15, 20.19, 21.21**
describe('Property 8: RBAC combinations', () => {
  it('authorizes exactly active matching tenant, role, permission, and resource combinations', async () => {
    await assertAsyncProperty(
      'Property 8: RBAC permits only matching authorized combinations',
      fc.asyncProperty(
        fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(),
        fc.constantFrom('user' as const, 'api_key' as const, 'telegram' as const),
        fc.boolean(), fc.boolean(), fc.boolean(), fc.integer({ min: 0, max: 2 }),
        async (organizationId, foreignOrganizationId, actorId, resourceId, actorType, actorActive, roleActive, permissionGranted, resourceMode) => {
          fc.pre(organizationId !== foreignOrganizationId);
          const database = new InMemoryStage2Database();
          const permissions = new Set(permissionGranted ? ['site.read'] : []);
          if (actorType === 'user') {
            database.addMembership({
              organizationId,
              userId: actorId,
              roleId: '00000000-0000-4000-8000-000000000020',
              status: actorActive ? 'active' : 'inactive',
              roleActive,
              permissions,
            });
          } else if (actorActive && (actorType === 'api_key' || roleActive)) {
            database.addActorAuthorization(actorType, { organizationId, actorId, permissions });
          }
          if (resourceMode === 1) database.addResource('site', resourceId, organizationId);
          if (resourceMode === 2) database.addResource('site', resourceId, foreignOrganizationId);
          const service = new AuthorizationService(database);
          const actor = actorType === 'user'
            ? { actorType, actorId, verifiedAuthUserId: actorId, organizationId, permissionSet: new Set(['ignored-client-claim']), entryPoint: 'cms' as const, requestId: 'property-8' }
            : { actorType, actorId, organizationId, permissionSet: new Set(['ignored-client-claim']), entryPoint: actorType === 'api_key' ? 'api' as const : 'telegram' as const, requestId: 'property-8' };
          const result = await service.authorize(actor, organizationId, 'site.read', { type: 'site', id: resourceId });
          const actorAuthorized = actorType === 'api_key'
            ? actorActive && permissionGranted
            : actorActive && roleActive && permissionGranted;
          const expected = actorAuthorized && resourceMode === 1;
          expect(result.ok).toBe(expected);
          if (!result.ok) {
            expect(result.error).toEqual({
              error: { code: 'RESOURCE_UNAVAILABLE', message: 'The requested resource is unavailable.' },
              requestId: 'property-8',
            });
          }
        },
      ),
    );
  });
});
