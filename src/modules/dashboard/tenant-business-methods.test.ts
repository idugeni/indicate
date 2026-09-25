import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID2 = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const NOW = new Date('2026-09-18T14:00:00.000Z');

const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const COLLECTIONS = [
  'domains',
  'regions',
  'sites',
  'siteSettings',
  'roles',
  'memberships',
  'publishers',
  'affiliations',
  'categories',
  'authors',
  'articles',
  'articleCategories',
  'articleSites',
  'media',
] as const;

function stateWith(overrides: Record<string, readonly unknown[]> = {}): Record<string, unknown> {
  const state: Record<string, unknown> = { organizationId: 'org-1' };
  for (const key of COLLECTIONS) state[key] = [...(overrides[key] ?? [])];
  return state;
}

function harness(collections: Record<string, readonly unknown[]> = {}) {
  const state = stateWith(collections);
  const appendAudit = vi.fn();
  const repository = {
    execute: vi.fn(async (_actor: unknown, _permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit });
    }),
    recordDenied: vi.fn(async () => undefined),
    enqueueCachePurge: vi.fn(async () => []),
  };
  const service = new TenantBusinessService(repository as never, { create: () => ID }, { now: () => NOW });
  return { repository, service, state, appendAudit };
}

const ID3 = '0199a2b3-4c5d-7e8f-9012-3456789abce0';
const ID4 = '0199a2b3-4c5d-7e8f-9012-3456789abce1';
const ID5 = '0199a2b3-4c5d-7e8f-9012-3456789abce2';

const domain = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  organizationId: 'org-1',
  normalizedHostname: 'fakta01.my.id',
  status: 'active',
  siteTopology: 'national',
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const region = (overrides: Record<string, unknown> = {}) => ({
  id: ID3,
  organizationId: 'org-1',
  externalKey: 'jawa-tengah',
  name: 'Jawa Tengah',
  slug: 'jawa-tengah',
  status: 'active',
  kind: 'region',
  parentRegionId: null,
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const site = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  organizationId: 'org-1',
  domainId: ID,
  regionId: null,
  siteLevel: 'apex',
  parentSiteId: null,
  normalizedHostname: 'fakta01.my.id',
  status: 'active',
  activationState: 'active',
  version: 1,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const SCOPE_PROVINCE = '0199a2b3-4c5d-7e8f-9012-3456789abc31';
const SCOPE_CITY_REGION = '0199a2b3-4c5d-7e8f-9012-3456789abc32';
const OTHER_PROVINCE = '0199a2b3-4c5d-7e8f-9012-3456789abc33';
const OTHER_CITY_REGION = '0199a2b3-4c5d-7e8f-9012-3456789abc34';
const SCOPE_APEX_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc35';
const SCOPE_REGION_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc36';
const SCOPE_CITY_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc37';
const OTHER_REGION_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc38';
const OTHER_CITY_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc39';

/** One network carrying two provinces so a scoped actor has a subtree and a neighbour. */
function scopeHierarchyFixture(): Record<string, readonly unknown[]> {
  return {
    regions: [
      { id: SCOPE_PROVINCE, organizationId: 'org-1', externalKey: 'jateng', name: 'Jawa Tengah', slug: 'jawa-tengah', status: 'active', kind: 'region', parentRegionId: null, version: 1 },
      { id: SCOPE_CITY_REGION, organizationId: 'org-1', externalKey: 'wonosobo', name: 'Wonosobo', slug: 'wonosobo', status: 'active', kind: 'city', parentRegionId: SCOPE_PROVINCE, version: 1 },
      { id: OTHER_PROVINCE, organizationId: 'org-1', externalKey: 'yogya', name: 'DI Yogyakarta', slug: 'yogyakarta', status: 'active', kind: 'region', parentRegionId: null, version: 1 },
      { id: OTHER_CITY_REGION, organizationId: 'org-1', externalKey: 'sleman', name: 'Sleman', slug: 'sleman', status: 'active', kind: 'city', parentRegionId: OTHER_PROVINCE, version: 1 },
    ],
    sites: [
      { id: SCOPE_APEX_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'portal.test', status: 'active' },
      { id: SCOPE_REGION_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: SCOPE_PROVINCE, siteLevel: 'region', parentSiteId: SCOPE_APEX_SITE, normalizedHostname: 'jawa-tengah.portal.test', status: 'active' },
      { id: SCOPE_CITY_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: SCOPE_CITY_REGION, siteLevel: 'city', parentSiteId: SCOPE_REGION_SITE, normalizedHostname: 'wonosobo.portal.test', status: 'active' },
      { id: OTHER_REGION_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: OTHER_PROVINCE, siteLevel: 'region', parentSiteId: SCOPE_APEX_SITE, normalizedHostname: 'yogyakarta.portal.test', status: 'active' },
      { id: OTHER_CITY_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: OTHER_CITY_REGION, siteLevel: 'city', parentSiteId: OTHER_REGION_SITE, normalizedHostname: 'sleman.portal.test', status: 'active' },
    ],
    articles: [{ id: ID, organizationId: 'org-1', regionId: SCOPE_CITY_REGION, slug: 'berita-utama', status: 'draft', version: 1, archivedAt: null }],
    articleSites: [],
  };
}

describe('TenantBusinessService domains regions', () => {
  it('membuat domain dan mengaudit', async () => {
    const { service, state, appendAudit } = harness();
    const result = await service.createDomain(actor, { normalizedHostname: 'fakta01.my.id' });
    expect(result.ok).toBe(true);
    expect((state.domains as unknown[])).toHaveLength(1);
    expect(appendAudit).toHaveBeenCalledTimes(1);
  });

  it('menolak domain duplikat sebagai conflict', async () => {
    const { service } = harness({ domains: [domain()] });
    const result = await service.createDomain(actor, { normalizedHostname: 'fakta01.my.id' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('menolak mutasi domain dari aktor terkunci region', async () => {
    const { service } = harness();
    const locked = { ...actor, regionScopeId: 'region-1' };
    const result = await service.createDomain(locked, { normalizedHostname: 'fakta01.my.id' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('aktor terkunci province boleh bekerja pada portal city di bawahnya', async () => {
    const scoped = harness(scopeHierarchyFixture());
    const result = await scoped.service.assignArticleSites({ ...actor, regionScopeId: SCOPE_PROVINCE }, { articleId: ID, siteIds: [SCOPE_CITY_SITE] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.map((row) => (row as { siteId: string }).siteId).sort()).toEqual(
      [SCOPE_CITY_SITE, SCOPE_REGION_SITE, SCOPE_APEX_SITE].sort(),
    );
  });

  it('aktor terkunci province ditolak pada portal city provinsi lain', async () => {
    const scoped = harness(scopeHierarchyFixture());
    const result = await scoped.service.assignArticleSites({ ...actor, regionScopeId: SCOPE_PROVINCE }, { articleId: ID, siteIds: [OTHER_CITY_SITE] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('aktor terkunci city ditolak pada kota saudara', async () => {
    const scoped = harness(scopeHierarchyFixture());
    const result = await scoped.service.assignArticleSites({ ...actor, regionScopeId: SCOPE_CITY_REGION }, { articleId: ID, siteIds: [OTHER_CITY_SITE] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak update versi basi sebagai conflict', async () => {
    const { service } = harness({ domains: [domain()] });
    const result = await service.updateDomain(actor, { id: ID, expectedVersion: 2, normalizedHostname: 'baru.my.id', status: 'active' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('menyimpan nama singkat wilayah bersama nama resminya', async () => {
    const { service } = harness();
    const result = await service.createRegion(actor, { externalKey: 'jawa-timur', name: 'Jawa Timur', shortName: 'Jatim', slug: 'jawa-timur' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.name).toBe('Jawa Timur');
    expect(result.value.shortName).toBe('Jatim');
  });

  it('menolak nama singkat yang tidak masuk akal', async () => {
    const { service } = harness();
    const result = await service.createRegion(actor, { externalKey: 'jawa-timur', name: 'Jawa Timur', shortName: 'a'.repeat(41), slug: 'jawa-timur' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak slug region duplikat', async () => {
    const region = { id: ID, organizationId: 'org-1', slug: 'jawa', externalKey: 'jw', name: 'Jawa', shortName: null, status: 'active', version: 1 };
    const { service } = harness({ regions: [region] });
    const result = await service.createRegion(actor, { externalKey: 'jw', name: 'Jawa Tengah', slug: 'jateng' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });
});

describe('TenantBusinessService sites roles categories', () => {
  const siteDeps = {
    domains: [domain({ id: ID2 })],
    regions: [],
    sites: [],
  };

  it('membuat site apex pending aktivasi dengan hostname turunan domain', async () => {
    const { service, state } = harness(siteDeps);
    const result = await service.createSite(actor, { domainId: ID2, regionId: null });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.activationState).toBe('inactive');
    expect(result.value.siteLevel).toBe('apex');
    expect(result.value.normalizedHostname).toBe(domain({ id: ID2 }).normalizedHostname);
    expect((state.sites as unknown[])).toHaveLength(1);
  });

  it('menolak apex kedua pada domain yang sama', async () => {
    const { service } = harness({
      ...siteDeps,
      sites: [{ id: ID, organizationId: 'org-1', domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'portal.fakta01.my.id', version: 1 }],
    });
    const result = await service.createSite(actor, { domainId: ID2, regionId: null });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('menolak site region sebelum apex tersedia', async () => {
    const { service } = harness({ ...siteDeps, regions: [region({ id: ID3, kind: 'region', parentRegionId: null })] });
    const result = await service.createSite(actor, { domainId: ID2, regionId: ID3 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak site city sebelum portal region induk ada', async () => {
    const { service } = harness({
      domains: [domain({ id: ID2 })],
      regions: [region({ id: ID3 }), region({ id: ID4, kind: 'city', parentRegionId: ID3, slug: 'wonosobo', name: 'Wonosobo' })],
      sites: [site({ id: ID, domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null })],
    });
    const result = await service.createSite(actor, { domainId: ID2, regionId: ID4 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menurunkan level, induk, dan hostname untuk portal city', async () => {
    const { service } = harness({
      domains: [domain({ id: ID2, siteTopology: 'regional' })],
      regions: [region({ id: ID3, kind: 'region', parentRegionId: null }), region({ id: ID4, kind: 'city', parentRegionId: ID3 })],
      sites: [
        site({ id: ID, domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null }),
        site({ id: ID5, domainId: ID2, regionId: ID3, siteLevel: 'region', parentSiteId: ID }),
      ],
    });
    const result = await service.createSite(actor, { domainId: ID2, regionId: ID4 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.siteLevel).toBe('city');
    expect(result.value.parentSiteId).toBe(ID5);
  });

  it('menolak portal turunan pada domain yang declares nasional', async () => {
    const { service } = harness({
      domains: [domain({ id: ID2 })],
      regions: [region({ id: ID3 })],
      sites: [site({ id: ID, domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null })],
    });
    const result = await service.createSite(actor, { domainId: ID2, regionId: ID3 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak topology regional tanpa portal region', async () => {
    const { service } = harness({
      domains: [domain({ id: ID2 })],
      sites: [site({ id: ID, domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null })],
    });
    const result = await service.updateDomain(actor, { id: ID2, expectedVersion: 1, normalizedHostname: 'fakta01.my.id', siteTopology: 'regional', status: 'active' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak downgrade ke nasional saat portal turunan masih ada', async () => {
    const { service } = harness({
      domains: [domain({ id: ID2, siteTopology: 'regional' })],
      regions: [region({ id: ID3 })],
      sites: [
        site({ id: ID, domainId: ID2, regionId: null, siteLevel: 'apex', parentSiteId: null }),
        site({ id: ID5, domainId: ID2, regionId: ID3, siteLevel: 'region', parentSiteId: ID }),
      ],
    });
    const result = await service.updateDomain(actor, { id: ID2, expectedVersion: 1, normalizedHostname: 'fakta01.my.id', siteTopology: 'national', status: 'active' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('menolak nama role duplikat case-insensitive', async () => {
    const { service } = harness({ roles: [{ id: ID, name: 'Redaktur' }] });
    const result = await service.createRole(actor, { name: 'redaktur', permissions: [] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('menolak slug kategori duplikat', async () => {
    const { service } = harness({ categories: [{ id: ID, slug: 'politik' }] });
    const result = await service.createCategory(actor, { name: 'Politik', slug: 'politik' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });
});

describe('TenantBusinessService articles assignments', () => {
  const baseArticle = {
    id: ID,
    organizationId: 'org-1',
    regionId: 'region-1',
    status: 'draft',
    version: 1,
    archivedAt: null,
  };
  const liveSite = { id: ID2, organizationId: 'org-1', status: 'active', regionId: null };


  it('mengarsipkan dan memulihkan artikel', async () => {
    const archived = harness({ articles: [{ ...baseArticle }] });
    const archivedResult = await archived.service.archiveArticle(actor, { id: ID, expectedVersion: 1 });
    expect(archivedResult.ok).toBe(true);
    if (!archivedResult.ok) throw new Error('expected ok');
    expect(archivedResult.value.status).toBe('archived');

    const restored = harness({ articles: [{ ...baseArticle, status: 'archived', version: 2 }] });
    const restoredResult = await restored.service.restoreArticle(actor, { id: ID, expectedVersion: 2 });
    expect(restoredResult.ok).toBe(true);
    if (!restoredResult.ok) throw new Error('expected ok');
    expect(restoredResult.value.status).toBe('draft');
  });

  it('menetapkan portal tayang ke artikel', async () => {
    const { service } = harness({ articles: [{ ...baseArticle }], sites: [liveSite], articleSites: [] });
    const result = await service.assignArticleSites(actor, { articleId: ID, siteIds: [ID2] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toHaveLength(1);
  });

  it('menolak assignment ke portal nonaktif', async () => {
    const { service } = harness({
      articles: [{ ...baseArticle }],
      sites: [{ ...liveSite, status: 'inactive' }],
      articleSites: [],
    });
    const result = await service.assignArticleSites(actor, { articleId: ID, siteIds: [ID2] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('membuat kota berinduk dan menolak induk tak valid', async () => {
    const REGION = '0199a2b3-4c5d-7e8f-9012-3456789abc01';
    const CITY = '0199a2b3-4c5d-7e8f-9012-3456789abc02';
    const region = { id: REGION, organizationId: 'org-1', slug: 'wonosobo', externalKey: 'w', name: 'Wonosobo', status: 'active', kind: 'region', parentRegionId: null, version: 1 };
    const { service, state } = harness({ regions: [region] });
    const city = await service.createRegion(actor, { externalKey: 'k', name: 'Kota', slug: 'kota', kind: 'city', parentRegionId: REGION });
    expect(city.ok).toBe(true);
    expect((state.regions as { kind: string }[]).find((item) => item.kind === 'city')).toBeDefined();

    const orphan = await service.createRegion(actor, { externalKey: 'o', name: 'Yatim', slug: 'yatim', kind: 'city', parentRegionId: null });
    expect(orphan.ok).toBe(false);

    const nested = await service.createRegion(actor, { externalKey: 'n', name: 'Sarang', slug: 'sarang', kind: 'city', parentRegionId: CITY });
    expect(nested.ok).toBe(false);

    const regionAsCity = await service.createRegion(actor, { externalKey: 'r', name: 'Biasa', slug: 'biasa', kind: 'region', parentRegionId: REGION });
    expect(regionAsCity.ok).toBe(false);
  });

  it('meluaskan assignment kota ke region dan apex dengan kanonis primer', async () => {
    const APEX = '0199a2b3-4c5d-7e8f-9012-3456789abc11';
    const REGION_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc12';
    const CITY_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc13';
    const R = '0199a2b3-4c5d-7e8f-9012-3456789abc21';
    const C = '0199a2b3-4c5d-7e8f-9012-3456789abc22';
    const article = { ...baseArticle, slug: 'berita-utama' };
    const sites = [
      { id: APEX, organizationId: 'org-1', domainId: 'd-1', regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'portal.test', status: 'active' },
      { id: REGION_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: R, siteLevel: 'region', parentSiteId: APEX, normalizedHostname: 'wonosobo.portal.test', status: 'active' },
      { id: CITY_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: C, siteLevel: 'city', parentSiteId: REGION_SITE, normalizedHostname: 'kota.portal.test', status: 'active' },
    ];
    const regions = [
      { id: R, organizationId: 'org-1', slug: 'wonosobo', externalKey: 'w', name: 'Wonosobo', status: 'active', kind: 'region', parentRegionId: null, version: 1 },
      { id: C, organizationId: 'org-1', slug: 'kota', externalKey: 'k', name: 'Kota', status: 'active', kind: 'city', parentRegionId: R, version: 1 },
    ];
    const { service, state } = harness({ articles: [article], sites, regions, articleSites: [] });
    const result = await service.assignArticleSites(actor, { articleId: ID, siteIds: [CITY_SITE] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.map((row) => (row as { siteId: string }).siteId).sort()).toEqual([APEX, CITY_SITE, REGION_SITE].sort());
    const rows = state.articleSites as { siteId: string; assignmentSource: string; expandedFromSiteId: string | null; customCanonicalUrl: string | null }[];
    expect(rows.find((row) => row.siteId === CITY_SITE)).toMatchObject({ assignmentSource: 'manual', expandedFromSiteId: null, customCanonicalUrl: null });
    expect(rows.find((row) => row.siteId === REGION_SITE)).toMatchObject({
      assignmentSource: 'auto',
      expandedFromSiteId: CITY_SITE,
      customCanonicalUrl: 'https://portal.test/berita-utama',
    });
    expect(rows.find((row) => row.siteId === APEX)).toMatchObject({
      assignmentSource: 'auto',
      expandedFromSiteId: CITY_SITE,
      customCanonicalUrl: 'https://portal.test/berita-utama',
    });
  });

  it('menciutkan turunan saat asal dicabut', async () => {
    const APEX = '0199a2b3-4c5d-7e8f-9012-3456789abc11';
    const REGION_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc12';
    const CITY_SITE = '0199a2b3-4c5d-7e8f-9012-3456789abc13';
    const R = '0199a2b3-4c5d-7e8f-9012-3456789abc21';
    const C = '0199a2b3-4c5d-7e8f-9012-3456789abc22';
    const article = { ...baseArticle, slug: 'berita-utama' };
    const sites = [
      { id: APEX, organizationId: 'org-1', domainId: 'd-1', regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'portal.test', status: 'active' },
      { id: REGION_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: R, siteLevel: 'region', parentSiteId: APEX, normalizedHostname: 'wonosobo.portal.test', status: 'active' },
      { id: CITY_SITE, organizationId: 'org-1', domainId: 'd-1', regionId: C, siteLevel: 'city', parentSiteId: REGION_SITE, normalizedHostname: 'kota.portal.test', status: 'active' },
    ];
    const regions = [
      { id: R, organizationId: 'org-1', slug: 'wonosobo', externalKey: 'w', name: 'Wonosobo', status: 'active', kind: 'region', parentRegionId: null, version: 1 },
      { id: C, organizationId: 'org-1', slug: 'kota', externalKey: 'k', name: 'Kota', status: 'active', kind: 'city', parentRegionId: R, version: 1 },
    ];
    const { service, state } = harness({ articles: [article], sites, regions, articleSites: [] });
    const first = await service.assignArticleSites(actor, { articleId: ID, siteIds: [CITY_SITE] });
    expect(first.ok).toBe(true);
    const second = await service.assignArticleSites(actor, { articleId: ID, siteIds: [] });
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error('expected ok');
    expect(second.value).toHaveLength(0);
    expect((state.articleSites as { active: boolean }[]).every((row) => row.active === false)).toBe(true);
  });
});
