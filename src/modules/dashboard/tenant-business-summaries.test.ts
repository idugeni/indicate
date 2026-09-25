import { describe, expect, it, vi } from 'vitest';

import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { DashboardAccessDeniedError } from '@/modules/dashboard/ports';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const ALL = new Set(Object.values(DASHBOARD_PERMISSIONS));

const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: ALL,
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const tenantState = {
  organizationName: 'Org Redaksi',
  domains: [],
  regions: [],
  sites: [],
  siteSettings: [],
  roles: [],
  memberships: [],
};

function stateWith(overrides: Record<string, readonly unknown[]>) {
  return { ...tenantState, ...overrides };
}

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    dashboardCounts: vi.fn(async () => ({ activeSites: 2 })),
    analyticsSummary: vi.fn(async () => ({ articlesByRegion: [] })),
    auditLogPage: vi.fn(async () => [{ id: 'log-1' }]),
    retentionRuns: vi.fn(async () => []),
    operationsSummary: vi.fn(async () => ({ pending: 0 })),
    read: vi.fn(async () => tenantState),
    activationAttempts: vi.fn(async () => []),
    listInvitations: vi.fn(async () => []),
    recordDenied: vi.fn(async () => undefined),
    execute: vi.fn(),
    ...repoOverrides,
  };
  const service = new TenantBusinessService(repository as never, { create: () => 'id-1' }, { now: () => NOW });
  return { repository, service };
}

describe('TenantBusinessService read summaries', () => {
  it('membaca dashboard, analitik, audit, dan operasional', async () => {
    const { service, repository } = harness();
    await expect(service.dashboard(actor)).resolves.toMatchObject({ ok: true });
    await expect(service.analytics(actor, {})).resolves.toMatchObject({ ok: true });
    const audit = await service.auditLogs(actor, {});
    expect(audit.ok).toBe(true);
    if (!audit.ok) throw new Error('expected ok');
    expect(audit.value.auditLogs).toHaveLength(1);
    await expect(service.operations(actor)).resolves.toMatchObject({ ok: true });
    expect(repository.dashboardCounts).toHaveBeenCalledTimes(1);
  });

  it('menolak filter analitik dan audit yang rusak', async () => {
    const { service } = harness();
    const analytics = await service.analytics(actor, { from: 'bukan-tanggal' });
    expect(analytics.ok).toBe(false);
    if (analytics.ok) throw new Error('expected error');
    expect(analytics.error.error.code).toBe('INVALID_INPUT');

    const audit = await service.auditLogs(actor, { outcome: 'aneh' });
    expect(audit.ok).toBe(false);
  });

  it('memetakan akses ditolak ke denial', async () => {
    const { service } = harness({
      dashboardCounts: async () => {
        throw new DashboardAccessDeniedError();
      },
    });
    const result = await service.dashboard(actor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('TenantBusinessService listConfiguration', () => {
  it('menggabungkan state, attempts, dan undangan', async () => {
    const { service, repository } = harness();
    const result = await service.listConfiguration(actor);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.organizationName).toBe('Org Redaksi');
    expect(repository.activationAttempts).toHaveBeenCalledTimes(1);
    expect(repository.listInvitations).toHaveBeenCalledTimes(1);
  });

  it('menampilkan seluruh subtree wilayah untuk aktor terkunci dan menyembunyikan kota saudara', async () => {
    const province = '0199a2b3-4c5d-7e8f-9012-3456789abc41';
    const city = '0199a2b3-4c5d-7e8f-9012-3456789abc42';
    const otherProvince = '0199a2b3-4c5d-7e8f-9012-3456789abc43';
    const siblingCity = '0199a2b3-4c5d-7e8f-9012-3456789abc44';
    const geography = [
      { id: province, organizationId: 'org-1', externalKey: 'jateng', name: 'Jawa Tengah', slug: 'jawa-tengah', status: 'active', kind: 'region', parentRegionId: null, version: 1 },
      { id: city, organizationId: 'org-1', externalKey: 'wonosobo', name: 'Wonosobo', slug: 'wonosobo', status: 'active', kind: 'city', parentRegionId: province, version: 1 },
      { id: otherProvince, organizationId: 'org-1', externalKey: 'yogya', name: 'DI Yogyakarta', slug: 'yogyakarta', status: 'active', kind: 'region', parentRegionId: null, version: 1 },
      { id: siblingCity, organizationId: 'org-1', externalKey: 'sleman', name: 'Sleman', slug: 'sleman', status: 'active', kind: 'city', parentRegionId: otherProvince, version: 1 },
    ];
    const sites = [
      { id: 'site-apex', organizationId: 'org-1', domainId: 'domain-1', regionId: null, siteLevel: 'apex', parentSiteId: null, normalizedHostname: 'portal.test', status: 'active', activationState: 'active', version: 1 },
      { id: 'site-city', organizationId: 'org-1', domainId: 'domain-1', regionId: city, siteLevel: 'city', parentSiteId: 'site-apex', normalizedHostname: 'wonosobo.portal.test', status: 'active', activationState: 'active', version: 1 },
      { id: 'site-sibling', organizationId: 'org-1', domainId: 'domain-1', regionId: siblingCity, siteLevel: 'city', parentSiteId: 'site-apex', normalizedHostname: 'sleman.portal.test', status: 'active', activationState: 'active', version: 1 },
    ];
    const { service } = harness({ read: async () => stateWith({ regions: geography, sites, siteSettings: [] }) });
    const result = await service.listConfiguration({ ...actor, regionScopeId: province });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.sites.map((site) => site.normalizedHostname).sort()).toEqual(['portal.test', 'wonosobo.portal.test']);
    expect(result.value.regions.map((region) => region.id).sort()).toEqual([province, city].sort());
  });

  it('menampilkan artikel kota di bawahnya pada ringkasan redaksi', async () => {
    const province = '0199a2b3-4c5d-7e8f-9012-3456789abc41';
    const city = '0199a2b3-4c5d-7e8f-9012-3456789abc42';
    const otherProvince = '0199a2b3-4c5d-7e8f-9012-3456789abc43';
    const siblingCity = '0199a2b3-4c5d-7e8f-9012-3456789abc44';
    const geography = [
      { id: province, name: 'Jawa Tengah', kind: 'region', parentRegionId: null, status: 'active' },
      { id: city, name: 'Wonosobo', kind: 'city', parentRegionId: province, status: 'active' },
      { id: otherProvince, name: 'DI Yogyakarta', kind: 'region', parentRegionId: null, status: 'active' },
      { id: siblingCity, name: 'Sleman', kind: 'city', parentRegionId: otherProvince, status: 'active' },
    ];
    const summaries = {
      articles: [
        { id: 'article-city', regionId: city, slug: 'kota', title: 'Kota', status: 'draft', createdAt: NOW.toISOString() },
        { id: 'article-sibling', regionId: siblingCity, slug: 'sleman', title: 'Sleman', status: 'draft', createdAt: NOW.toISOString() },
      ],
      sites: [],
      regions: geography,
      regionScope: null,
    };
    const { service } = harness({ listEditorialSummaries: async () => summaries });
    const result = await service.listEditorialSummaries({ ...actor, regionScopeId: province });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.articles.map((article) => article.id)).toEqual(['article-city']);
    expect(result.value.regions.map((region) => region.id).sort()).toEqual([province, city].sort());
  });

  it('menolak aktor tanpa izin baca apa pun', async () => {
    const { service } = harness();
    const bare = { ...actor, permissionSet: new Set<string>() };
    const result = await service.listConfiguration(bare);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});
