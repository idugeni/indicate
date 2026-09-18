import { describe, expect, it, vi } from 'vitest';

import { InvalidationDispatcher } from '@/modules/delivery/invalidation';
import type { InvalidationTask } from '@/modules/delivery/models';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';

function task(): InvalidationTask {
  return {
    organizationId: 'org-1',
    siteId: 'site-1',
    previousHostname: null,
    currentHostname: 'tenant.example',
    tags: ['site:site-1'],
    paths: ['/'],
    urls: ['https://tenant.example/'],
    reason: 'article.changed',
    id: 'task-1',
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    status: 'processing',
    claimToken: 'claim-1',
    claimExpiresAt: new Date(Date.now() + 30_000).toISOString(),
    sanitizedFailure: null,
  };
}

describe('InvalidationDispatcher', () => {
  it('mencatat tahap yang gagal pada sanitized_failure', async () => {
    const failures: { failure: Readonly<Record<string, unknown>> }[] = [];
    const repository = {
      claimInvalidations: vi.fn(async () => [task()]),
      completeInvalidation: vi.fn(async () => {}),
      failInvalidation: vi.fn(async (_task: unknown, failure: Readonly<Record<string, unknown>>) => {
        failures.push({ failure });
      }),
    };
    const nextCache = { revalidateTags: vi.fn(async () => {}), revalidatePaths: vi.fn(async () => {}) };
    const coordination = { incrementSiteVersion: vi.fn(async () => {}), setSiteBypass: vi.fn(async () => {}) };
    const cloudflare = {
      purgeExactUrls: vi.fn(async () => {
        throw new Error('cloudflare_unavailable');
      }),
      purgeHostname: vi.fn(async () => {}),
    };
    const dispatcher = new InvalidationDispatcher(
      repository,
      nextCache,
      coordination,
      cloudflare as unknown as CloudflareAuthorityPort,
      [5],
      5,
    );
    const summary = await dispatcher.dispatch(new Date(), 10);
    expect(summary).toEqual({ completed: 0, failed: 1 });
    expect(failures).toHaveLength(1);
    expect(failures[0]?.failure).toMatchObject({ code: 'provider_unavailable', step: 'purge_urls' });
  });
});
