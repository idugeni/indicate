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
  } as const;
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
  it('fails closed when an explicitly targeted cross-org create cannot read the source editorial scope', async () => {
    const execute = vi.fn(async () => { throw new Error('local tenant write must not run'); });
    const executeForOrganization = vi.fn(async () => { throw new Error('target write must not run'); });
    const readEditorialScope = vi.fn(async () => { throw new Error('source scope unavailable'); });
    const recordDenied = vi.fn(async () => undefined);
    const service = serviceWithRepository({ execute, executeForOrganization, readEditorialScope, recordDenied });

    const result = await service.createArticle(
      actor({
        permissionSet: new Set(['article.manage']),
        platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.superAdmin]),
      }),
      {
        ownerOrganizationId: '22222222-2222-4222-8222-222222222222',
        regionId: null,
        publisherId: '11111111-1111-4111-8111-111111111111',
        categoryIds: [],
        authorId: null,
        slug: 'artikel-lintas-org',
        title: 'Artikel lintas organisasi',
        body: 'Isi artikel lintas organisasi.',
        status: 'draft',
      },
    );

    expect(result.ok).toBe(false);
    expect(readEditorialScope).toHaveBeenCalledTimes(1);
    expect(executeForOrganization).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('denies a cross-org owner override for a non-platform actor without falling back to a local write', async () => {
    const execute = vi.fn(async () => ({ id: 'local-article' }));
    const recordDenied = vi.fn(async () => undefined);
    const service = serviceWithRepository({ execute, recordDenied });

    const result = await service.createArticle(
      actor({ permissionSet: new Set(['article.manage']) }),
      {
        ownerOrganizationId: '22222222-2222-4222-8222-222222222222',
        regionId: null,
        publisherId: '11111111-1111-4111-8111-111111111111',
        slug: 'artikel-lintas-org',
        title: 'Artikel lintas organisasi',
        body: 'Isi artikel lintas organisasi.',
        status: 'draft',
      },
    );

    expect(result.ok).toBe(false);
    expect(execute).not.toHaveBeenCalled();
    expect(recordDenied).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'cross-org-test' }), 'article.create', 'article');
  });



  it('creates missing selected taxonomy and author metadata inside the destination organization', async () => {
    const PLATFORM_ORG = '10000000-0000-4000-8000-000000000001';
    const TARGET_ORG = '10000000-0000-4000-8000-000000000002';
    const SOURCE_PUBLISHER = '10000000-0000-4000-8000-000000000003';
    const SOURCE_AUTHOR = '10000000-0000-4000-8000-000000000004';
    const SOURCE_CATEGORY = '10000000-0000-4000-8000-000000000005';
    const SOURCE_REGION = '10000000-0000-4000-8000-000000000006';
    const TARGET_PUBLISHER = '10000000-0000-4000-8000-000000000007';
    const TARGET_PROVINCE = '10000000-0000-4000-8000-000000000008';
    const TARGET_CITY = '10000000-0000-4000-8000-000000000009';
    const TARGET_CATEGORY = '10000000-0000-4000-8000-000000000010';
    const TARGET_AUTHOR = '10000000-0000-4000-8000-000000000011';
    const generated = [
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000003',
    ];
    let generatedIndex = 0;
    const identifiers = { create: () => generated[generatedIndex++] ?? '40000000-0000-4000-8000-000000000099' };
    const now = '2026-10-12T08:00:00.000Z';
    const targetState = {
      organizationId: TARGET_ORG,
      organizationName: 'RUTAN KELAS II B WONOSOBO',
      domains: [],
      regions: [
        { id: TARGET_PROVINCE, organizationId: TARGET_ORG, externalKey: 'jawa-tengah', name: 'Jawa Tengah', shortName: 'Jateng', slug: 'jawa-tengah', status: 'active', kind: 'region', parentRegionId: null, version: 1, createdAt: now, updatedAt: now },
        { id: TARGET_CITY, organizationId: TARGET_ORG, externalKey: 'wonosobo', name: 'Wonosobo', shortName: null, slug: 'wonosobo', status: 'active', kind: 'city', parentRegionId: TARGET_PROVINCE, version: 1, createdAt: now, updatedAt: now },
      ],
      sites: [],
      siteSettings: [],
      roles: [],
      memberships: [],
      publishers: [
        { id: TARGET_PUBLISHER, organizationId: TARGET_ORG, name: 'RUTAN KELAS II B WONOSOBO', status: 'active', version: 1, createdAt: now, updatedAt: now },
      ],
      affiliations: [],
      categories: [
        { id: TARGET_CATEGORY, organizationId: TARGET_ORG, name: 'Berita', slug: 'berita', status: 'active', version: 1, createdAt: now, updatedAt: now },
      ],
      authors: [
        { id: TARGET_AUTHOR, organizationId: TARGET_ORG, displayName: 'Redaksi', byline: 'Tim Redaksi', status: 'active', version: 1, createdAt: now, updatedAt: now },
      ],
      articles: [],
      articleCategories: [],
      articleSites: [],
      media: [],
      publishingJobs: [],
    };
    const audits: unknown[] = [];
    const transaction = {
      state: targetState,
      appendAudit: (event: unknown) => audits.push(event),
      resolveUserDisplayName: async () => 'Administrator Platform',
      refreshArticleContent: async () => false,
      articleContentTouched: new Set<string>(),
    };
    const readEditorialScope = vi.fn(async () => ({
      publishers: [{ id: SOURCE_PUBLISHER, name: 'RUTAN KELAS II B WONOSOBO', status: 'active' }],
      categories: [{ id: SOURCE_CATEGORY, name: 'Keamanan dan Ketertiban', slug: 'keamanan-dan-ketertiban', status: 'active' }],
      authors: [{ id: SOURCE_AUTHOR, displayName: 'Humas Rutan', byline: 'Humas Rutan Wonosobo', status: 'active' }],
      regions: [{ id: SOURCE_REGION, name: 'Wonosobo', slug: 'wonosobo', status: 'active' }],
    }));
    const execute = vi.fn(async () => { throw new Error('cross-org write must not use active org'); });
    const findOrganizationBySlug = vi.fn(async (_ownerActor: unknown, slug: string) => {
      expect(slug).toBe('rutan-kelas-ii-b-wonosobo');
      return TARGET_ORG;
    });
    const executeForOrganization = vi.fn(async (_ownerActor: unknown, ownerId: string, operation: (tx: unknown) => unknown) => {
      expect(ownerId).toBe(TARGET_ORG);
      return operation(transaction);
    });
    const service = new TenantBusinessService({
      readEditorialScope,
      findOrganizationBySlug,
      execute,
      executeForOrganization,
    } as never, identifiers);

    const result = await service.createArticle(
      actor({
        organizationId: PLATFORM_ORG,
        permissionSet: new Set(['article.read', 'article.manage']),
        platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.superAdmin]),
      }),
      {
        ownerOrganizationId: TARGET_ORG,
        regionId: SOURCE_REGION,
        publisherId: SOURCE_PUBLISHER,
        categoryIds: [SOURCE_CATEGORY],
        authorId: SOURCE_AUTHOR,
        slug: 'pengamanan-blok-hunian',
        title: 'Pengamanan Blok Hunian Rutan Wonosobo',
        body: 'Petugas melaksanakan pengamanan blok hunian secara teratur.',
        source: 'Humas Rutan Wonosobo',
        status: 'draft',
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(execute).not.toHaveBeenCalled();
    expect(executeForOrganization).toHaveBeenCalledTimes(1);
    expect(result.value.organizationId).toBe(TARGET_ORG);
    expect(result.value.publisherId).toBe(TARGET_PUBLISHER);
    expect(result.value.regionId).toBe(TARGET_CITY);
    expect(result.value.categoryIds).toHaveLength(1);
    expect(result.value.categoryIds[0]).toBe(generated[0]);
    expect(result.value.authorId).toBe(generated[1]);
    expect(targetState.categories).toContainEqual(expect.objectContaining({
      id: generated[0],
      organizationId: TARGET_ORG,
      name: 'Keamanan dan Ketertiban',
      slug: 'keamanan-dan-ketertiban',
    }));
    expect(targetState.authors).toContainEqual(expect.objectContaining({
      id: generated[1],
      organizationId: TARGET_ORG,
      displayName: 'Humas Rutan',
      byline: 'Humas Rutan Wonosobo',
    }));
    expect(audits).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'category.create', targetType: 'category' }),
      expect.objectContaining({ action: 'author.create', targetType: 'author' }),
      expect.objectContaining({ action: 'article.create', targetType: 'article' }),
    ]));
  });

});
