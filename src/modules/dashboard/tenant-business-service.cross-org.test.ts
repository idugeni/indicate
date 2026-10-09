import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

function actor(overrides: Record<string, unknown> = {}) {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set<string>(['article.read']),
    platformPermissionSet: new Set<string>(),
    regionScopeId: null,
    entryPoint: 'dashboard',
    requestId: 'cross-org-test',
    ...overrides,
  };
}

function serviceWithRepository(repository: Record<string, unknown>) {
  return new TenantBusinessService(repository as never, { create: () => 'generated-id' });
}

describe('TenantBusinessService cross-organization editorial boundary', () => {
  it('denies tenant actors without the platform super-admin grant before querying cross-org data', async () => {
    const readCrossOrgEditorialScope = vi.fn(async () => ({
      articles: [],
      articlesNextCursor: null,
      total: 0,
    }));
    const recordDenied = vi.fn(async () => undefined);
    const service = serviceWithRepository({ readCrossOrgEditorialScope, recordDenied });

    const result = await service.listCrossOrgEditorial(actor(), {});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected denial');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(readCrossOrgEditorialScope).not.toHaveBeenCalled();
    expect(recordDenied).toHaveBeenCalled();
  });

  it('denies a platform super-admin actor with a region restriction', async () => {
    const readCrossOrgEditorialScope = vi.fn(async () => ({
      articles: [],
      articlesNextCursor: null,
      total: 0,
    }));
    const recordDenied = vi.fn(async () => undefined);
    const service = serviceWithRepository({ readCrossOrgEditorialScope, recordDenied });

    const result = await service.listCrossOrgEditorial(
      actor({
        platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.superAdmin]),
        regionScopeId: 'region-restricted',
      }),
      {},
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected denial');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(readCrossOrgEditorialScope).not.toHaveBeenCalled();
    expect(recordDenied).toHaveBeenCalled();
  });

  it('allows only an unrestricted platform super-admin through to the repository', async () => {
    const scope = {
      articles: [{ id: 'article-1', organizationId: 'org-2' }],
      articlesNextCursor: 'next-page',
      total: 1,
    };
    const readCrossOrgEditorialScope = vi.fn(async () => scope);
    const service = serviceWithRepository({ readCrossOrgEditorialScope });

    const result = await service.listCrossOrgEditorial(
      actor({ platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.superAdmin]) }),
      { limit: 25 },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(readCrossOrgEditorialScope).toHaveBeenCalledWith(
      expect.objectContaining({ platformPermissionSet: expect.any(Set) }),
      { limit: 25 },
      { limit: 25 },
    );
    expect(result.value.articles).toEqual(scope.articles);
    expect(result.value.articlesNextCursor).toBe('next-page');
  });
});
