import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getRuntime: vi.fn(),
  getDatabase: vi.fn(),
  authenticate: vi.fn(),
  authorizeOrg: vi.fn(),
  createArticle: vi.fn(),
  denyMutation: vi.fn(() => false),
  logEvent: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({})) }));
vi.mock('@/core/security/mutation-guard', () => ({ denyCrossSiteMutation: mocks.denyMutation }));
vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: mocks.getRuntime,
}));
vi.mock('@/core/errors', () => ({
  createNonDisclosingDenial: () => ({ error: { code: 'FORBIDDEN' } }),
  createPublicError: (code: string, message: string) => ({ error: { code, message } }),
}));
vi.mock('@/core/observability/request-id', () => ({ resolveRequestId: () => 'newsroom-test' }));
vi.mock('@/core/observability/api-access', () => ({
  withApiAccess: (_name: string, handler: unknown) => handler,
}));
vi.mock('@/core/observability/logger', () => ({ logEvent: mocks.logEvent }));
vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: mocks.getDatabase }));
vi.mock('@/data/repos/dashboard', () => ({ DrizzleDashboardRepository: class {} }));
vi.mock('@/data/repos/publishing/repository', () => ({ DrizzlePublishingRepository: class {} }));
vi.mock('@/core/system/uuid-generator', () => ({ UuidGenerator: class {} }));
vi.mock('@/modules/dashboard/tenant-business-service', () => ({
  TenantBusinessService: class {
    createArticle = mocks.createArticle;
  },
}));
vi.mock('@/modules/auth/authenticate-dashboard', () => ({
  authenticateDashboardUser: mocks.authenticate,
  authorizeDashboardOrganization: mocks.authorizeOrg,
}));
vi.mock('@/modules/publishing/media-service', () => ({ MediaService: class {} }));
vi.mock('@/integrations/storage/r2-object-storage', () => ({ R2ObjectStorageAdapter: class {} }));

import { POST } from '@/app/api/dashboard/operator/newsroom/route';

const orgId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: orgId,
  permissionSet: new Set(['article.manage']),
  platformPermissionSet: new Set(),
  requestId: 'newsroom-test',
};

function request(organizationId = orgId) {
  return new Request('https://indicate.website/api/dashboard/operator/newsroom', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'indicate.website' },
    body: JSON.stringify({
      organizationId,
      title: 'Judul berita',
      slug: 'judul-berita',
      body: 'Isi berita lengkap untuk pengujian.',
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRuntime.mockResolvedValue({
    bootstrap: {},
    config: {
      r2: {
        accountId: 'account',
        bucketName: 'private',
        publicBucketName: 'public',
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        maxBytes: 5_000_000,
        allowedTypes: ['image/webp', 'image/jpeg'],
        uploadTtlSeconds: 300,
        readTtlSeconds: 300,
      },
    },
  });
  mocks.getDatabase.mockReturnValue({});
  mocks.authenticate.mockResolvedValue({
    localUserId: 'user-1',
    authUserId: 'auth-user-1',
    accessKey: null,
  });
  mocks.authorizeOrg.mockResolvedValue(actor);
  mocks.createArticle.mockResolvedValue({
    ok: true,
    value: {
      id: 'article-1',
      organizationId: orgId,
      title: 'Judul berita',
      slug: 'judul-berita',
      status: 'draft',
      leadMediaId: null,
    },
  });
});

describe('POST /api/dashboard/operator/newsroom', () => {
  it('creates a draft through the authenticated organization context', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.authorizeOrg).toHaveBeenCalledWith(
      undefined,
      expect.anything(),
      orgId,
      'newsroom-test',
    );
    expect(mocks.createArticle).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        title: 'Judul berita',
        slug: 'judul-berita',
        ownerOrganizationId: orgId,
        status: 'draft',
        leadMediaId: null,
      }),
    );
    expect((await response.json()).article.id).toBe('article-1');
  });

  it('denies an organization context without article.manage before writing', async () => {
    mocks.authorizeOrg.mockResolvedValue({ ...actor, permissionSet: new Set(['article.read']) });
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.createArticle).not.toHaveBeenCalled();
  });

  it('requires an authenticated dashboard user', async () => {
    mocks.authenticate.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.authorizeOrg).not.toHaveBeenCalled();
  });
});
