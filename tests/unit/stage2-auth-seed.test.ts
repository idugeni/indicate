import { describe, expect, it } from 'vitest';

import { ActiveOrganizationService } from '@/application/auth/active-organization-service';
import { AuthorizationService } from '@/application/auth/authorization-service';
import { resolveAuthenticatedUser, resolveVerifiedLocalUser, resolveVerifiedUserOrganizations } from '@/application/auth/resolve-authenticated-user';
import { checkSchemaVersion } from '@/application/deployment/schema-gate';
import { reconcileMvpSeed, SeedExecutionError, SeedValidationError } from '@/application/seed/reconcile-mvp-seed';
import type { ActorContext } from '@/domain/context/operation-context';
import { InMemoryActiveOrganizationStore, InMemoryStage2Database } from '@/infrastructure/testing/stage2-memory';

const ids = {
  index: 0,
  create() { this.index += 1; return `00000000-0000-4000-8000-${String(this.index).padStart(12, '0')}`; },
};

function actor(organizationId: string | null = '00000000-0000-4000-8000-000000000001'): ActorContext {
  return {
    actorType: 'user',
    actorId: '00000000-0000-4000-8000-000000000010',
    verifiedAuthUserId: '00000000-0000-4000-8000-000000000099',
    organizationId,
    permissionSet: new Set(),
    entryPoint: 'cms',
    requestId: 'request-stage2',
  };
}

describe('Stage 2 authentication and tenant authorization', () => {
  it('links one local user to a verified Supabase Auth identity', async () => {
    const database = new InMemoryStage2Database();
    const auth = {
      async verifySession(token: string) {
        return token === 'valid' ? { authUserId: '00000000-0000-4000-8000-000000000099', displayName: 'Editor' } : null;
      },
      async check() { return { service: 'fake-auth', status: 'healthy' as const }; },
    };
    const first = await resolveAuthenticatedUser('valid', auth, database, ids);
    const second = await resolveAuthenticatedUser('valid', auth, database, ids);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(database.snapshot().users).toHaveLength(1);
    expect(await resolveAuthenticatedUser('', auth, database, ids)).toEqual({ ok: false, error: 'UNAUTHENTICATED' });
  });

  it('discovers organizations from the verified Auth identity instead of a caller-supplied local User ID', async () => {
    const database = new InMemoryStage2Database();
    const verifiedAuthUserId = '00000000-0000-4000-8000-000000000099';
    const localUserId = '00000000-0000-4000-8000-000000000010';
    database.addUser({ id: localUserId, authUserId: verifiedAuthUserId, displayName: 'Editor', status: 'active' });
    database.addUser({ id: '00000000-0000-4000-8000-000000000011', authUserId: '00000000-0000-4000-8000-000000000098', displayName: 'Foreign', status: 'active' });
    database.addMembership({ organizationId: '00000000-0000-4000-8000-000000000001', userId: localUserId, roleId: '00000000-0000-4000-8000-000000000020', status: 'active', roleActive: true, permissions: new Set() });
    database.addMembership({ organizationId: '00000000-0000-4000-8000-000000000002', userId: '00000000-0000-4000-8000-000000000011', roleId: '00000000-0000-4000-8000-000000000021', status: 'active', roleActive: true, permissions: new Set() });

    const result = await resolveVerifiedUserOrganizations(
      { authUserId: verifiedAuthUserId, displayName: 'Editor' }, database, ids,
    );

    expect(result).toMatchObject({ ok: true, value: { localUser: { id: localUserId }, organizations: [{ id: '00000000-0000-4000-8000-000000000001' }] } });
  });

  it('rejects an inactive local user after the Supabase identity is verified', async () => {
    const database = new InMemoryStage2Database();
    const authUserId = '00000000-0000-4000-8000-000000000098';
    database.addUser({
      id: '00000000-0000-4000-8000-000000000018',
      authUserId,
      displayName: 'Inactive Editor',
      status: 'inactive',
    });
    await expect(resolveVerifiedLocalUser(
      { authUserId, displayName: 'Inactive Editor' },
      database,
      ids,
    )).resolves.toEqual({ ok: false, error: 'IDENTITY_UNAVAILABLE' });
  });

  it('authorizes only persisted non-user scopes and claimed-job permissions', async () => {
    const database = new InMemoryStage2Database();
    const organizationId = actor().organizationId!;
    const apiKeyId = '00000000-0000-4000-8000-000000000015';
    const jobId = '00000000-0000-4000-8000-000000000016';
    database.addActorAuthorization('api_key', {
      organizationId, actorId: apiKeyId, permissions: new Set(['site.read']),
    });
    database.addActorAuthorization('system', {
      organizationId, actorId: jobId, permissions: new Set(['publishing.process']),
    });
    const service = new AuthorizationService(database);
    await expect(service.authorize({
      actorType: 'api_key', actorId: apiKeyId, organizationId, entryPoint: 'api', requestId: 'request-stage2',
      permissionSet: new Set(['membership.manage']),
    }, organizationId, 'site.read')).resolves.toMatchObject({ ok: true });
    await expect(service.authorize({
      actorType: 'api_key', actorId: apiKeyId, organizationId, entryPoint: 'api', requestId: 'request-stage2',
      permissionSet: new Set(['membership.manage']),
    }, organizationId, 'membership.manage')).resolves.toMatchObject({ ok: false });
    await expect(service.authorize({
      actorType: 'system', actorId: jobId, organizationId, entryPoint: 'worker', requestId: 'request-stage2', permissionSet: new Set(),
    }, organizationId, 'publishing.process')).resolves.toMatchObject({ ok: true });
  });

  it('clears prior tenant state and re-evaluates membership on organization switch', async () => {
    const database = new InMemoryStage2Database();
    const store = new InMemoryActiveOrganizationStore();
    const organizationId = '00000000-0000-4000-8000-000000000001';
    database.addMembership({
      organizationId,
      userId: actor().actorId,
      roleId: '00000000-0000-4000-8000-000000000020',
      status: 'active',
      roleActive: true,
      permissions: new Set(['domain.read']),
    });
    const service = new ActiveOrganizationService(database, store);
    const result = await service.switchOrganization(actor(null), organizationId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.actor.organizationId).toBe(organizationId);
      expect(result.value.state.generation).toBe(1);
    }
    expect(store.clearedOrganizations).toEqual([null]);
    const denied = await service.switchOrganization(actor(null), '00000000-0000-4000-8000-000000000002');
    expect(denied.ok).toBe(false);
    expect(store.clearedOrganizations).toEqual([null]);
  });

  it('denies unavailable Membership and Role targets without a success audit', async () => {
    const database = new InMemoryStage2Database();
    const organizationId = actor().organizationId!;
    const foreignOrganizationId = '00000000-0000-4000-8000-000000000002';
    const unavailableUserId = '00000000-0000-4000-8000-000000000011';
    const unavailableRoleId = '00000000-0000-4000-8000-000000000021';
    database.addMembership({
      organizationId,
      userId: actor().actorId,
      roleId: '00000000-0000-4000-8000-000000000020',
      status: 'active',
      roleActive: true,
      permissions: new Set(['membership.manage']),
    });
    database.addMembership({
      organizationId: foreignOrganizationId,
      userId: unavailableUserId,
      roleId: unavailableRoleId,
      status: 'active',
      roleActive: true,
      permissions: new Set(),
    });
    database.addResource('role', unavailableRoleId, foreignOrganizationId);
    const service = new AuthorizationService(database);
    const missingMembership = await service.changeMembershipRole({
      actor: actor(), organizationId, userId: unavailableUserId,
      roleId: '00000000-0000-4000-8000-000000000020', transactionManager: database,
    });
    database.addMembership({
      organizationId,
      userId: unavailableUserId,
      roleId: '00000000-0000-4000-8000-000000000020',
      status: 'active',
      roleActive: true,
      permissions: new Set(),
    });
    const crossOrganizationRole = await service.changeMembershipRole({
      actor: actor(), organizationId, userId: unavailableUserId,
      roleId: unavailableRoleId, transactionManager: database,
    });
    expect(missingMembership).toEqual(crossOrganizationRole);
    expect(missingMembership.ok).toBe(false);
    expect(database.snapshot().auditLogs).toHaveLength(0);
  });

  it('rolls a mutation back when its required audit append fails', async () => {
    const database = new InMemoryStage2Database();
    const organizationId = actor().organizationId!;
    database.addMembership({
      organizationId,
      userId: actor().actorId,
      roleId: '00000000-0000-4000-8000-000000000020',
      status: 'active',
      roleActive: true,
      permissions: new Set(['domain.update']),
    });
    database.addResource('domain', '00000000-0000-4000-8000-000000000030', organizationId);
    database.failAudit = true;
    const service = new AuthorizationService(database);
    await expect(service.executeAuthorizedMutation({
      actor: actor(),
      organizationId,
      permission: 'domain.update',
      resource: { type: 'domain', id: '00000000-0000-4000-8000-000000000030' },
      transactionManager: database,
      audit: { action: 'domain.update', targetType: 'domain', outcome: 'succeeded' },
      mutate: (transaction) => transaction.changeMembershipRole({
        userId: actor().actorId,
        roleId: '00000000-0000-4000-8000-000000000099',
      }),
    })).rejects.toThrow('Injected audit failure');
    expect(database.snapshot().memberships[0]?.roleId).toBe('00000000-0000-4000-8000-000000000020');
    expect(database.snapshot().auditLogs).toHaveLength(0);
  });
});

describe('Stage 2 seed and migration gates', () => {
  it('reconciles exactly three roots and initial regions idempotently', async () => {
    const database = new InMemoryStage2Database();
    const input = {
      organizationId: '00000000-0000-4000-8000-000000000001',
      rootHostnames: ['one.example.web.id', 'two.example.web.id', 'three.example.web.id'],
      reservedHostnames: new Set(['indicate.web.id']),
    };
    expect(await reconcileMvpSeed(input, database, ids)).toMatchObject({ created: 6, updated: 0, unchanged: 0, failed: 0 });
    const stable = database.snapshot();
    expect(await reconcileMvpSeed(input, database, ids)).toMatchObject({ created: 0, updated: 0, unchanged: 6, failed: 0 });
    expect(database.snapshot().domains.map(({ id }) => id)).toEqual(stable.domains.map(({ id }) => id));
    expect(database.snapshot().regions.map(({ id }) => id)).toEqual(stable.regions.map(({ id }) => id));
  });

  it('rejects invalid seed input before mutation', async () => {
    const database = new InMemoryStage2Database();
    await expect(reconcileMvpSeed({
      organizationId: 'org',
      rootHostnames: ['duplicate.web.id', 'DUPLICATE.web.id.', 'bad'],
      reservedHostnames: new Set(),
    }, database, ids)).rejects.toBeInstanceOf(SeedValidationError);
    expect(database.snapshot().domains).toEqual([]);
  });

  it('reports deterministic failure counts after atomic seed rollback', async () => {
    const database = new InMemoryStage2Database();
    database.failSeedAfterOperations = 2;
    const operation = reconcileMvpSeed({
      organizationId: '00000000-0000-4000-8000-000000000001',
      rootHostnames: ['one.example.web.id', 'two.example.web.id', 'three.example.web.id'],
      reservedHostnames: new Set(),
    }, database, ids);
    await expect(operation).rejects.toBeInstanceOf(SeedExecutionError);
    await expect(operation).rejects.toMatchObject({ report: { created: 0, updated: 0, unchanged: 0, failed: 1 } });
    expect(database.snapshot().domains).toEqual([]);
  });

  it('fails activation when the required schema version is absent', async () => {
    await expect(checkSchemaVersion({ readCurrentVersion: async () => null })).resolves.toMatchObject({ ready: false, actualVersion: null });
    await expect(checkSchemaVersion({ readCurrentVersion: async () => 5 })).resolves.toMatchObject({ ready: false, actualVersion: 5 });
    await expect(checkSchemaVersion({ readCurrentVersion: async () => 6 })).resolves.toMatchObject({ ready: true, actualVersion: 6 });
  });
});
