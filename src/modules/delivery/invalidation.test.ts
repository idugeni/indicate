import { describe, expect, it, vi } from 'vitest';

import { InvalidationDispatcher, planInvalidation } from '@/modules/delivery/invalidation';
import type { InvalidationTask } from '@/modules/delivery/models';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';

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
  );
  return { dispatcher, repository, cloudflare, failures };
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

  it('mencakup path statis baru pada rencana invalidasi', () => {
    const plan = planInvalidation({ kind: 'site_settings', organizationId: 'org-1', siteId: 'site-1', hostname: 'tenant.example' });
    expect(plan.paths).toEqual(expect.arrayContaining(['/llms.txt', '/news-sitemap.xml', '/tenant-home', '/report']));
  });

  it('memanaskan url artikel setelah task selesai tanpa menggagalkan batch', async () => {
    const warmed: string[] = [];
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', []), tags: ['site:site-1', 'host:tenant.example', 'article:slug-a'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = { warmArticle: vi.fn(async (url: string) => { warmed.push(url); return { pageOk: true, imageOk: true, facebookOk: true }; }) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmed).toEqual(['https://tenant.example/slug-a']);
  });

  it('warmer yang melempar tidak menggagalkan task yang selesai', async () => {
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', []), tags: ['site:site-1', 'host:tenant.example', 'article:slug-a'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = {
      warmArticle: vi.fn(async () => {
        throw new Error('warm_down');
      }),
    };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
  });

  it('membatasi pemanasan delapan url per dispatch', async () => {
    const warmed: string[] = [];
    const tagsFor = (articles: readonly string[]) => ['site:site-1', 'host:tenant.example', ...articles.map((slug) => `article:${slug}`)];
    const repository = {
      claimInvalidations: vi.fn(async () => [
        { ...task('task-1', []), tags: tagsFor(['a-1', 'a-2', 'a-3', 'a-4', 'a-5']) },
        { ...task('task-2', []), tags: tagsFor(['b-1', 'b-2', 'b-3', 'b-4', 'b-5']) },
      ]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = { warmArticle: vi.fn(async (url: string) => { warmed.push(url); return { pageOk: true, imageOk: true, facebookOk: true }; }) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 2, failed: 0, stranded: 0 });
    expect(warmed).toHaveLength(8);
    expect(warmed).toEqual([...new Set(warmed)]);
  });

  it('tidak memanaskan saat task gagal', async () => {
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', []), tags: ['site:site-1', 'host:tenant.example', 'article:slug-a'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = {
      revalidateTags: vi.fn(async () => { throw new Error('next_unavailable'); }),
      revalidatePaths: vi.fn(async () => {}),
    };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = { warmArticle: vi.fn(async () => ({ pageOk: true, imageOk: true, facebookOk: true })) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 0, failed: 1, stranded: 0 });
    expect(socialWarm.warmArticle).not.toHaveBeenCalled();
  });

  it('tidak memanaskan tag tanpa host atau artikel', async () => {
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', []), tags: ['site:site-1'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = { warmArticle: vi.fn(async () => ({ pageOk: true, imageOk: true, facebookOk: true })) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(socialWarm.warmArticle).not.toHaveBeenCalled();
  });

  it('memanaskan batch secara paralel dalam satu dispatch', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const repository = {
      claimInvalidations: vi.fn(async () => [{ ...task('task-1', []), tags: ['site:site-1', 'host:tenant.example', 'article:a-1', 'article:a-2', 'article:a-3'] }]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = {
      warmArticle: vi.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => { setTimeout(resolve, 20); });
        inFlight -= 1;
        return { pageOk: true, imageOk: true, facebookOk: true };
      }),
    };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(socialWarm.warmArticle).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('hanya memanaskan url unik sekali per dispatch', async () => {
    const warmed: string[] = [];
    const tags = ['site:site-1', 'host:tenant.example', 'article:slug-a'];
    const repository = {
      claimInvalidations: vi.fn(async () => [
        { ...task('task-1', []), tags },
        { ...task('task-2', []), tags },
      ]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const socialWarm = { warmArticle: vi.fn(async (url: string) => { warmed.push(url); return { pageOk: true, imageOk: true, facebookOk: true }; }) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, socialWarm);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 2, failed: 0, stranded: 0 });
    expect(warmed).toEqual(['https://tenant.example/slug-a']);
  });
});
