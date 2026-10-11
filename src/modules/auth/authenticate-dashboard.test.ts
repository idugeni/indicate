import { describe, expect, it, vi } from 'vitest';

import {
  authenticateDashboardUser,
  authorizeDashboardOrganization,
  authorizeDashboardPlatform,
  type DashboardUser,
} from '@/modules/auth/authenticate-dashboard';
import type { ResolvedAccessKeyActor } from '@/modules/auth/dashboard-access-keys/resolve-access-key-actor';
import type { LocalUserIdentity, MembershipAuthorization } from '@/modules/auth/rbac';

const shared = vi.hoisted(() => ({
  session: true,
  bearer: true,
  membership: true,
  orgId: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0',
  otherOrgId: '88888888-8888-4888-8888-888888888888',
  userId: '11111111-1111-4111-8111-111111111111',
  authUserId: '22222222-2222-4222-8222-222222222222',
  platformPermissions: [] as string[],
  accessibleOrganizations: [{ id: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0', name: 'Proof Org' }],
}));

type Db = Parameters<typeof authenticateDashboardUser>[0];
type Store = Parameters<typeof authenticateDashboardUser>[1];

function proofMembership(): MembershipAuthorization {
  return {
    organizationId: shared.orgId,
    userId: shared.userId,
    roleId: 'role-1',
    status: 'active',
    roleActive: true,
    roleTier: 'admin',
    regionId: null,
    orgPermissions: new Set(['sites.manage']),
    platformPermissions: new Set(shared.platformPermissions),
  };
}

function proofResolved(): ResolvedAccessKeyActor {
  const membership = proofMembership();
  const localUser: LocalUserIdentity = {
    id: shared.userId,
    authUserId: shared.authUserId,
    displayName: 'Proof',
    avatarUrl: null,
    status: 'active',
  };
  return {
    actor: {
      actorType: 'user',
      actorId: shared.userId,
      verifiedAuthUserId: shared.authUserId,
      organizationId: shared.orgId,
      permissionSet: new Set(membership.orgPermissions),
      platformPermissionSet: new Set(shared.platformPermissions.includes('platform.super_admin')
        ? ['platform.super_admin', 'platform.customer.admin', 'platform.content.manage', 'platform.ai.manage', 'platform.runtime_config.manage']
        : membership.platformPermissions),
      regionScopeId: null,
      entryPoint: 'dashboard',
      requestId: 'proof',
    },
    membership,
    localUser,
    identity: {
      organizationId: shared.orgId,
      keyId: 'key-1',
      userId: shared.userId,
      authUserId: shared.authUserId,
      displayName: 'Proof',
      avatarUrl: null,
      userStatus: 'active',
      keyStatus: 'active',
      expiresAt: null,
      lastUsedAt: null,
      salt: 'salt',
      verificationHash: 'hash',
      membershipStatus: 'active',
      roleId: 'role-1',
      roleTier: 'admin',
      roleActive: true,
    },
    displayName: 'Proof',
    avatarUrl: null,
    keyId: 'key-1',
  };
}

vi.mock('@/core/config/public-config', () => ({
  getPublicConfig: () => ({
    supabaseUrl: 'https://proof.supabase.co',
    supabasePublishableKey: 'proof-key',
  }),
}));

vi.mock('@/integrations/supabase/supabase-ssr', () => ({
  createSupabaseSsrAuthAdapter: () => ({
    verifyCookieSession: async () =>
      shared.session
        ? { authUserId: shared.authUserId, avatarUrl: null }
        : null,
  }),
  createHardenedSupabaseCookieStore: (options: { getAll: () => unknown }) => ({
    ...options,
    set: () => {},
  }),
}));

vi.mock('@/modules/auth/resolve-authenticated-user', () => ({
  resolveVerifiedLocalUser: async () => ({
    ok: true,
    value: { id: shared.userId, status: 'active' },
  }),
}));

vi.mock('@/data/repos/tenancy/authorization', () => ({
  DrizzleAuthorizationRepository: class {
    findActiveMembership = async (organizationId: string) =>
      shared.membership && organizationId === shared.orgId ? proofMembership() : null;
    listPlatformPermissions = async () => shared.platformPermissions;
    listActiveOrganizationsForUser = async () => shared.accessibleOrganizations;
  },
}));

vi.mock('@/modules/auth/dashboard-access-keys/resolve-access-key-actor', () => ({
  resolveAccessKeyActor: async (db: unknown, bearer: string) =>
    shared.bearer && bearer === 'proof-bearer' ? proofResolved() : null,
}));

function proofStore(): Store {
  return {
    get: (name: string) =>
      name === 'indicate-access-key' && shared.bearer ? { value: 'proof-bearer' } : undefined,
    getAll: () => [],
    set: () => {},
  } as unknown as Store;
}

describe('authenticate-dashboard', () => {
  it('mengenali login sesi biasa', async () => {
    shared.session = true;
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-1')) as DashboardUser | null;
    expect(user?.authUserId).toBe(shared.authUserId);
    expect(user?.localUserId).toBe(shared.userId);
    expect(user?.accessKey).toBeNull();
  });

  it('mengenali login langsung lewat tautan access-key', async () => {
    shared.session = false;
    shared.bearer = true;
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-1')) as DashboardUser | null;
    expect(user?.localUserId).toBe(shared.userId);
    expect(user?.accessKey?.keyId).toBe('key-1');
  });

  it('menolak bila kedua kondisi absen', async () => {
    shared.session = false;
    shared.bearer = false;
    const user = await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-1');
    expect(user).toBeNull();
  });

  it('mengikat sesi ke organisasi lewat membership hidup', async () => {
    shared.session = true;
    shared.membership = true;
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-1')) as DashboardUser;
    const actor = await authorizeDashboardOrganization(
      {} as unknown as Db,
      user,
      shared.orgId,
      'req-1',
    );
    expect(actor?.organizationId).toBe(shared.orgId);
    expect(actor?.permissionSet.has('sites.manage')).toBe(true);
  });

  it('menolak sesi tanpa membership', async () => {
    shared.session = true;
    shared.membership = false;
    shared.platformPermissions = [];
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-1')) as DashboardUser;
    const actor = await authorizeDashboardOrganization(
      {} as unknown as Db,
      user,
      shared.orgId,
      'req-1',
    );
    expect(actor).toBeNull();
    shared.membership = true;
    shared.platformPermissions = ['platform.customer.admin'];
  });

  it('memberi platform super-admin semua izin tenant walau ia juga punya membership lokal', async () => {
    shared.session = true;
    shared.membership = true;
    shared.platformPermissions = ['platform.super_admin'];
    shared.accessibleOrganizations = [{ id: shared.orgId, name: 'Proof Org' }];
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-superadmin-local')) as DashboardUser;
    const actor = await authorizeDashboardOrganization({} as unknown as Db, user, shared.orgId, 'req-superadmin-local');
    expect(actor?.permissionSet.has('article.manage')).toBe(true);
    expect(actor?.regionScopeId).toBeNull();
    shared.membership = true;
    shared.platformPermissions = [];
  });

  it('memberi platform super-admin akses tenant tanpa membership setelah memverifikasi organisasi', async () => {
    shared.session = true;
    shared.membership = false;
    shared.platformPermissions = ['platform.super_admin'];
    shared.accessibleOrganizations = [
      { id: shared.orgId, name: 'Proof Org' },
      { id: shared.otherOrgId, name: 'Other Org' },
    ];
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-cross-org')) as DashboardUser;
    const actor = await authorizeDashboardOrganization({} as unknown as Db, user, shared.otherOrgId, 'req-cross-org');
    expect(actor?.organizationId).toBe(shared.otherOrgId);
    expect(actor?.regionScopeId).toBeNull();
    expect(actor?.permissionSet.has('article.manage')).toBe(true);
    expect(actor?.platformPermissionSet?.has('platform.super_admin')).toBe(true);
    shared.membership = true;
    shared.platformPermissions = ['platform.customer.admin'];
    shared.accessibleOrganizations = [{ id: shared.orgId, name: 'Proof Org' }];
  });

  it('tidak memperluas grant customer-admin lama menjadi akses tenant lintas organisasi', async () => {
    shared.session = true;
    shared.membership = false;
    shared.platformPermissions = ['platform.customer.admin'];
    shared.accessibleOrganizations = [
      { id: shared.orgId, name: 'Proof Org' },
      { id: shared.otherOrgId, name: 'Other Org' },
    ];
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-legacy-admin')) as DashboardUser;
    const actor = await authorizeDashboardOrganization({} as unknown as Db, user, shared.otherOrgId, 'req-legacy-admin');
    expect(actor).toBeNull();
    shared.membership = true;
    shared.platformPermissions = [];
    shared.accessibleOrganizations = [{ id: shared.orgId, name: 'Proof Org' }];
  });

  it('mengikat access-key hanya ke organisasi penerbit', async () => {
    shared.session = false;
    shared.bearer = true;
    const user = (await authenticateDashboardUser({} as unknown as Db, proofStore(), 'req-1')) as DashboardUser;
    const matched = await authorizeDashboardOrganization(
      {} as unknown as Db,
      user,
      shared.orgId,
      'req-1',
    );
    expect(matched?.organizationId).toBe(shared.orgId);
    const foreign = await authorizeDashboardOrganization(
      {} as unknown as Db,
      user,
      shared.otherOrgId,
      'req-1',
    );
    expect(foreign).toBeNull();
  });

  it('membangun aktor platform dari grant terverifikasi pada sesi dan access key', async () => {
    shared.session = true;
    shared.platformPermissions = ['platform.customer.admin'];
    const sessionUser = (await authenticateDashboardUser(
      {} as unknown as Db,
      proofStore(),
      'req-1',
    )) as DashboardUser;
    const sessionActor = await authorizeDashboardPlatform({} as unknown as Db, sessionUser, 'req-1');
    expect(sessionActor?.platformPermissionSet?.has('platform.customer.admin')).toBe(true);
    shared.session = false;
    shared.bearer = true;
    const keyUser = (await authenticateDashboardUser(
      {} as unknown as Db,
      proofStore(),
      'req-1',
    )) as DashboardUser;
    const keyActor = await authorizeDashboardPlatform(
      {} as unknown as Db,
      keyUser,
      'req-1',
      shared.orgId,
    );
    expect(keyActor?.platformPermissionSet?.has('platform.customer.admin')).toBe(true);
    expect(keyActor?.organizationId).toBeNull();
    const foreign = await authorizeDashboardPlatform(
      {} as unknown as Db,
      keyUser,
      'req-1',
      shared.otherOrgId,
    );
    expect(foreign?.platformPermissionSet?.has('platform.customer.admin')).toBe(true);
    shared.session = true;
    shared.platformPermissions = [];
  });

  it('memperluas superadmin access key ke seluruh grant platform terdaftar', async () => {
    shared.session = false;
    shared.bearer = true;
    shared.platformPermissions = ['platform.super_admin'];
    const user = (await authenticateDashboardUser(
      {} as unknown as Db,
      proofStore(),
      'req-platform-superadmin',
    )) as DashboardUser;
    const actor = await authorizeDashboardPlatform(
      {} as unknown as Db,
      user,
      'req-platform-superadmin',
    );
    expect(actor?.platformPermissionSet?.has('platform.customer.admin')).toBe(true);
    expect(actor?.platformPermissionSet?.has('platform.content.manage')).toBe(true);
    expect(actor?.platformPermissionSet?.has('platform.ai.manage')).toBe(true);
    expect(actor?.platformPermissionSet?.has('platform.runtime_config.manage')).toBe(true);
    shared.session = true;
    shared.platformPermissions = [];
  });

  it('menolak access key tenant biasa untuk endpoint platform tanpa grant platform', async () => {
    shared.session = false;
    shared.bearer = true;
    shared.platformPermissions = [];
    const user = (await authenticateDashboardUser(
      {} as unknown as Db,
      proofStore(),
      'req-ordinary-platform-denied',
    )) as DashboardUser;
    const actor = await authorizeDashboardPlatform(
      {} as unknown as Db,
      user,
      'req-ordinary-platform-denied',
    );
    expect(actor).toBeNull();
    shared.session = true;
  });

  it('memberi access key superadmin akses tenant lintas organisasi dan tetap membatasi key biasa', async () => {
    shared.session = false;
    shared.bearer = true;
    shared.platformPermissions = ['platform.super_admin'];
    shared.accessibleOrganizations = [
      { id: shared.orgId, name: 'Proof Org' },
      { id: shared.otherOrgId, name: 'Other Org' },
    ];
    const user = (await authenticateDashboardUser(
      {} as unknown as Db,
      proofStore(),
      'req-key-superadmin',
    )) as DashboardUser;
    const actor = await authorizeDashboardOrganization(
      {} as unknown as Db,
      user,
      shared.otherOrgId,
      'req-key-superadmin',
    );
    expect(actor?.organizationId).toBe(shared.otherOrgId);
    expect(actor?.permissionSet.has('article.manage')).toBe(true);
    expect(actor?.platformPermissionSet?.has('platform.super_admin')).toBe(true);

    shared.platformPermissions = [];
    const ordinaryUser = (await authenticateDashboardUser(
      {} as unknown as Db,
      proofStore(),
      'req-key-tenant',
    )) as DashboardUser;
    const denied = await authorizeDashboardOrganization(
      {} as unknown as Db,
      ordinaryUser,
      shared.otherOrgId,
      'req-key-tenant',
    );
    expect(denied).toBeNull();
    shared.session = true;
    shared.platformPermissions = [];
    shared.accessibleOrganizations = [{ id: shared.orgId, name: 'Proof Org' }];
  });
});
