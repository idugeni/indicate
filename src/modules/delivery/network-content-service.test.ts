import { describe, expect, it, vi } from 'vitest';

import { NetworkContentService } from '@/modules/delivery/network-content-service';

const CONTEXT: {
  readonly normalizedHostname: string;
  readonly organizationId: string;
  readonly domainId: string;
  readonly siteId: string;
  readonly regionId: string | null;
  readonly routingVersion: number;
  readonly contentVersion: number;
} = {
  normalizedHostname: 'portal.example',
  organizationId: 'org-1',
  domainId: 'd-1',
  siteId: 'site-1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 3,
};

const siteData = {
  context: { ...CONTEXT },
  regionName: null,
  settings: {},
  articles: [],
};

function harness(options: {
  readonly bypassed?: boolean;
  readonly bundleSite?: typeof siteData | null;
  readonly cachedEntry?: { readonly identity: unknown; readonly data: unknown } | null;
  readonly withCache?: boolean;
  readonly feed?: readonly unknown[];
  readonly cachedFeed?: readonly unknown[];
} = {}) {
  const repository = {
    loadNetworkSite: vi.fn(async () => siteData),
    loadNetworkBundle: vi.fn(async () => ({ site: options.bundleSite === undefined ? siteData : options.bundleSite })),
    isCacheBypassed: vi.fn(async () => options.bypassed ?? false),
    loadNetworkFeed: vi.fn(async () => options.feed ?? []),
  };
  const cache = {
    read: vi.fn(async (identity: unknown, tags: readonly string[]) => {
      void tags;
      if (options.cachedEntry !== undefined) return options.cachedEntry;
      return { identity, data: options.cachedFeed ?? siteData };
    }),
  };
  const service = new NetworkContentService(
    repository as never,
    options.withCache === false ? undefined : (cache as never),
  );
  return { repository, cache, service };
}

describe('NetworkContentService query sanitization', () => {
  it('menormalkan slug, tag, dan search', async () => {
    const { service, repository } = harness();
    await service.load(CONTEXT, { articleSlug: '  Berita-Utama ', tag: ' x ', search: ' y ' });
    expect(repository.loadNetworkBundle).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ articleSlug: 'berita-utama', tag: 'x', search: 'y' }),
    );
  });

  it('membuang tag dan search kosong', async () => {
    const { service, repository } = harness();
    await service.load(CONTEXT, { tag: '   ', search: '' });
    expect(repository.loadNetworkBundle).toHaveBeenCalledWith(CONTEXT, {});
  });
});

describe('NetworkContentService cache paths', () => {
  it('memakai bundle langsung saat bypass', async () => {
    const { service, repository, cache } = harness({ bypassed: true });
    const result = await service.load(CONTEXT, {}, { path: '/', locale: 'id-ID' });
    expect(result).toEqual(siteData);
    expect(repository.loadNetworkBundle).toHaveBeenCalledTimes(1);
    expect(cache.read).not.toHaveBeenCalled();
  });

  it('memakai status bypass yang sudah di-resolve runtime', async () => {
    const { service, repository } = harness({ bypassed: false });
    await service.load(CONTEXT, {}, { path: '/', locale: 'id-ID' }, true);
    expect(repository.isCacheBypassed).not.toHaveBeenCalled();
    expect(repository.loadNetworkBundle).toHaveBeenCalledTimes(1);
  });

  it('memakai bundle untuk preview dan kelas terautentikasi', async () => {
    const preview = harness();
    await preview.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID', preview: true });
    expect(preview.cache.read).not.toHaveBeenCalled();

    const authed = harness();
    await authed.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID', authClass: 'authenticated' });
    expect(authed.cache.read).not.toHaveBeenCalled();
  });

  it('tidak membaca status bypass saat cache tidak akan dipakai', async () => {
    const preview = harness();
    await preview.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID', preview: true });
    expect(preview.repository.isCacheBypassed).not.toHaveBeenCalled();

    const authed = harness();
    await authed.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID', authClass: 'authenticated' });
    expect(authed.repository.isCacheBypassed).not.toHaveBeenCalled();

    const uncached = harness({ withCache: false });
    await uncached.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID' });
    expect(uncached.repository.isCacheBypassed).not.toHaveBeenCalled();
  });

  it('menyajikan entri cache yang cocok', async () => {
    const { service, cache } = harness();
    const result = await service.load(CONTEXT, {}, { path: '/', locale: 'id-ID' });
    expect(result).toEqual(siteData);
    expect(cache.read).toHaveBeenCalledTimes(1);
  });

  it('jatuh ke load saat identitas cache tidak cocok', async () => {
    const { service, repository } = harness({
      cachedEntry: { identity: { embedded: { hostname: 'lain.example' } }, data: siteData },
    });
    const result = await service.load(CONTEXT, {}, { path: '/', locale: 'id-ID' });
    expect(result).toEqual(siteData);
    expect(repository.loadNetworkSite).toHaveBeenCalledTimes(1);
  });

  it('mengembalikan null untuk bundle hilang dan konteks asing', async () => {
    const missing = harness({ bundleSite: null });
    await expect(missing.service.load(CONTEXT, {})).resolves.toBe(null);

    const foreign = harness({ bundleSite: { ...siteData, context: { ...CONTEXT, organizationId: 'org-asing' } } });
    await expect(foreign.service.load(CONTEXT, {})).resolves.toBe(null);
  });
});

describe('NetworkContentService feed cache', () => {
  const feed = [{ id: 'a-1', slug: 'berita', title: 'Berita' }];

  it('menyajikan feed dari data cache bertag host, org, dan site', async () => {
    const { service, repository, cache } = harness({ feed, cachedFeed: feed });
    const result = await service.loadFeed(CONTEXT, 50);
    expect(result).toEqual(feed);
    expect(cache.read).toHaveBeenCalledTimes(1);
    expect(repository.loadNetworkFeed).not.toHaveBeenCalled();
    expect(cache.read.mock.calls[0]?.[1]).toEqual(['host:portal.example', 'org:org-1', 'site:site-1']);
  });

  it('memuat feed langsung tanpa cache port', async () => {
    const { service, repository, cache } = harness({ feed, withCache: false });
    await expect(service.loadFeed(CONTEXT, 25)).resolves.toEqual(feed);
    expect(cache.read).not.toHaveBeenCalled();
    expect(repository.loadNetworkFeed).toHaveBeenCalledWith(CONTEXT, 25);
  });

  it('jatuh ke repository saat identitas cache tidak cocok', async () => {
    const { service, repository } = harness({ feed, cachedEntry: { identity: { embedded: { hostname: 'lain.example' } }, data: [] } });
    await expect(service.loadFeed(CONTEXT, 50)).resolves.toEqual(feed);
    expect(repository.loadNetworkFeed).toHaveBeenCalledTimes(1);
  });
});
