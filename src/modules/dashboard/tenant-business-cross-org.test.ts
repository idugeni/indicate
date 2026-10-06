import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { articleTransitionSchema, crossOrgArticleFilterSchema } from '@/modules/dashboard/schemas';

const OWNER = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ARTICLE = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const NOW = new Date('2026-10-06T04:00:00.000Z');

const steward = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-operator',
  permissionSet: new Set(['article.read', 'article.manage']),
  platformPermissionSet: new Set(['platform.super_admin']),
  regionScopeId: null,
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const plain = {
  ...steward,
  platformPermissionSet: new Set<string>(),
} as const;

const lockedSteward = {
  ...steward,
  regionScopeId: 'region-1',
} as const;

const ownerArticle = {
  id: ARTICLE,
  organizationId: OWNER,
  regionId: null,
  publisherId: null,
  categoryId: null,
  categoryIds: [],
  authorId: null,
  leadMediaId: null,
  coverImageUrl: null,
  slug: 'berita-upt',
  title: 'Berita UPT',
  excerpt: null,
  canonicalUrl: null,
  body: 'Isi.',
  bodyJson: null,
  source: 'Humas',
  tags: ['humas'],
  status: 'active',
  type: 'standard',
  isSponsored: false,
  videoUrl: null,
  audioUrl: null,
  durationSeconds: null,
  publishedAt: '2026-10-06T04:23:50.000Z',
  scheduledAt: null,
  archivedAt: null,
  version: 2,
  createdAt: '2026-10-06T04:23:49.000Z',
  updatedAt: '2026-10-06T04:23:50.000Z',
};

function harness(repoOverrides: Record<string, unknown> = {}) {
  const ownerState: Record<string, unknown[]> = {
    articles: [{ ...ownerArticle }],
    regions: [],
    publishers: [],
    categories: [{ id: 'c-berita', name: 'Berita', slug: 'berita', status: 'active' }],
    authors: [],
    articleSites: [],
    publishingJobs: [],
    articleCategories: [],
  };
  const repository = {
    hasPublishedBridges: vi.fn(async () => false),
    execute: vi.fn(async (_actor: unknown, _permission: unknown, operation: (transaction: unknown) => unknown) =>
      operation({
        state: { organizationId: 'org-operator', articles: [], regions: [], articleSites: [], publishingJobs: [], articleCategories: [] },
        resolveUserDisplayName: async () => 'Operator',
        appendAudit: vi.fn(),
        refreshArticleContent: async () => false,
        articleContentTouched: new Set<string>(),
      }),
    ),
    executeForOrganization: vi.fn(async (actor: unknown, targetOrg: string, operation: (transaction: unknown) => unknown) =>
      operation({
        state: ownerState,
        resolveUserDisplayName: async () => 'Operator',
        appendAudit: vi.fn(),
        refreshArticleContent: async () => false,
        articleContentTouched: new Set<string>(),
      }),
    ),
    readCrossOrgEditorialScope: vi.fn(async () => ({
      articles: [{ ...ownerArticle, organizationId: OWNER, orgSlug: 'rutan-wonosobo', orgName: 'RUTAN WONOSOBO', body: '', bodyJson: null }],
      articlesNextCursor: null,
      total: 1,
    })),
    recordDenied: vi.fn(async () => undefined),
    ...repoOverrides,
  };
  const service = new TenantBusinessService(repository as never, { create: () => ARTICLE }, { now: () => NOW });
  return { repository, service, ownerState };
}

describe('TenantBusinessService cross-org steward', () => {
  it('skema lintas-org menolak kunci per-org dan menerima filter steward', () => {
    expect(crossOrgArticleFilterSchema.safeParse({ status: 'active', sort: 'published-desc' }).success).toBe(true);
    expect(crossOrgArticleFilterSchema.safeParse({ regionId: OWNER }).success).toBe(false);
    expect(crossOrgArticleFilterSchema.safeParse({ categoryId: OWNER }).success).toBe(false);
    expect(crossOrgArticleFilterSchema.safeParse({ siteHostname: 'portal.test' }).success).toBe(false);
    expect(articleTransitionSchema.safeParse({ id: ARTICLE, expectedVersion: 2, ownerOrganizationId: OWNER }).success).toBe(true);
  });

  it('mendaftar lintas-org untuk steward dan meneruskan filter', async () => {
    const { repository, service } = harness();
    const result = await service.listCrossOrgEditorial(steward, { status: 'active', sort: 'published-desc' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.total).toBe(1);
    expect(result.value.articles).toHaveLength(1);
    expect(repository.readCrossOrgEditorialScope).toHaveBeenCalledTimes(1);
  });

  it('menolak daftar lintas-org tanpa grant super_admin', async () => {
    const { repository, service } = harness();
    const result = await service.listCrossOrgEditorial(plain, { status: 'active' });
    expect(result.ok).toBe(false);
    expect(repository.readCrossOrgEditorialScope).not.toHaveBeenCalled();
  });

  it('menolak daftar lintas-org untuk steward terkunci region', async () => {
    const { repository, service } = harness();
    const result = await service.listCrossOrgEditorial(lockedSteward, {});
    expect(result.ok).toBe(false);
    expect(repository.readCrossOrgEditorialScope).not.toHaveBeenCalled();
  });

  it('arsip lintas-org lewat org pemilik, bukan org aktif', async () => {
    const { repository, service } = harness();
    const result = await service.archiveArticle(steward, { id: ARTICLE, expectedVersion: 2, ownerOrganizationId: OWNER });
    expect(result.ok).toBe(true);
    expect(repository.executeForOrganization).toHaveBeenCalledTimes(1);
    expect(repository.execute).not.toHaveBeenCalled();
    const targetOrg = (repository.executeForOrganization as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(targetOrg).toBe(OWNER);
  });

  it('arsip se-org tetap lewat jalur normal', async () => {
    const { repository, service } = harness();
    await service.archiveArticle(steward, { id: ARTICLE, expectedVersion: 2 });
    expect(repository.execute).toHaveBeenCalledTimes(1);
    expect(repository.executeForOrganization).not.toHaveBeenCalled();
  });

  it('menolak tulis lintas-org tanpa grant super_admin', async () => {
    const { repository, service } = harness();
    const result = await service.archiveArticle(plain, { id: ARTICLE, expectedVersion: 2, ownerOrganizationId: OWNER });
    expect(result.ok).toBe(false);
    expect(repository.executeForOrganization).not.toHaveBeenCalled();
    expect(repository.execute).not.toHaveBeenCalled();
  });

  it('hapus lintas-org menolak artikel masih tayang', async () => {
    const { service } = harness();
    const result = await service.deleteArticle(steward, { id: ARTICLE, expectedVersion: 2, ownerOrganizationId: OWNER });
    expect(result.ok).toBe(false);
  });

  it('hapus ditolak saat bridge masih tayang', async () => {
    const { repository, service } = harness({ hasPublishedBridges: vi.fn(async () => true) });
    const result = await service.deleteArticle(steward, { id: ARTICLE, expectedVersion: 2, ownerOrganizationId: OWNER });
    expect(result.ok).toBe(false);
    expect(repository.executeForOrganization).not.toHaveBeenCalled();
    expect(repository.execute).not.toHaveBeenCalled();
  });

  it('entri liveblog lintas-org diteruskan dengan cakupan pemilik', async () => {
    const listArticleUpdates = vi.fn(async () => []);
    const createArticleUpdate = vi.fn(async () => ({ id: 'e-1' }));
    const { service } = harness({ listArticleUpdates, createArticleUpdate });
    const listed = await service.listArticleUpdates(steward, { articleId: ARTICLE, ownerOrganizationId: OWNER });
    expect(listed.ok).toBe(true);
    expect(listArticleUpdates).toHaveBeenCalledWith(
      steward, 'article.manage', { articleId: ARTICLE }, { organizationId: OWNER },
    );
    const created = await service.createArticleUpdate(steward, { articleId: ARTICLE, body: 'Skor 1-0.', ownerOrganizationId: OWNER });
    expect(created.ok).toBe(true);
    expect(createArticleUpdate).toHaveBeenCalledWith(
      steward, 'article.manage', { articleId: ARTICLE, body: 'Skor 1-0.' }, { organizationId: OWNER },
    );
  });

  it('entri liveblog se-org tidak membawa cakupan pemilik', async () => {
    const listArticleUpdates = vi.fn(async () => []);
    const { service } = harness({ listArticleUpdates });
    await service.listArticleUpdates(steward, { articleId: ARTICLE });
    expect(listArticleUpdates).toHaveBeenCalledWith(steward, 'article.manage', { articleId: ARTICLE }, undefined);
  });

  it('menolak entri liveblog lintas-org tanpa grant dan untuk steward terkunci region', async () => {
    const listArticleUpdates = vi.fn(async () => []);
    const denied = await harness({ listArticleUpdates }).service.listArticleUpdates(plain, { articleId: ARTICLE, ownerOrganizationId: OWNER });
    expect(denied.ok).toBe(false);
    const locked = await harness({ listArticleUpdates }).service.listArticleUpdates(lockedSteward, { articleId: ARTICLE, ownerOrganizationId: OWNER });
    expect(locked.ok).toBe(false);
    expect(listArticleUpdates).not.toHaveBeenCalled();
  });

  it('ubah lintas-org lewat org pemilik dan mempertahankan tag', async () => {
    const { repository, service, ownerState } = harness();
    const result = await service.updateArticle(steward, {
      id: ARTICLE, expectedVersion: 2, title: 'Berita UPT Baru', slug: 'berita-upt',
      regionId: null, status: 'active', ownerOrganizationId: OWNER,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(repository.executeForOrganization).toHaveBeenCalledTimes(1);
    expect(repository.execute).not.toHaveBeenCalled();
    expect((repository.executeForOrganization as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe(OWNER);
    expect(result.value.title).toBe('Berita UPT Baru');
    expect(result.value.tags).toEqual(['humas']);
    expect((ownerState.articles?.[0] as { title: string }).title).toBe('Berita UPT Baru');
  });

  it('ubah se-org tetap lewat jalur normal', async () => {
    const { repository, service } = harness();
    await service.updateArticle(steward, { id: ARTICLE, expectedVersion: 2, title: 'X', slug: 'x', regionId: null });
    expect(repository.execute).toHaveBeenCalledTimes(1);
    expect(repository.executeForOrganization).not.toHaveBeenCalled();
  });

  it('menolak ubah lintas-org tanpa grant dan untuk steward terkunci region', async () => {
    const denied = await harness().service.updateArticle(plain, { id: ARTICLE, expectedVersion: 2, title: 'X', slug: 'x', regionId: null, ownerOrganizationId: OWNER });
    expect(denied.ok).toBe(false);
    const locked = await harness().service.updateArticle(lockedSteward, { id: ARTICLE, expectedVersion: 2, title: 'X', slug: 'x', regionId: null, ownerOrganizationId: OWNER });
    expect(locked.ok).toBe(false);
  });

  it('edit.load memuat artikel pemilik beserta lookup org-nya', async () => {
    const { repository, service } = harness();
    const result = await service.readArticleForEdit(steward, { id: ARTICLE, ownerOrganizationId: OWNER });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.article.id).toBe(ARTICLE);
    expect(result.value.lookups.categories).toEqual([{ id: 'c-berita', name: 'Berita' }]);
    expect((repository.executeForOrganization as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe(OWNER);
  });

  it('menolak edit.load tanpa grant dan untuk steward terkunci region', async () => {
    const denied = await harness().service.readArticleForEdit(plain, { id: ARTICLE, ownerOrganizationId: OWNER });
    expect(denied.ok).toBe(false);
    const locked = await harness().service.readArticleForEdit(lockedSteward, { id: ARTICLE, ownerOrganizationId: OWNER });
    expect(locked.ok).toBe(false);
  });

  it('edit.load se-org memuat artikel sendiri tanpa grant steward', async () => {
    const sameOrg = { ...steward, organizationId: OWNER, platformPermissionSet: new Set<string>() };
    const { repository, service } = harness();
    const result = await service.readArticleForEdit(sameOrg, { id: ARTICLE, ownerOrganizationId: OWNER });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.article.id).toBe(ARTICLE);
    expect(result.value.lookups.categories).toEqual([{ id: 'c-berita', name: 'Berita' }]);
    expect((repository.executeForOrganization as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe(OWNER);
  });

  it('menolak edit.load se-org tanpa article.manage dan untuk redaksi terkunci region di luar cakupan', async () => {
    const sameOrg = { ...steward, organizationId: OWNER, platformPermissionSet: new Set<string>() };
    const noManage = { ...sameOrg, permissionSet: new Set<string>(['article.read']) };
    const denied = await harness().service.readArticleForEdit(noManage, { id: ARTICLE, ownerOrganizationId: OWNER });
    expect(denied.ok).toBe(false);
    const lockedOut = { ...sameOrg, regionScopeId: 'region-1' };
    const locked = await harness().service.readArticleForEdit(lockedOut, { id: ARTICLE, ownerOrganizationId: OWNER });
    expect(locked.ok).toBe(false);
  });
});
