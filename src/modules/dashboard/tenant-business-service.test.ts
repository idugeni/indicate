import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import {
  DashboardAccessDeniedError,
  DashboardRateLimitedError,
  DashboardSubscriptionInactiveError,
} from '@/modules/dashboard/ports';

const actor = {
  actorType: 'api_key',
  actorId: 'key-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'api',
  requestId: 'req-1',
} as const;

const SITE_ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';

function harness(enqueueCachePurge: (...args: never[]) => Promise<never>) {
  const repository = {
    enqueueCachePurge,
    recordDenied: vi.fn(async () => undefined),
  };
  const service = new TenantBusinessService(
    repository as never,
    { create: () => 'id-1' },
    { now: () => new Date('2026-09-18T14:00:00.000Z') },
  );
  return { repository, service };
}

describe('TenantBusinessService purgeSiteCache', () => {
  it('menolak bulk tanpa confirmBulk sebagai invalid input', async () => {
    const { service } = harness(vi.fn(async () => []) as never);
    const result = await service.purgeSiteCache(actor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('meneruskan purge satu situs ke repository', async () => {
    const sites = [{ siteId: SITE_ID, hostname: 'fakta01.my.id' }];
    const { service, repository } = harness(vi.fn(async () => sites) as never);
    const result = await service.purgeSiteCache(actor, { siteId: SITE_ID });
    expect(result.ok).toBe(true);
    expect(repository.enqueueCachePurge).toHaveBeenCalledWith(actor, 'site.manage', SITE_ID);
  });

  it('memetakan cooldown bulk ke rate limited dan mencatat denial', async () => {
    const { service, repository } = harness(vi.fn(async () => {
      throw new DashboardRateLimitedError(120);
    }) as never);
    const result = await service.purgeSiteCache(actor, { confirmBulk: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RATE_LIMITED');
    expect(result.error.error.message).toContain('120');
    expect(repository.recordDenied).toHaveBeenCalledWith(actor, 'site.cache.purge', 'site');
  });

  it('memetakan langganan nonaktif ke forbidden', async () => {
    const { service } = harness(vi.fn(async () => {
      throw new DashboardSubscriptionInactiveError('past_due');
    }) as never);
    const result = await service.purgeSiteCache(actor, { confirmBulk: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('FORBIDDEN');
  });

  it('memetakan akses ditolak ke denial non-disclosing', async () => {
    const { service } = harness(vi.fn(async () => {
      throw new DashboardAccessDeniedError();
    }) as never);
    const result = await service.purgeSiteCache(actor, { confirmBulk: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});


describe('TenantBusinessService createArticleWithId', () => {
  function createHarness() {
    const state = {
      articles: [] as Record<string, unknown>[],
      articleCategories: [] as Record<string, unknown>[],
      regions: [] as Record<string, unknown>[],
      publishers: [] as Record<string, unknown>[],
      categories: [{ id: 'category-1', name: 'Berita', slug: 'berita', status: 'active' }] as Record<string, unknown>[],
      authors: [] as Record<string, unknown>[],
      media: [] as Record<string, unknown>[],
      articleSites: [] as Record<string, unknown>[],
    };
    const transaction = {
      state,
      appendAudit: vi.fn(),
      refreshArticleContent: vi.fn(async () => undefined),
      articleContentTouched: new Set<string>(),
    };
    const repository = {
      execute: vi.fn(async (_actor: unknown, _permission: string, work: (tx: typeof transaction) => unknown) => work(transaction)),
      enqueueCachePurge: vi.fn(async () => []),
      recordDenied: vi.fn(async () => undefined),
    };
    const service = new TenantBusinessService(
      repository as never,
      { create: () => 'generated-id' },
      { now: () => new Date('2026-10-09T10:00:00.000Z') },
    );
    const authorizedActor = {
      actorType: 'user',
      actorId: 'user-1',
      verifiedAuthUserId: 'auth-1',
      organizationId: 'org-1',
      permissionSet: new Set<string>(['article.manage']),
      platformPermissionSet: new Set<string>(),
      entryPoint: 'dashboard',
      requestId: 'req-create',
    } as const;
    return { state, transaction, repository, service, authorizedActor };
  }

  it('uses the approval-bound ID and preserves the requested slug exactly', async () => {
    const { state, service, authorizedActor } = createHarness();
    const result = await service.createArticleWithId(authorizedActor, {
      regionId: null,
      slug: 'artikel-baru',
      title: 'Artikel baru',
      body: 'Isi artikel',
      status: 'draft',
    }, '11111111-1111-4111-8111-111111111111');
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.ok).toBe(true);
    expect(result.value.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(result.value.slug).toBe('artikel-baru');
    expect(state.articles).toHaveLength(1);
  });

  it('rejects a slug collision instead of silently suffixing it on an approval-backed create', async () => {
    const { state, service, authorizedActor } = createHarness();
    const input = { regionId: null, slug: 'artikel-baru', title: 'Artikel baru', body: 'Isi artikel', status: 'draft' as const };
    const first = await service.createArticleWithId(authorizedActor, input, '11111111-1111-4111-8111-111111111111');
    expect(first.ok).toBe(true);
    const second = await service.createArticleWithId(authorizedActor, { ...input, title: 'Artikel berbeda' }, '22222222-2222-4222-8222-222222222222');
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error('expected slug collision');
    expect(second.error.error.code).toBe('CONFLICT');
    expect(state.articles).toHaveLength(1);
    expect(state.articles[0]?.slug).toBe('artikel-baru');
  });
});
