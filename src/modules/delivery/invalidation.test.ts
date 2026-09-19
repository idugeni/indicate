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
});
