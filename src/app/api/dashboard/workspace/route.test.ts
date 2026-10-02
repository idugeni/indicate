import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { GET, responseStatus } from '@/app/api/dashboard/workspace/route';

const shared = vi.hoisted(() => ({
  orgId: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0',
  editorialCalls: [] as unknown[][],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
  }),
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({ bootstrap: {}, config: {} }),
}));

vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: () => ({ db: {} }) }));

vi.mock('@/modules/auth/authenticate-dashboard', () => ({
  authenticateDashboardUser: async () => ({
    authUserId: '22222222-2222-4222-8222-222222222222',
    localUserId: '11111111-1111-4111-8111-111111111111',
    avatarUrl: null,
    accessKey: {
      actor: {
        actorType: 'user',
        actorId: '11111111-1111-4111-8111-111111111111',
        verifiedAuthUserId: '22222222-2222-4222-8222-222222222222',
        organizationId: shared.orgId,
        permissionSet: new Set(['article.read']),
        platformPermissionSet: new Set<string>(),
        entryPoint: 'dashboard',
        requestId: 'proof',
      },
    },
  }),
  authorizeDashboardOrganization: async () => null,
}));

vi.mock('@/modules/dashboard/tenant-business-service', () => ({
  TenantBusinessService: class {
    listEditorial = async (...args: unknown[]) => {
      shared.editorialCalls.push(args);
      return {
        ok: true,
        value: { articles: [], articlesNextCursor: null, total: 0, tagOptions: [] },
      };
    };
  },
}));

vi.mock('@/modules/dashboard/dashboard-dal', () => ({
  fetchCachedDashboard: async () => ({ ok: true, value: {} }),
  fetchCachedAnalytics: async () => ({ ok: true, value: {} }),
  NextDashboardCacheInvalidator: class {},
}));

vi.mock('@/modules/delivery', () => ({
  deliveryOperationsComposition: async () => ({}),
}));

vi.mock('@/modules/ai/ai-embeddings', () => ({
  reindexArticleEmbeddings: async () => ({ ok: true, chunks: 0, embedded: 0 }),
}));

function workspaceRequest(view: string, extra = ''): Request {
  return new Request(
    `http://localhost/api/dashboard/workspace?organizationId=${shared.orgId}&view=${view}${extra}`,
    { headers: { host: 'localhost' } },
  );
}

describe('workspace responseStatus', () => {
  it('memetakan denial non-disclosing ke 404', () => {
    expect(responseStatus(createNonDisclosingDenial('req-1'))).toBe(404);
  });

  it('memetakan input dan konflik domain', () => {
    expect(responseStatus(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(responseStatus(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
  });

  it('memetakan forbidden langganan ke 403 dan cooldown ke 429', () => {
    expect(responseStatus(createPublicError('FORBIDDEN', 'x', 'req-1'))).toBe(403);
    expect(responseStatus(createPublicError('RATE_LIMITED', 'x', 'req-1'))).toBe(429);
  });

  it('memetakan dependency ke 503 dan sisanya ke 500', () => {
    expect(responseStatus(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
    expect(responseStatus(createPublicError('INTERNAL_ERROR', 'x', 'req-1'))).toBe(500);
  });
});

describe('workspace editorial views', () => {
  beforeEach(() => {
    shared.editorialCalls.length = 0;
  });

  it('tampilan published memakai publicationState=published saat tak disebut', async () => {
    const response = await GET(workspaceRequest('published'));
    expect(response.status).toBe(200);
    expect(shared.editorialCalls).toHaveLength(1);
    expect(shared.editorialCalls[0]?.[1]).toMatchObject({ publicationState: 'published' });
  });

  it('tampilan published menghormati publicationState eksplisit', async () => {
    const response = await GET(workspaceRequest('published', '&publicationState=failed'));
    expect(response.status).toBe(200);
    expect(shared.editorialCalls).toHaveLength(1);
    expect(shared.editorialCalls[0]?.[1]).toMatchObject({ publicationState: 'failed' });
  });

  it('tampilan editorial memaksa limit nol tanpa daftar artikel', async () => {
    const response = await GET(workspaceRequest('editorial'));
    expect(response.status).toBe(200);
    expect(shared.editorialCalls).toHaveLength(1);
    expect(shared.editorialCalls[0]?.[1]).toMatchObject({ limit: 0 });
  });
});
