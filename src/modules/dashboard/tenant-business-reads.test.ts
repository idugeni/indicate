import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { DashboardAccessDeniedError, DashboardConflictError } from '@/modules/dashboard/ports';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ID2 = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
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
  'domains', 'regions', 'sites', 'siteSettings', 'roles', 'memberships', 'telegramMappings',
  'publishers', 'affiliations', 'categories', 'authors', 'articles', 'articleSites', 'media',
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
    execute: vi.fn(async (_actor: unknown, _permission: unknown, operation: unknown) => {
      const op = operation as (transaction: unknown) => unknown;
      return op({ state, resolveUserDisplayName: async () => 'Operator', appendAudit: vi.fn() });
    }),
    read: vi.fn(async () => editorialState),
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
        read: vi.fn(async () => ({
          ...editorialState,
          domains: [
            { id: ID, organizationId: 'org-1', normalizedHostname: 'fakta01.my.id' },
            { id: ID2, organizationId: 'org-1', normalizedHostname: 'lain.id' },
          ],
          sites: [
            { id: ID2, organizationId: 'org-1', domainId: ID, regionId: null, normalizedHostname: 'wonosobo.fakta01.my.id', status: 'active' },
          ],
        })),
      },
    });
    const editorial = await service.listEditorial(actor, {});
    expect(editorial.ok).toBe(true);
    if (!editorial.ok) throw new Error('expected ok');
    expect(editorial.value.domains).toEqual([{ id: ID, normalizedHostname: 'fakta01.my.id' }]);
  });

  it('menolak filter editorial rusak dan klaim asing', async () => {
    const { service } = harness();
    const broken = await service.listEditorial(actor, { regionId: 'bukan-uuid' });
    expect(broken.ok).toBe(false);

    const missing = await service.getPublisherClaim(actor, ID2, ID2);
    expect(missing.ok).toBe(false);
  });
});

describe('TenantBusinessService updates', () => {
  it('memperbarui site, region, role, kategori, dan author', async () => {
    const { service } = harness({
      collections: {
        domains: [{ id: ID2 }],
        regions: [{ id: ID2, externalKey: 'jw', name: 'Jawa', slug: 'jawa', status: 'active', version: 1 }],
        sites: [{ id: ID, organizationId: 'org-1', domainId: ID2, regionId: null, normalizedHostname: 'a.example', status: 'active', activationState: 'active', version: 1 }],
        roles: [{ id: ID, name: 'Redaktur', tier: 'user', active: true, permissions: new Set(), version: 1 }],
        categories: [{ id: ID, name: 'Politik', slug: 'politik', status: 'active', version: 1 }],
        authors: [{ id: ID, displayName: 'A', byline: 'A', status: 'active', version: 1 }],
      },
    });
    await expect(service.updateSite(actor, { id: ID, expectedVersion: 1, domainId: ID2, regionId: null, normalizedHostname: 'b.example', status: 'active' })).resolves.toMatchObject({ ok: true });
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
