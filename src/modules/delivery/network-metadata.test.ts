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

const load = vi.fn();

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

vi.mock('@/core/config/bootstrap/bootstrap-config', () => ({
  getBootstrapConfig: () => ({ credentials: { facebookAppToken: { reveal: () => '28410585598598931|app-secret' } } }),
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

type CardImage = { url: string; alt?: string; width?: number; height?: number; type?: string };

const { networkMetadata } = await import('@/modules/delivery/network-runtime');

function images(value: unknown): readonly CardImage[] {
  const list = (value as { images?: unknown }).images;
  if (typeof list === 'string') return [{ url: list }];
  return (list ?? []) as readonly CardImage[];
}

async function meta(path: string, query: Parameters<typeof networkMetadata>[1] = {}) {
  return networkMetadata(path, query);
}

describe('networkMetadata social card completeness', () => {
  beforeEach(() => {
    load.mockReset();
  });

  it('menyamakan openGraph dan twitter:image pada halaman tag', async () => {
    load.mockResolvedValue(makeNetworkSite([makeNetworkArticle({ tags: [' regionally' as never] })].map((a) => ({ ...a, tags: ['daerah'] })) as never));
    const result = await meta('/tags/daerah', { tag: 'daerah' });
    expect(result.twitter).toBeDefined();
    const og = images(result.openGraph);
    const tw = images(result.twitter);
    expect(og).toHaveLength(1);
    expect(tw).toEqual(og);
    expect(tw[0]?.alt).toBe('Portal');
  });

  it('membawa alt pada twitter:image di halaman utama', async () => {
    load.mockResolvedValue(makeNetworkSite());
    const result = await meta('/');
    const tw = images(result.twitter) as readonly (CardImage & { width: number; height: number })[];
    expect(tw[0]?.alt).toBe('Portal');
    expect(tw[0]?.width).toBe(1200);
    expect(tw[0]?.height).toBe(630);
    expect(images(result.openGraph)).toEqual(tw);
  });

  it('menerbitkan og:image:type hanya dari mime yang benar-benar diketahui', async () => {
    load.mockResolvedValue(makeNetworkSite([makeNetworkArticle({ imageMediaType: 'image/webp', imageWidth: 800, imageHeight: 450 })] as never));
    const result = await meta('/berita-utama', { articleSlug: 'berita-utama' });
    const og = images(result.openGraph);
    expect(og[0]?.type).toBe('image/webp');
    expect(og[0]?.width).toBe(800);
    expect(og[0]?.height).toBe(450);
    expect(og[0]?.alt).toBe('Judul');
    expect(images(result.twitter)).toEqual(og);
  });

  it('tidak mengarang og:image:type saat mime tidak diketahui', async () => {
    load.mockResolvedValue(makeNetworkSite([makeNetworkArticle({ imageMediaType: 'text/html' })] as never));
    const result = await meta('/berita-utama', { articleSlug: 'berita-utama' });
    expect(images(result.openGraph)[0]?.type).toBeUndefined();
  });

  it('tidak mengarang og:image:type untuk gambar brand default', async () => {
    load.mockResolvedValue(makeNetworkSite());
    const result = await meta('/');
    expect(images(result.openGraph)[0]?.type).toBeUndefined();
  });

  it('menerbitkan mime dan dimensi asli gambar brand default', async () => {
    const site = makeNetworkSite();
    load.mockResolvedValue({
      ...site,
      settings: {
        ...site.settings,
        defaultImageMediaType: 'image/jpeg',
        defaultImageWidth: 1024,
        defaultImageHeight: 512,
      },
    });
    const result = await meta('/');
    const og = images(result.openGraph);
    expect(og[0]?.type).toBe('image/jpeg');
    expect(og[0]?.width).toBe(1024);
    expect(og[0]?.height).toBe(512);
    expect(images(result.twitter)).toEqual(og);
  });

  it('menolak mime yang bukan gambar', async () => {
    const site = makeNetworkSite();
    load.mockResolvedValue({
      ...site,
      settings: { ...site.settings, defaultImageMediaType: 'application/pdf' },
    });
    const result = await meta('/');
    expect(images(result.openGraph)[0]?.type).toBeUndefined();
  });
});

describe('fb:app_id tenant coverage', () => {
  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue(makeNetworkSite([makeNetworkArticle({ tags: ['daerah'] } as never)]));
  });

  const surfaces: readonly (readonly [string, Parameters<typeof networkMetadata>[1]])[]
    = [
      ['halaman utama', {}],
      ['artikel', { articleSlug: 'berita-utama' }],
      ['kategori', { categorySlug: 'daerah' }],
      ['tag', { tag: 'daerah' }],
      ['pencarian', { search: 'daerah' }],
    ];

  for (const [name, query] of surfaces) {
    it(`menerbitkan fb:app_id di ${name}`, async () => {
      expect((await meta('/', query)).facebook).toEqual({ appId: '28410585598598931' });
    });
  }
});

describe('tenant brand isolation', () => {
  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue(makeNetworkSite([makeNetworkArticle({ tags: ['daerah'] } as never)]));
  });

  const surfaces: readonly (readonly [string, Parameters<typeof networkMetadata>[1]])[]
    = [
      ['halaman utama', {}],
      ['artikel', { articleSlug: 'berita-utama' }],
      ['kategori', { categorySlug: 'daerah' }],
      ['tag', { tag: 'daerah' }],
      ['pencarian', { search: 'daerah' }],
    ];

  for (const [name, query] of surfaces) {
    it(`mengikat application-name dan publisher ke tenant di ${name}`, async () => {
      const metadata = await meta('/', query);
      expect(metadata.applicationName).toBe('Portal');
      expect(metadata.publisher).toBe('Portal');
    });

    it(`tidak mewarisi brand control-plane di ${name}`, async () => {
      const metadata = await meta('/', query);
      expect(metadata.creator).toBeNull();
      expect(metadata.category).toBeNull();
      expect(JSON.stringify(metadata)).not.toContain('Indicate');
      expect(JSON.stringify(metadata)).not.toContain('News Platform');
    });
  }
});

describe('utility surfaces stay non-indexable', () => {
  beforeEach(() => {
    load.mockReset();
    load.mockResolvedValue(makeNetworkSite());
  });

  it('menandai /report noindex agar tidak bersaing dengan artikel', async () => {
    const metadata = await networkMetadata('/report', {}, undefined, undefined, 'noindex, nofollow');
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it('membiarkan dokumen tenant biasa tetap indexable', async () => {
    const metadata = await networkMetadata('/tentang', {}, 'Tentang', 'Deskripsi.');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
});


