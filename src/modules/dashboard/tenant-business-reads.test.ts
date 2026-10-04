import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { DashboardAccessDeniedError, DashboardConflictError } from '@/modules/dashboard/ports';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID2 = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const ID3 = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID4 = '0199a2b3-4c5d-7e8f-9012-3456789abce0';
const NOW = new Date('2026-09-18T14:00:00.000Z');
const HASH = 'a'.repeat(64);

const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set(['article.read', 'article.manage', 'publisher.read', 'membership.manage']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const COLLECTIONS = [
  'domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships',
  'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleCategories', 'articleSites', 'media',
] as const;

const editorialState = {
  organizationId: 'org-1',
  organizationName: 'Org',
  regions: [{ id: 'region-1', organizationId: 'org-1', status: 'active' }],
  sites: [{ id: ID2, organizationId: 'org-1', status: 'active', activationState: 'active', regionId: null }],
  articles: [{
    id: ID, organizationId: 'org-1', regionId: 'region-1', status: 'active', title: 'Judul', body: 'Isi',
    source: 'Humas', publisherId: null, categoryId: null, authorId: null,
  }],
  categories: [],
  authors: [],
  publishers: [{ id: ID, name: 'Humas', attributionLabel: 'Humas' }],
  affiliations: [],
  articleSites: [{ articleId: ID, siteId: ID2, organizationId: 'org-1', active: true, state: 'published' }],
};

function harness(options: { readonly collections?: Record<string, readonly unknown[]>; readonly repo?: Record<string, unknown> } = {}) {
  const state: Record<string, unknown> = { organizationId: 'org-1' };
  for (const key of COLLECTIONS) state[key] = [...(options.collections?.[key] ?? [])];
  const repository = {
    execute: vi.fn(async (actor: unknown, permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit: vi.fn(), refreshArticleContent: async () => false, articleContentTouched: new Set<string>() });
    }),
    readEditorialScope: vi.fn(async () => ({
      articles: editorialState.articles,
      articlesNextCursor: null,
      total: editorialState.articles.length,
      tagOptions: [],
      articleSites: editorialState.articleSites,
      categories: [],
      authors: [],
      publishers: [],
      regions: editorialState.regions,
      sites: editorialState.sites,
      domains: [],
    })),
    readPublisherScope: vi.fn(async () => ({
      publishers: editorialState.publishers,
      affiliations: [],
      sites: editorialState.sites,
      regions: editorialState.regions,
    })),
    readPublisherClaimScope: vi.fn(async (actor: unknown, permission: unknown, publisherId: string) => {
      const publisher = (editorialState.publishers as readonly Record<string, unknown>[]).find((row) => row.id === publisherId);
      if (publisher === undefined) throw new DashboardAccessDeniedError();
      return { publisher, affiliations: [] };
    }),
    readNetworkArticlesScope: vi.fn(async () => ({
      site: (editorialState.sites as readonly Record<string, unknown>[])[0],
      articles: editorialState.articles,
      articleSites: editorialState.articleSites,
      publishers: editorialState.publishers,
      affiliations: [],
      regions: editorialState.regions,
      categoryIds: [],
      authorIds: [],
    })),
    createInvitation: vi.fn(async () => ({ id: 'invite-1' })),
    revokeInvitation: vi.fn(async () => ({ id: 'invite-1' })),
    recordDenied: vi.fn(async () => undefined),
    ...options.repo,
  };
  const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW });
  return { repository, service, state };
}

describe('TenantBusinessService editorial reads', () => {
  it('membaca editorial, jaringan, publisher, dan klaim', async () => {
    const { service } = harness();
    const editorial = await service.listEditorial(actor, {});
    expect(editorial.ok).toBe(true);

    const network = await service.listNetworkArticles(actor, ID2, {});
    expect(network.ok).toBe(true);
    if (!network.ok) throw new Error('expected ok');
    expect(network.value).toHaveLength(1);

    const publishers = await service.listPublishers(actor);
    expect(publishers.ok).toBe(true);

    const claim = await service.getPublisherClaim(actor, ID, ID2);
    expect(claim.ok).toBe(true);
  });

  it('menyertakan domain rujukan untuk pengelompokan penyaluran', async () => {
    const { service } = harness({
      repo: {
        readEditorialScope: vi.fn(async () => ({
          articles: editorialState.articles,
          articlesNextCursor: null,
          total: editorialState.articles.length,
          tagOptions: [],
          articleSites: editorialState.articleSites,
          categories: [],
          authors: [],
          publishers: [],
          regions: editorialState.regions,
          sites: [
            { id: ID2, organizationId: 'org-1', domainId: ID, regionId: null, normalizedHostname: 'wonosobo.fakta01.my.id', status: 'active' },
          ],
          domains: [
            { id: ID, organizationId: 'org-1', normalizedHostname: 'fakta01.my.id' },
            { id: ID2, organizationId: 'org-1', normalizedHostname: 'lain.id' },
          ],
        })),
      },
    });
    const editorial = await service.listEditorial(actor, {});
    expect(editorial.ok).toBe(true);
    if (!editorial.ok) throw new Error('expected ok');
    expect(editorial.value.domains).toEqual([{ id: ID, normalizedHostname: 'fakta01.my.id' }]);
  });

  it('meringkas afiliasi per klaim institusi-kota dan memfilternya', async () => {
    const affiliation = (index: number, siteId: string, institutionName: string) => ({
      id: `aff-${index}`,
      organizationId: 'org-1',
      publisherId: ID,
      siteId,
      institutionName,
      claimScopes: ['site_name'],
      evidenceReference: 'direktori-resmi',
      active: true,
      verifiedAt: '2026-09-18T00:00:00.000Z',
      version: 1,
      createdAt: '2026-09-18T00:00:00.000Z',
      updatedAt: '2026-09-18T00:00:00.000Z',
    });
    const affiliations = [
      affiliation(1, ID2, 'Bapas Kelas I Semarang'),
      affiliation(2, ID3, 'Bapas Kelas I Semarang'),
      affiliation(3, ID4, 'Bapas Kelas I Semarang'),
      affiliation(4, ID2, 'Rutan Kelas II B Wonosobo'),
    ];
    const state = {
      organizationId: 'org-1',
      organizationName: 'Org',
      regions: [
        { id: 'region-semarang', organizationId: 'org-1', name: 'Semarang', status: 'active' },
        { id: 'region-wonosobo', organizationId: 'org-1', name: 'Wonosobo', status: 'active' },
      ],
      sites: [
        { id: ID2, organizationId: 'org-1', normalizedHostname: 'semarang.fakta01.my.id', siteLevel: 'city', status: 'active', regionId: 'region-semarang' },
        { id: ID3, organizationId: 'org-1', normalizedHostname: 'semarang.liputan99.web.id', siteLevel: 'city', status: 'active', regionId: 'region-semarang' },
        { id: ID4, organizationId: 'org-1', normalizedHostname: 'wonosobo.fakta01.my.id', siteLevel: 'city', status: 'active', regionId: 'region-wonosobo' },
      ],
      publishers: [
        { id: ID, name: 'Bapas Kelas I Semarang', attributionLabel: 'Humas Bapas', type: 'correctional_institution', status: 'active', verificationStatus: 'verified' },
      ],
      affiliations,
    };
    const { service } = harness({ repo: { readPublisherScope: vi.fn(async () => state) } });

    const all = await service.listPublishers(actor);
    expect(all.ok).toBe(true);
    if (!all.ok) throw new Error('expected ok');
    expect(all.value.affiliationRowTotal).toBe(4);
    expect(all.value.affiliationTotalInScope).toBe(3);
    expect(all.value.affiliationLimit).toBe(500);
    expect(all.value.affiliationSearch).toBeNull();
    expect(Object.hasOwn(all.value, 'sites')).toBe(false);
    expect(all.value.affiliations).toEqual([
      expect.objectContaining({ institutionName: 'Bapas Kelas I Semarang', cityName: 'Semarang', portalCount: 2, id: 'aff-1' }),
      expect.objectContaining({ institutionName: 'Bapas Kelas I Semarang', cityName: 'Wonosobo', portalCount: 1, id: 'aff-3' }),
      expect.objectContaining({ institutionName: 'Rutan Kelas II B Wonosobo', cityName: 'Semarang', portalCount: 1, id: 'aff-4' }),
    ]);

    const byCity = await service.listPublishers(actor, { search: 'wonosobo' });
    expect(byCity.ok).toBe(true);
    if (!byCity.ok) throw new Error('expected ok');
    expect(byCity.value.affiliationTotal).toBe(2);
    expect(byCity.value.affiliationSearch).toBe('wonosobo');

    const byPortal = await service.listPublishers(actor, { search: 'semarang.liputan99' });
    expect(byPortal.ok).toBe(true);
    if (!byPortal.ok) throw new Error('expected ok');
    expect(byPortal.value.affiliationTotal).toBe(1);

    const noMatch = await service.listPublishers(actor, { search: 'tidak-ada' });
    expect(noMatch.ok).toBe(true);
    if (!noMatch.ok) throw new Error('expected ok');
    expect(noMatch.value.affiliations).toHaveLength(0);
    expect(noMatch.value.publishers).toHaveLength(0);
  });

  it('menolak filter editorial rusak dan klaim asing', async () => {
    const { service } = harness();
    const broken = await service.listEditorial(actor, { regionId: 'bukan-uuid' });
    expect(broken.ok).toBe(false);

    const missing = await service.getPublisherClaim(actor, ID2, ID2);
    expect(missing.ok).toBe(false);
  });

  it('mencatat penyebab baca editorial gagal tanpa membocorkannya', async () => {
    const failure = Object.assign(new Error('connection timeout'), {
      code: 'ETIMEDOUT',
      table: 'articles',
      column: 'category_id',
      constraint: 'articles_category_fk',
    });
    const { service } = harness({ repo: { readEditorialScope: vi.fn(async () => { throw failure; }) } });
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { lines.push(String(args[0])); });
    try {
      const result = await service.listEditorial(actor, {});
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected failure');
      expect(result.error.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(result.error)).not.toContain('ETIMEDOUT');
      const logged = lines.find((line) => line.includes('dashboard.query.failed'));
      expect(logged).toBeDefined();
      const record = JSON.parse(logged as string) as {
        requestId?: unknown;
        context?: { code?: unknown; table?: unknown; column?: unknown; constraint?: unknown };
      };
      expect(record.requestId).toBe('req-1');
      expect(record.context?.code).toBe('ETIMEDOUT');
      expect(record.context?.table).toBe('articles');
      expect(record.context?.column).toBe('category_id');
      expect(record.context?.constraint).toBe('articles_category_fk');
    } finally {
      spy.mockRestore();
    }
  });
});

describe('TenantBusinessService editorial pagination', () => {
  const CURSOR = '123e4567-e89b-12d3-a456-426614174000';

  function pagedHarness() {
    return harness({
      repo: {
        readEditorialScope: vi.fn(async () => ({
          articles: editorialState.articles,
          articlesNextCursor: CURSOR,
          total: 42,
          tagOptions: [{ tag: 'politik', count: 7 }],
          articleSites: editorialState.articleSites,
          categories: [],
          authors: [],
          publishers: [],
          regions: editorialState.regions,
          sites: editorialState.sites,
          domains: [],
        })),
      },
    });
  }

  it('meneruskan limit/kursor/status/tag/sort dan mengembalikan kolom paginasi', async () => {
    const { service, repository } = pagedHarness();
    const result = await service.listEditorial(actor, {
      limit: 50, cursor: CURSOR, status: 'active', tag: 'politik', sort: 'updated',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(repository.readEditorialScope).toHaveBeenCalledWith(
      actor,
      'article.read',
      expect.objectContaining({ limit: 50, cursor: CURSOR, status: 'active', tag: 'politik', sort: 'updated' }),
      { limit: 50, cursor: CURSOR },
    );
    expect(result.value.articles).toHaveLength(1);
    expect(result.value.articlesNextCursor).toBe(CURSOR);
    expect(result.value.total).toBe(42);
    expect(result.value.tagOptions).toEqual([{ tag: 'politik', count: 7 }]);
  });

  it('menolak sort dan status tak dikenal sebagai INVALID_INPUT tanpa menyentuh repo', async () => {
    const { service, repository } = pagedHarness();
    const badSort = await service.listEditorial(actor, { sort: 'bogus' });
    expect(badSort.ok).toBe(false);
    if (badSort.ok) throw new Error('expected error');
    expect(badSort.error.error.code).toBe('INVALID_INPUT');

    const badStatus = await service.listEditorial(actor, { status: 'bogus' });
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) throw new Error('expected error');
    expect(badStatus.error.error.code).toBe('INVALID_INPUT');

    expect(repository.readEditorialScope).not.toHaveBeenCalled();
  });
});

describe('TenantBusinessService updates', () => {
  it('memperbarui site, region, role, kategori, dan author', async () => {
    const { service } = harness({
      collections: {
        domains: [{ id: ID2 }],
        regions: [{ id: ID2, externalKey: 'jw', name: 'Jawa', slug: 'jawa', status: 'active', version: 1 }],
        sites: [{ id: ID, organizationId: 'org-1', domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'a.example', status: 'active', activationState: 'active', version: 1 }],
        roles: [{ id: ID, name: 'Redaktur', tier: 'user', active: true, permissions: new Set(), version: 1 }],
        categories: [{ id: ID, name: 'Politik', slug: 'politik', status: 'active', version: 1 }],
        authors: [{ id: ID, displayName: 'A', byline: 'A', status: 'active', version: 1 }],
      },
    });
    await expect(service.updateSite(actor, { id: ID, expectedVersion: 1, domainId: ID2, regionId: null, status: 'active' })).resolves.toMatchObject({ ok: true });
    await expect(service.updateRegion(actor, { id: ID2, expectedVersion: 1, externalKey: 'jw', name: 'Jawa Tengah', slug: 'jawa' })).resolves.toMatchObject({ ok: true });
    await expect(service.updateRole(actor, { id: ID, expectedVersion: 1, name: 'Redaktur', permissions: [] })).resolves.toMatchObject({ ok: true });
    await expect(service.updateCategory(actor, { id: ID, expectedVersion: 1, name: 'Politik', slug: 'politik', status: 'active' })).resolves.toMatchObject({ ok: true });
    await expect(service.updateAuthor(actor, { id: ID, expectedVersion: 1, displayName: 'B', byline: 'B', status: 'active' })).resolves.toMatchObject({ ok: true });
  });

  it('membuat author dan mengatur views assignment', async () => {
    const { service } = harness();
    await expect(service.createAuthor(actor, { displayName: 'Jurnalis', byline: 'Jurnalis Lapangan', status: 'active' })).resolves.toMatchObject({ ok: true });

    const withAssignment = harness({
      collections: {
        articles: [{ id: ID, organizationId: 'org-1', regionId: null }],
        sites: [{ id: ID2, organizationId: 'org-1', regionId: null }],
        articleSites: [{ id: 'as-1', articleId: ID, siteId: ID2, viewCount: 0, version: 1 }],
      },
    });
    const views = await withAssignment.service.setArticleSiteViews(actor, { articleId: ID, siteId: ID2, viewCount: 1240 });
    expect(views.ok).toBe(true);
    if (!views.ok) throw new Error('expected ok');
    expect(views.value.viewCount).toBe(1240);

    const missing = await withAssignment.service.setArticleSiteViews(actor, { articleId: ID, siteId: ID, viewCount: 1 });
    expect(missing.ok).toBe(false);
  });

  it('menyimpan tayangan banyak situs dalam satu panggilan', async () => {
    const missingId = '0199a2b3-4c5d-7e8f-9012-3456789abc99';
    const thirdId = '0199a2b3-4c5d-7e8f-9012-3456789abc03';
    const withAssignment = harness({
      collections: {
        articles: [{ id: ID, organizationId: 'org-1', regionId: null }],
        sites: [
          { id: ID2, organizationId: 'org-1', regionId: null },
          { id: thirdId, organizationId: 'org-1', regionId: null },
        ],
        articleSites: [
          { id: 'as-1', articleId: ID, siteId: ID2, viewCount: 0, version: 1 },
          { id: 'as-2', articleId: ID, siteId: thirdId, viewCount: 0, version: 1 },
        ],
      },
    });
    const bulk = await withAssignment.service.setArticleSiteViewsMany(actor, { articleId: ID, siteIds: [ID2, thirdId, missingId], viewCount: 500 });
    expect(bulk.ok).toBe(true);
    if (!bulk.ok) throw new Error('expected ok');
    expect(bulk.value.updated).toBe(2);
    expect(bulk.value.missing).toEqual([missingId]);

    const broken = await withAssignment.service.setArticleSiteViewsMany(actor, { articleId: ID, siteIds: [], viewCount: 1 });
    expect(broken.ok).toBe(false);
  });
});

describe('TenantBusinessService invitations', () => {
  const payload = { email: 'baru@example.test', roleId: ID, tokenHash: HASH };

  it('membuat dan mencabut undangan', async () => {
    const { service, repository } = harness();
    await expect(service.createInvitation(actor, payload)).resolves.toMatchObject({ ok: true, value: { id: 'invite-1' } });
    expect(repository.createInvitation).toHaveBeenCalledWith(actor, 'membership.manage', payload);
    await expect(service.revokeInvitation(actor, { id: ID })).resolves.toMatchObject({ ok: true });
  });

  it('memetakan konflik dan akses pada undangan', async () => {
    const conflict = harness({ repo: { createInvitation: async () => { throw new DashboardConflictError(); } } });
    await expect(conflict.service.createInvitation(actor, payload)).resolves.toMatchObject({ ok: false });

    const denied = harness({ repo: { revokeInvitation: async () => { throw new DashboardAccessDeniedError(); } } });
    const result = await denied.service.revokeInvitation(actor, { id: ID });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});
