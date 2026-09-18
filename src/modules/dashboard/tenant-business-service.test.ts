import { describe, expect, it, vi } from 'vitest';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import {
  DashboardAccessDeniedError,
  DashboardRateLimitedError,
  DashboardSubscriptionInactiveError,
} from '@/modules/dashboard/ports';

const actor = {
  actorType: 'telegram',
  actorId: 'mapping-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'telegram',
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
