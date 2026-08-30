import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { AuthorizationService } from '@/application/auth/authorization-service';
import { InMemoryStage2Database } from '@/infrastructure/testing/stage2-memory';
import { assertAsyncProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 6: Tenant relationships preserve Organization coherence atomically
// **Validates: Requirements 4.12, 4.13, 4.14, 4.16, 4.17, 4.18, 4.23, 4.24, 4.26, 4.27, 4.28, 4.29, 21.5**
describe('Property 6: tenant relation coherence and atomicity', () => {
  it('mutates only matching same-organization graphs and leaves denied graphs unchanged', async () => {
    await assertAsyncProperty(
      'Property 6: Tenant relationships preserve Organization coherence atomically',
      fc.asyncProperty(
        fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(),
        fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(),
        async (organizationId, foreignOrganizationId, userId, resourceId, actorMatches, membershipActive, roleActive, permissionGranted) => {
          fc.pre(organizationId !== foreignOrganizationId);
          const database = new InMemoryStage2Database();
          database.addMembership({
            organizationId,
            userId,
            roleId: '00000000-0000-4000-8000-000000000020',
            status: membershipActive ? 'active' : 'inactive',
            roleActive,
            permissions: new Set(permissionGranted ? ['relation.update'] : []),
          });
          database.addResource('relation', resourceId, organizationId);
          const service = new AuthorizationService(database);
          const before = database.snapshot();
          const result = await service.executeAuthorizedMutation({
            actor: {
              actorType: 'user', actorId: userId, verifiedAuthUserId: userId,
              organizationId: actorMatches ? organizationId : foreignOrganizationId,
              permissionSet: new Set(), entryPoint: 'cms', requestId: 'property-6',
            },
            organizationId,
            permission: 'relation.update',
            resource: { type: 'relation', id: resourceId },
            transactionManager: database,
            audit: { action: 'relation.update', targetType: 'relation', outcome: 'succeeded' },
            mutate: async () => { database.setTenantValue(organizationId, resourceId, 'updated'); return 'updated'; },
          });
          const expected = actorMatches && membershipActive && roleActive && permissionGranted;
          expect(result.ok).toBe(expected);
          if (expected) {
            expect(database.getTenantValue(organizationId, resourceId)).toBe('updated');
            expect(database.snapshot().auditLogs).toHaveLength(1);
          } else {
            expect(database.snapshot()).toEqual(before);
          }
        },
      ),
    );
  });
});
