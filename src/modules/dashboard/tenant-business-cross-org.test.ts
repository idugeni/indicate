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
  status: 'active',
  version: 2,
  archivedAt: null,
  title: 'Berita UPT',
};

function harness(repoOverrides: Record<string, unknown> = {}) {
  const ownerState: Record<string, unknown[]> = {
    articles: [{ ...ownerArticle }],
    regions: [],
    articleSites: [],
    publishingJobs: [],
    articleCategories: [],
  };
  const repository = {
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
});
