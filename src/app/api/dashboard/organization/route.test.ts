import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authenticateDashboardUser: vi.fn(),
  authorizeDashboardOrganization: vi.fn(),
  getServerRuntimeContext: vi.fn(),
  getSharedRuntimeDatabase: vi.fn(),
  denyCrossSiteMutation: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => new Map()) }));
vi.mock('@/modules/auth/authenticate-dashboard', () => ({
  authenticateDashboardUser: mocks.authenticateDashboardUser,
  authorizeDashboardOrganization: mocks.authorizeDashboardOrganization,
}));
vi.mock('@/core/config/runtime/runtime-context', () => ({ getServerRuntimeContext: mocks.getServerRuntimeContext }));
vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: mocks.getSharedRuntimeDatabase }));
vi.mock('@/core/security/mutation-guard', () => ({ denyCrossSiteMutation: mocks.denyCrossSiteMutation }));

import { GET, POST } from '@/app/api/dashboard/organization/route';

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = { authUserId: '22222222-2222-4222-8222-222222222222', localUserId: '33333333-3333-4333-8333-333333333333', avatarUrl: null, accessKey: null };
const ACTOR = {
  actorType: 'user', actorId: USER.localUserId, verifiedAuthUserId: USER.authUserId,
  organizationId: ORG, permissionSet: new Set(['role.manage']), platformPermissionSet: new Set(),
  entryPoint: 'dashboard', requestId: 'request-test',
};
const CURRENT = {
  id: ORG, name: 'Organisasi Lama', slug: 'organisasi-lama', identityData: null, version: 4,
};

function request(url: string, method = 'GET', body?: unknown) {
  return new Request(url, {
    method,
    headers: { ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function setDatabase(current = CURRENT) {
  const updatedRows = vi.fn().mockResolvedValue([{
    id: ORG,
    name: 'Organisasi Baru',
    slug: 'organisasi-lama',
    identityData: {
        schemaVersion: 1,
        description: 'Deskripsi baru',
        logoUrl: null,
        contactDetails: { email: 'halo@contoh.id' },
        visualIdentity: { primaryColor: '#112233' },
      },
    version: current.version + 1,
  }]);
  const tx = {
    execute: vi.fn().mockResolvedValue([]),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([current]) })) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updatedRows })) })) })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
  };
  mocks.transaction.mockImplementation((callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
  mocks.getSharedRuntimeDatabase.mockReturnValue({ db: { transaction: mocks.transaction } });
  return { tx, updatedRows };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.denyCrossSiteMutation.mockReturnValue(false);
  mocks.getServerRuntimeContext.mockResolvedValue({ bootstrap: {} });
  mocks.authenticateDashboardUser.mockResolvedValue(USER);
  mocks.authorizeDashboardOrganization.mockResolvedValue(ACTOR);
  setDatabase();
});

describe('API identitas organisasi', () => {
  it('tidak mengungkap profil jika organisasi tidak dapat diotorisasi', async () => {
    mocks.authorizeDashboardOrganization.mockResolvedValue(null);
    const response = await GET(request(`https://app.test/api/dashboard/organization?organizationId=${ORG}`));
    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('memetakan kontak metadata tenant lama sebagai fallback identitas', async () => {
    setDatabase({
      ...CURRENT,
      customerMetadata: {
        phone: '(0294) 579229',
        address: 'Sopoyono, Wonosari, Kendal',
        site_url: 'https://pemasyarakatanjateng.id/satker/lapas-terbuka-kelas-ii-b-kendal',
      },
    });
    const response = await GET(request(`https://app.test/api/dashboard/organization?organizationId=${ORG}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      contactDetails: {
        phone: '(0294) 579229',
        address: 'Sopoyono, Wonosari, Kendal',
        website: 'https://pemasyarakatanjateng.id/satker/lapas-terbuka-kelas-ii-b-kendal',
      },
    });
  });

  it('menolak perubahan tanpa hak kelola peran atau anggota', async () => {
    mocks.authorizeDashboardOrganization.mockResolvedValue({ ...ACTOR, permissionSet: new Set(['article.manage']) });
    const response = await POST(request('https://app.test/api/dashboard/organization', 'POST', {
      organizationId: ORG, expectedVersion: 4, name: 'Organisasi Baru', description: '', logoUrl: null,
      contactDetails: {}, visualIdentity: {},
    }));
    expect(response.status).toBe(404);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('menyimpan profil dengan versi optimistik, audit, dan pembaruan JSONB tertarget', async () => {
    const { tx } = setDatabase();
    const response = await POST(request('https://app.test/api/dashboard/organization', 'POST', {
      organizationId: ORG,
      expectedVersion: 4,
      name: 'Organisasi Baru',
      description: 'Deskripsi baru',
      logoUrl: null,
      contactDetails: { email: 'halo@contoh.id' },
      visualIdentity: { primaryColor: '#112233' },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: 'Organisasi Baru', description: 'Deskripsi baru', version: 5 });
    const updateCall = tx.update.mock.results[0]?.value as { set: ReturnType<typeof vi.fn> };
    const setCall = updateCall.set.mock.calls[0]?.[0] as { customerMetadata: { queryChunks?: unknown[] } };
    expect(setCall.customerMetadata.queryChunks).toBeDefined();
    expect(setCall.customerMetadata.queryChunks?.length).toBeGreaterThan(0);
    expect(tx.insert).toHaveBeenCalledOnce();
  });

  it('menolak logo non-HTTPS sebelum akses database', async () => {
    const response = await POST(request('https://app.test/api/dashboard/organization', 'POST', {
      organizationId: ORG, expectedVersion: 4, name: 'Organisasi Baru', description: '', logoUrl: 'http://contoh.id/logo.png',
      contactDetails: {}, visualIdentity: {},
    }));
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
