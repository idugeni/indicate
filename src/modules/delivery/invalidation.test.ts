import { describe, expect, it, vi } from 'vitest';

import { InvalidationDispatcher, planInvalidation } from '@/modules/delivery/invalidation';
import { logEvent } from '@/core/observability/logger';
import type { InvalidationTask } from '@/modules/delivery/models';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';

vi.mock('@/core/observability/logger', () => ({ logEvent: vi.fn() }));

const logMock = vi.mocked(logEvent);

function task(id: string, urls: readonly string[]): InvalidationTask {
  return {
    organizationId: 'org-1',
    siteId: 'site-1',
    previousHostname: null,
    currentHostname: 'tenant.example',
    tags: ['site:site-1'],
    paths: ['/'],
    urls,
    reason: 'article.changed',
    id,
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    status: 'processing',
    claimToken: 'claim-1',
    claimExpiresAt: new Date(Date.now() + 30_000).toISOString(),
    sanitizedFailure: null,
  };
}

function harness(options: { readonly purgeFails?: boolean; readonly revalidateFails?: boolean; readonly completeFailIds?: readonly string[]; readonly failFailIds?: readonly string[] }) {
  const failures: { failure: Readonly<Record<string, unknown>> }[] = [];
  const repository = {
    claimInvalidations: vi.fn(async () => [
      task('task-1', ['https://tenant.example/', 'https://tenant.example/a']),
      task('task-2', ['https://tenant.example/a', 'https://tenant.example/b']),
    ]),
    completeInvalidation: vi.fn(async (candidate: InvalidationTask) => {
      if (options.completeFailIds?.includes(candidate.id) === true) throw new Error('poison_task');
    }),
    failInvalidation: vi.fn(async (candidate: unknown, failure: Readonly<Record<string, unknown>>) => {
      if (options.failFailIds?.includes((candidate as InvalidationTask).id) === true) throw new Error('fail_poison');
      failures.push({ failure });
    }),
  };
  const nextCache = {
    revalidateTags: vi.fn(async () => {
      if (options.revalidateFails === true) throw new Error('next_unavailable');
    }),
    revalidatePaths: vi.fn(async () => {
      if (options.revalidateFails === true) throw new Error('next_unavailable');
    }),
  };
  const cloudflare = {
    purgeExactUrls: vi.fn(async () => {
      if (options.purgeFails === true) throw new Error('cloudflare_unavailable');
    }),
    purgeHostname: vi.fn(async () => {}),
  };
  const dispatcher = new InvalidationDispatcher(
    repository,
    nextCache,
    cloudflare as unknown as CloudflareAuthorityPort,
    [5],
    5,
    300,
  );
  return { dispatcher, repository, nextCache, cloudflare, failures };
}

describe('InvalidationDispatcher', () => {
  it('purge edge sekali per batch dan tetap menyelesaikan task saat purge gagal', async () => {
    const { dispatcher, cloudflare, failures } = harness({ purgeFails: true });
    const summary = await dispatcher.dispatch(new Date(), 10);
    expect(summary).toEqual({ completed: 2, failed: 0, stranded: 0 });
    expect(failures).toHaveLength(0);
    expect(cloudflare.purgeExactUrls).toHaveBeenCalledTimes(1);
    expect(cloudflare.purgeExactUrls).toHaveBeenCalledWith([
      'https://tenant.example/',
      'https://tenant.example/a',
      'https://tenant.example/b',
    ]);
    expect(cloudflare.purgeHostname).not.toHaveBeenCalled();
  });

  it('mencatat tahap yang gagal pada sanitized_failure', async () => {
    const { dispatcher, failures } = harness({ revalidateFails: true });
    const summary = await dispatcher.dispatch(new Date(), 10);
    expect(summary).toEqual({ completed: 0, failed: 2, stranded: 0 });
    expect(failures).toHaveLength(2);
    expect(failures[0]?.failure).toMatchObject({ code: 'provider_unavailable', step: 'revalidate' });
  });

  it('task beracun tidak menghentikan batch dan dihitung stranded', async () => {
    const { dispatcher, repository } = harness({ completeFailIds: ['task-1'], failFailIds: ['task-1'] });
    const summary = await dispatcher.dispatch(new Date(), 10);
    expect(summary).toEqual({ completed: 1, failed: 0, stranded: 1 });
    expect(repository.completeInvalidation).toHaveBeenCalledTimes(2);
    expect(repository.failInvalidation).toHaveBeenCalledTimes(1);
  });

  it('menyerahkan lease dari policy ke claim, bukan durasi tetap', async () => {
    const { dispatcher, repository } = harness({});
    await dispatcher.dispatch(new Date(), 10);
    expect(repository.claimInvalidations).toHaveBeenCalledWith(expect.any(String), 10, 300);
  });

  it('menjalankan task batch secara tumpang tindih agar muat dalam lease', async () => {
    const tasks = Array.from({ length: 12 }, (_, index) => task(`task-${index}`, []));
    let inFlight = 0;
    let peak = 0;
    const repository = {
      claimInvalidations: vi.fn(async () => tasks),
      completeInvalidation: vi.fn(async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
      }),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async (_urls: readonly string[]) => {}), purgeHostname: vi.fn(async () => {}) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, 300);
    await expect(dispatcher.dispatch(new Date(), 100)).resolves.toEqual({ completed: 12, failed: 0, stranded: 0 });
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it('menyelesaikan task walau purge edge macet, karena purge jalan belakangan', async () => {
    const order: string[] = [];
    const repository = {
      claimInvalidations: vi.fn(async () => [task('task-1', ['https://tenant.example/'])]),
      completeInvalidation: vi.fn(async () => {
        order.push('complete');
      }),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = {
      purgeExactUrls: vi.fn(async (_urls: readonly string[]) => {
        order.push('purge');
        await new Promise((resolve) => setTimeout(resolve, 50));
      }),
      purgeHostname: vi.fn(async () => {}),
    };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, 300);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(order).toEqual(['complete', 'purge']);
  });

  it('mencakup path statis baru pada rencana invalidasi', () => {
    const plan = planInvalidation({ kind: 'site_settings', organizationId: 'org-1', siteId: 'site-1', hostname: 'tenant.example' });
    expect(plan.paths).toEqual(expect.arrayContaining(['/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report']));
  });

  it('membatasi jumlah url purge per dispatch dan melaporkan sisanya', async () => {
    logMock.mockClear();
    const urls = Array.from({ length: 400 }, (_, index) => `https://tenant.example/p-${index}`);
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', urls), tags: ['site:site-1'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async (_urls: readonly string[]) => {}), purgeHostname: vi.fn(async () => {}) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, 300);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    const purged = vi.mocked(cloudflare.purgeExactUrls).mock.calls[0]?.[0] as readonly string[];
    expect(purged).toHaveLength(300);
    const deferred = logMock.mock.calls.filter((call) => call[1]?.event === 'delivery.invalidation.purge_deferred');
    expect(deferred).toHaveLength(1);
    expect(deferred[0]?.[1]?.context).toMatchObject({ requested: 400, purged: 300, deferred: 100, budget: 300 });
  });

  it('memprioritaskan url artikel saat anggaran purge harus memotong', async () => {
    const articleUrl = 'https://tenant.example/slug-a';
    const urls = [articleUrl, ...Array.from({ length: 400 }, (_, index) => `https://tenant.example/p-${index}`)];
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', urls), tags: ['site:site-1', 'host:tenant.example', 'article:slug-a'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async (_urls: readonly string[]) => {}), purgeHostname: vi.fn(async () => {}) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, 300);
    await dispatcher.dispatch(new Date(), 10);
    const purged = vi.mocked(cloudflare.purgeExactUrls).mock.calls[0]?.[0] as readonly string[];
    expect(purged[0]).toBe(articleUrl);
    expect(purged).toHaveLength(300);
  });

  it('menghangatkan url setelah purge dan tidak menggagalkan dispatch saat warmer rusak', async () => {
    const repository = {
      claimInvalidations: vi.fn(async () => [task('task-1', ['https://tenant.example/slug-a'])]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async (_urls: readonly string[]) => {}), purgeHostname: vi.fn(async () => {}) };
    const warmer = { prewarm: vi.fn(async (_urls: readonly string[]) => {}) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, 300, warmer);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmer.prewarm).toHaveBeenCalledTimes(1);
    expect(warmer.prewarm).toHaveBeenCalledWith(['https://tenant.example/slug-a']);
    const failing = { prewarm: vi.fn(async (_urls: readonly string[]): Promise<void> => { throw new Error('warmer down'); }) };
    const resilient = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, 300, failing);
    await expect(resilient.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
  });
});
