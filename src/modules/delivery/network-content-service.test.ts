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
} = {}) {
  const repository = {
    loadNetworkSite: vi.fn(async () => siteData),
    loadNetworkBundle: vi.fn(async () => ({ site: options.bundleSite === undefined ? siteData : options.bundleSite })),
    isCacheBypassed: vi.fn(async () => options.bypassed ?? false),
  };
  const cache = {
    read: vi.fn(async (identity: unknown) => options.cachedEntry ?? { identity, data: siteData }),
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

  it('memakai bundle untuk preview dan kelas terautentikasi', async () => {
    const preview = harness();
    await preview.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID', preview: true });
    expect(preview.cache.read).not.toHaveBeenCalled();

    const authed = harness();
    await authed.service.load(CONTEXT, {}, { path: '/', locale: 'id-ID', authClass: 'authenticated' });
    expect(authed.cache.read).not.toHaveBeenCalled();
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
