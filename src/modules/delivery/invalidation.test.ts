import { describe, expect, it, vi } from 'vitest';

import { InvalidationDispatcher, planInvalidation } from '@/modules/delivery/invalidation';
import { logEvent } from '@/core/observability/logger';
import type { InvalidationTask } from '@/modules/delivery/models';
import type { SocialWarmLedger, SocialWarmTarget } from '@/modules/delivery/ports';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';

vi.mock('@/core/observability/logger', () => ({ logEvent: vi.fn() }));

const logMock = vi.mocked(logEvent);

const WARM_OK = { pageOk: true, imageOk: true, facebookOk: true } as const;

type WarmOutcome = { readonly pageOk: boolean; readonly imageOk: boolean; readonly facebookOk: boolean };
type Warmer = { warmArticle: (url: string) => Promise<WarmOutcome> };

function target(index: number): SocialWarmTarget {
  return { articleSiteId: `article-site-${index}`, url: `https://tenant.example/s-${index}` };
}

function ledger(targets: readonly SocialWarmTarget[], options: { readonly dueFails?: boolean; readonly markFails?: boolean } = {}) {
  return {
    dueTargets: vi.fn(async () => {
      if (options.dueFails === true) throw new Error('ledger_unavailable');
      return targets;
    }),
    markWarmed: vi.fn(async () => {
      if (options.markFails === true) throw new Error('mark_unavailable');
    }),
  };
}

function warmHarness(options: { readonly warmer: Warmer; readonly ledger: SocialWarmLedger; readonly tasks?: readonly InvalidationTask[]; readonly completeFails?: boolean }) {
  const repository = {
    claimInvalidations: vi.fn(async () => options.tasks ?? [task('task-1', [])]),
    completeInvalidation: vi.fn(async () => {
      if (options.completeFails === true) throw new Error('next_unavailable');
    }),
    failInvalidation: vi.fn(async () => {}),
  };
  const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
  const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
  const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, options.warmer, options.ledger);
  return { dispatcher, repository };
}

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

  it('memanaskan url artikel yang belum pernah dipanaskan lalu menandainya', async () => {
    const warmed: string[] = [];
    const warmer = { warmArticle: vi.fn(async (url: string) => { warmed.push(url); return WARM_OK; }) };
    const socialLedger = ledger([target(0)]);
    const { dispatcher } = warmHarness({ warmer, ledger: socialLedger });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmed).toEqual(['https://tenant.example/s-0']);
    expect(socialLedger.markWarmed).toHaveBeenCalledWith(['article-site-0'], expect.any(Date));
  });

  it('warmer yang melempar tidak menggagalkan task yang selesai dan url tetap due', async () => {
    const socialLedger = ledger([target(0)]);
    const { dispatcher } = warmHarness({ warmer: { warmArticle: vi.fn(async () => { throw new Error('warm_down'); }) }, ledger: socialLedger });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(socialLedger.markWarmed).not.toHaveBeenCalled();
  });

  it('tidak menandai url yang ditolak meta agar tetap due', async () => {
    const socialLedger = ledger([target(0), target(1)]);
    const warmer = { warmArticle: vi.fn(async (url: string) => (url.endsWith('/s-1') ? { pageOk: true, imageOk: true, facebookOk: false } : WARM_OK)) };
    const { dispatcher } = warmHarness({ warmer, ledger: socialLedger });
    await dispatcher.dispatch(new Date(), 10);
    expect(socialLedger.markWarmed).toHaveBeenCalledWith(['article-site-0'], expect.any(Date));
  });

  it('tidak menandai apa pun saat ledger tidak punya target due', async () => {
    const warmer = { warmArticle: vi.fn(async () => WARM_OK) };
    const socialLedger = ledger([]);
    const { dispatcher } = warmHarness({ warmer, ledger: socialLedger });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmer.warmArticle).not.toHaveBeenCalled();
    expect(socialLedger.markWarmed).not.toHaveBeenCalled();
  });

  it('ledger yang gagal tidak menggagalkan dispatch dan target tetap due', async () => {
    logMock.mockClear();
    const warmer = { warmArticle: vi.fn(async () => WARM_OK) };
    const socialLedger = ledger([target(0)], { dueFails: true });
    const { dispatcher } = warmHarness({ warmer, ledger: socialLedger });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmer.warmArticle).not.toHaveBeenCalled();
    expect(logMock.mock.calls.some((call) => call[1]?.event === 'delivery.social_warm.due_failed')).toBe(true);
  });

  it('penandaan yang gagal dilaporkan dan url tetap due untuk dispatch berikutnya', async () => {
    logMock.mockClear();
    const socialLedger = ledger([target(0)], { markFails: true });
    const { dispatcher } = warmHarness({ warmer: { warmArticle: vi.fn(async () => WARM_OK) }, ledger: socialLedger });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(logMock.mock.calls.some((call) => call[1]?.event === 'delivery.social_warm.mark_failed')).toBe(true);
  });

  it('tidak menyentuh ledger tanpa token meta karena tidak ada yang bisa dihangatkan', async () => {
    const socialLedger = ledger([target(0)]);
    const repository = {
      claimInvalidations: vi.fn(async () => [task('task-1', [])]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, null, socialLedger);
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(socialLedger.dueTargets).not.toHaveBeenCalled();
  });

  it('tidak menyentuh ledger saat tidak ada task yang selesai', async () => {
    const socialLedger = ledger([target(0)]);
    const { dispatcher } = warmHarness({ warmer: { warmArticle: vi.fn(async () => WARM_OK) }, ledger: socialLedger, completeFails: true });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 0, failed: 1, stranded: 0 });
    expect(socialLedger.dueTargets).not.toHaveBeenCalled();
  });

  it('tetap bekerja tanpa ledger untuk pemurnian cache saja', async () => {
    const repository = {
      claimInvalidations: vi.fn(async () => [task('task-1', ['https://tenant.example/a'])]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async () => {}),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const cloudflare = { purgeExactUrls: vi.fn(async () => {}), purgeHostname: vi.fn(async () => {}) };
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5, { warmArticle: vi.fn(async () => WARM_OK) });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
  });

  it('memanaskan seluruh antrean due tanpa memotong url yang sudah selesai', async () => {
    const warmed: string[] = [];
    const targets = Array.from({ length: 10 }, (_, index) => target(index));
    const warmer = { warmArticle: vi.fn(async (url: string) => { warmed.push(url); return WARM_OK; }) };
    const { dispatcher } = warmHarness({ warmer, ledger: ledger(targets) });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmed).toHaveLength(10);
    expect(new Set(warmed).size).toBe(10);
  });

  it('mempertahankan lebar paralel delapan per batch', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const targets = Array.from({ length: 10 }, (_, index) => target(index));
    const warmer = {
      warmArticle: vi.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => { setTimeout(resolve, 5); });
        inFlight -= 1;
        return WARM_OK;
      }),
    };
    const { dispatcher } = warmHarness({ warmer, ledger: ledger(targets) });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmer.warmArticle).toHaveBeenCalledTimes(10);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(8);
  });

  it('mencatat url yang gagal dipanaskan beserta tahapnya', async () => {
    logMock.mockClear();
    const targets = [{ articleSiteId: 'as-good', url: 'https://tenant.example/good' }, { articleSiteId: 'as-no-image', url: 'https://tenant.example/no-image' }, { articleSiteId: 'as-fb', url: 'https://tenant.example/fb-rejected' }];
    const warmer = {
      warmArticle: vi.fn(async (url: string) => {
        if (url.endsWith('/no-image')) return { pageOk: true, imageOk: false, facebookOk: false };
        if (url.endsWith('/fb-rejected')) return { pageOk: true, imageOk: true, facebookOk: false };
        return WARM_OK;
      }),
    };
    const socialLedger = ledger(targets);
    const { dispatcher } = warmHarness({ warmer, ledger: socialLedger });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    const incomplete = logMock.mock.calls.filter((call) => call[1]?.event === 'delivery.social_warm.incomplete');
    expect(incomplete).toHaveLength(1);
    const context = incomplete[0]?.[1]?.context as { failed: number; failures: { url: string; imageOk: boolean; facebookOk: boolean }[] };
    expect(context.failed).toBe(2);
    expect(context.failures).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: 'https://tenant.example/no-image', imageOk: false }),
      expect.objectContaining({ url: 'https://tenant.example/fb-rejected', facebookOk: false }),
    ]));
    expect(logMock.mock.calls.some((call) => call[1]?.event === 'delivery.social_warm.complete')).toBe(false);
    expect(socialLedger.markWarmed).toHaveBeenCalledWith(['as-good'], expect.any(Date));
  });

  it('melaporkan url yang tidak sempat dipanaskan karena melewati batas antrean', async () => {
    logMock.mockClear();
    const targets = Array.from({ length: 70 }, (_, index) => target(index));
    const warmer = { warmArticle: vi.fn(async () => WARM_OK) };
    const { dispatcher } = warmHarness({ warmer, ledger: ledger(targets) });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmer.warmArticle).toHaveBeenCalledTimes(64);
    const truncated = logMock.mock.calls.filter((call) => call[1]?.event === 'delivery.social_warm.truncated');
    expect(truncated).toHaveLength(1);
    expect((truncated[0]?.[1]?.context as { truncated: number }).truncated).toBe(6);
  });

  it('memanaskan batch secara paralel dalam satu dispatch', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const warmer = {
      warmArticle: vi.fn(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => { setTimeout(resolve, 20); });
        inFlight -= 1;
        return WARM_OK;
      }),
    };
    const { dispatcher } = warmHarness({ warmer, ledger: ledger([target(0), target(1), target(2)]) });
    await expect(dispatcher.dispatch(new Date(), 10)).resolves.toEqual({ completed: 1, failed: 0, stranded: 0 });
    expect(warmer.warmArticle).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBeGreaterThan(1);
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
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5);
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
    const dispatcher = new InvalidationDispatcher(repository, nextCache, cloudflare as unknown as CloudflareAuthorityPort, [5], 5);
    await dispatcher.dispatch(new Date(), 10);
    const purged = vi.mocked(cloudflare.purgeExactUrls).mock.calls[0]?.[0] as readonly string[];
    expect(purged[0]).toBe(articleUrl);
    expect(purged).toHaveLength(300);
  });
});
