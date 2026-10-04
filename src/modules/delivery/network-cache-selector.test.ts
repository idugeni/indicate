import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';

const CONTEXT = {
  normalizedHostname: 'portal.example',
  organizationId: 'o1',
  domainId: 'd1',
  siteId: 's1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 1,
};

const load = vi.fn(async (...args: readonly unknown[]) => {
  void args;
  return makeNetworkSite([makeNetworkArticle()]);
});

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-host': 'portal.example' }),
}));

vi.mock('next/cache', () => ({
  cacheLife: () => {},
  cacheTag: () => {},
}));

vi.mock('react', () => ({
  cache: <T>(fn: T): T => fn,
}));

vi.mock('@/integrations/redis/pageview-buffer', () => ({
  readPageviewCounts: async () => [[0]],
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({ config: { seo: { defaultLocale: 'id-ID' } } }),
}));

vi.mock('@/modules/delivery', () => ({
  deliveryComposition: async () => ({
    config: { seo: { defaultLocale: 'id-ID' } },
    resolver: { classify: async () => ({ kind: 'site', context: CONTEXT }) },
    content: { load: (...args: unknown[]) => load(...args) },
  }),
  activeDeliveryComposition: () => ({
    repository: { isCacheBypassed: async () => false },
    content: { load: (...args: unknown[]) => load(...args) },
  }),
}));

const { resolveNetworkSite } = await import('@/modules/delivery/network-runtime');

function cachePaths(): readonly string[] {
  return load.mock.calls.map((call) => (call[2] as unknown as { path: string }).path);
}

describe('resolveNetworkSite cache selectors', () => {
  beforeEach(() => {
    load.mockClear();
  });

  it('shares one cache entry across every machine surface asking for the listing', async () => {
    for (const path of ['/', '/rss.xml', '/sitemap.xml', '/news-sitemap.xml', '/llms.txt', '/tenant-home']) {
      await resolveNetworkSite({}, path);
    }
    expect(cachePaths()).toEqual(['/', '/', '/', '/', '/', '/']);
  });

  it('keys each content selector separately so listings never share a detail entry', async () => {
    await resolveNetworkSite({}, '/');
    await resolveNetworkSite({ articleSlug: 'satu' }, '/satu');
    await resolveNetworkSite({ categorySlug: 'agama' }, '/categories/agama');
    await resolveNetworkSite({ tag: 'daerah' }, '/tags/daerah');
    expect(cachePaths()).toEqual(['/', '/article/satu', '/category/agama', '/tag/daerah']);
  });

  it('keeps the requesting path for search so unbounded keys stay on the seconds loader', async () => {
    await resolveNetworkSite({ search: 'berita' }, '/search');
    expect(cachePaths()).toEqual(['/search']);
  });
});
