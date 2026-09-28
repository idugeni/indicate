import { describe, expect, it, expectTypeOf } from 'vitest';

import { DrizzleDeliveryRepository } from '@/data/repos/delivery';
import { isNetworkArticle } from '@/modules/delivery/models';
import type { ArticleListItem, NetworkArticle } from '@/modules/delivery/models';

const CONTEXT = {
  normalizedHostname: 'portal.example',
  organizationId: 'o1',
  domainId: 'd1',
  siteId: 's1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 1,
} as const;

const SETTINGS_ROW = {
  name: 'Portal',
  description: 'Deskripsi portal.',
  tagline: null,
  seoDefaultTitle: null,
  seoDefaultDescription: null,
  seoOpenGraphSiteName: null,
  locale: 'id-ID',
  colors: {},
  socialLinks: {},
  seo: {},
  navigation: [],
  logoMediaId: 'logo-1',
  faviconMediaId: null,
  defaultMediaId: null,
  regionName: null,
  siteCreatedAt: new Date('2026-09-01T00:00:00.000Z'),
};

function articleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    slug: 'berita-utama',
    title: 'Judul Utama',
    originHost: CONTEXT.normalizedHostname,
    tags: [],
    regionId: 'r1',
    categoryId: null,
    categorySlug: null,
    categoryName: null,
    authorName: null,
    authorDisplayName: null,
    authorBio: null,
    authorAvatarUrl: null,
    publisherName: null,
    attribution: null,
    publisherLogoUrl: null,
    publisherCity: null,
    publisherBio: null,
    publisherContacts: null,
    publisherType: 'independent_publisher',
    publisherVerification: 'verified',
    publishedAt: new Date('2026-09-14T10:00:00.000Z'),
    updatedAt: new Date('2026-09-14T10:00:00.000Z'),
    leadMediaId: null,
    leadMediaType: null,
    leadObjectKey: null,
    leadMediaWidth: null,
    leadMediaHeight: null,
    leadMediaFocalX: null,
    leadMediaFocalY: null,
    coverImageUrl: 'https://portal.example/cover.jpg',
    mediaState: null,
    leadThumbKey: null,
    customTitle: null,
    customDescription: 'Deskripsi kustom yang sudah final dari redaksi.',
    bodyExcerpt: null,
    customImageMediaId: null,
    customMediaType: null,
    customObjectKey: null,
    customMediaWidth: null,
    customMediaHeight: null,
    customMediaFocalX: null,
    customMediaFocalY: null,
    customThumbKey: null,
    affiliationInstitution: null,
    articleSiteId: 'as1',
    viewCount: 0,
    ...overrides,
  };
}

function chainable(rows: readonly unknown[], limitLog?: number[]): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return (resolve: (value: unknown) => void) => resolve(rows);
        if (prop === 'limit' && limitLog !== undefined) {
          return (bound: number) => {
            limitLog.push(bound);
            return chainable(rows.slice(0, bound), limitLog);
          };
        }
        return () => chainable(rows, limitLog);
      },
    },
  );
}

interface SelectLog {
  readonly keys: readonly string[];
}

function harness(handlers: {
  readonly settings?: readonly unknown[];
  readonly articles?: readonly unknown[];
  readonly body?: readonly unknown[];
  readonly gallery?: readonly unknown[];
  readonly feed?: readonly unknown[];
  readonly categories?: readonly unknown[];
  readonly brand?: readonly unknown[] | readonly (readonly unknown[])[];
  readonly publicHost?: string | null;
}) {
  const selectLog: SelectLog[] = [];
  const limitLog: number[] = [];
  const settings = handlers.settings ?? [SETTINGS_ROW];
  const articles = handlers.articles ?? [articleRow()];
  const body = handlers.body ?? [];
  const gallery = handlers.gallery ?? [];
  const feed = handlers.feed ?? [];
  const brandSets = (
    handlers.brand === undefined || handlers.brand.length === 0 || Array.isArray(handlers.brand[0])
      ? (handlers.brand ?? [[{ mediaId: 'm-brand' }]]) as readonly (readonly unknown[])[]
      : [handlers.brand] as readonly (readonly unknown[])[]
  );
  let brandCursor = 0;
  const transaction = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'execute') return async () => [];
        if (prop === 'select')
          return (projection: Record<string, unknown>) => {
            const keys = Object.keys(projection ?? {});
            selectLog.push({ keys });
            const only = (...wanted: readonly string[]) =>
              wanted.length === keys.length && wanted.every((key) => keys.includes(key));
            if (only('body') || only('body', 'bodyJson')) return chainable(body, limitLog);
            if (keys.includes('sortOrder')) return chainable(gallery, limitLog);
            if (only('mediaId')) {
              const set = brandSets[Math.min(brandCursor, brandSets.length - 1)] ?? [];
              brandCursor += 1;
              return chainable(set, limitLog);
            }
            if (keys.includes('logoMediaId')) return chainable(settings, limitLog);
            if (keys.includes('bodyExcerpt')) return chainable(articles, limitLog);
            if (keys.includes('body') && keys.includes('slug')) return chainable(feed, limitLog);
            if (only('slug', 'name')) return chainable(handlers.categories ?? [], limitLog);
            return chainable([], limitLog);
          };
        return () => transaction;
      },
    },
  );
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  const repository = new DrizzleDeliveryRepository(database as never, 'https://portal.example/brand/default.jpg', handlers.publicHost ?? null);
  return { repository, selectLog, limitLog };
}

describe('readSite projection', () => {
  it('listing tidak memilih body penuh dan tidak query galeri', async () => {
    const { repository, selectLog } = harness({});
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site).not.toBe(null);
    const articleKeys = selectLog.filter((entry) => entry.keys.includes('bodyExcerpt')).map((entry) => entry.keys);
    expect(articleKeys).toHaveLength(1);
    expect(articleKeys[0]).not.toContain('body');
    expect(selectLog.filter((entry) => entry.keys.includes('sortOrder'))).toHaveLength(0);
    expect(selectLog).toHaveLength(2);
    const item = site?.articles[0];
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('body');
    expect(item).not.toHaveProperty('gallery');
    expect(item?.description).toBe('Deskripsi kustom yang sudah final dari redaksi.');
  });

  it('menautkan artikel milik sendiri secara relatif agar hemat byte', async () => {
    const { repository } = harness({});
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]?.href).toBe('/berita-utama');
  });

  it('menautkan artikel warisan turunan ke host kota asalnya', async () => {
    const { repository } = harness({ articles: [articleRow({ originHost: 'kota.apex.example' })] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]?.href).toBe('https://kota.apex.example/berita-utama');
  });

  it('detail artikel tunggal membawa body penuh dan galeri', async () => {
    const { repository, selectLog } = harness({
      body: [{ body: 'Isi penuh artikel untuk halaman detail.' }],
      gallery: [{ id: 'g1', objectKey: 'o/o1/p/article-inline/y=2026/m=09/article/a1/14-g1-0123456789abcdef.webp', thumbObjectKey: null, altText: 'Pasar pagi', caption: 'Suasana pasar', widthPx: 1200, heightPx: 675, mediaType: 'image/webp', sortOrder: 0 }],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const item = site?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('body', 'Isi penuh artikel untuk halaman detail.');
    expect(item).toHaveProperty('gallery');
    expect(selectLog).toHaveLength(4);
    expectTypeOf(item).toEqualTypeOf<ArticleListItem | undefined>();
    if (item !== undefined && isNetworkArticle(item)) {
      expectTypeOf(item).toEqualTypeOf<NetworkArticle>();
    }
  });

  it('detail artikel kaya membawa bodyJson dan deskripsi dari teks terstruktur', async () => {
    const richDoc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Berita kaya terstruktur untuk deskripsi.' }] }] };
    const { repository } = harness({
      articles: [articleRow({ customDescription: null, excerpt: null, bodyExcerpt: null })],
      body: [{ body: 'Teks warisan.', bodyJson: richDoc }],
      gallery: [{ id: 'g1', objectKey: 'o/o1/p/article-inline/y=2026/m=09/article/a1/14-g1-0123456789abcdef.webp', thumbObjectKey: null, altText: 'Pasar pagi', caption: 'Suasana pasar', widthPx: 1200, heightPx: 675, mediaType: 'image/webp', sortOrder: 0 }],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const item = site?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('body', 'Teks warisan.');
    expect(item).toHaveProperty('bodyJson', richDoc);
    expect(item?.description).toContain('Berita kaya terstruktur');
  });

  it('memetakan dimensi alami sampul unggahan', async () => {
    const { repository } = harness({
      articles: [
        articleRow({
          leadMediaId: 'm-1',
          leadMediaType: 'image/webp',
          leadMediaWidth: 1200,
          leadMediaHeight: 675,
          leadMediaFocalX: 30,
          leadMediaFocalY: 70,
          mediaState: 'active',
          coverImageUrl: null,
        }),
      ],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    const item = site?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('imageWidth', 1200);
    expect(item).toHaveProperty('imageHeight', 675);
    expect(item).toHaveProperty('imageFocalX', 30);
    expect(item).toHaveProperty('imageFocalY', 70);
  });

  it('memproyeksikan galeri dengan alt, caption, dan dimensi', async () => {
    const { repository } = harness({
      body: [{ body: 'Isi penuh artikel untuk halaman detail.' }],
      gallery: [{ id: 'g1', objectKey: 'o/o1/p/article-inline/y=2026/m=09/article/a1/14-g1-0123456789abcdef.webp', thumbObjectKey: null, altText: 'Pasar pagi', caption: 'Suasana pasar', widthPx: 1200, heightPx: 675, mediaType: 'image/webp', sortOrder: 2 }],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const item = site?.articles[0];
    expect(item).toBeDefined();
    if (item !== undefined && isNetworkArticle(item)) {
      expect(item.gallery).toHaveLength(1);
      expect(item.gallery[0]).toMatchObject({ id: 'g1', alt: 'Pasar pagi', caption: 'Suasana pasar', width: 1200, height: 675, mediaType: 'image/webp' });
    } else {
      throw new Error('expected detail article with gallery');
    }
  });

  it('memetakan galeri organisasi lewat jalur referensi bodyJson', async () => {
    const doc = { type: 'doc', content: [{ type: 'image', attrs: { src: 'media:0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: 'Potret' } }] };
    const { repository } = harness({
      body: [{ body: 'Lihat potret.', bodyJson: doc }],
      gallery: [{ id: '0199a2b3-4c5d-7e8f-9012-3456789abcde', objectKey: 'o/o1/p/article-inline/y=2026/m=09/organization/14-g-0123456789abcdef.webp', thumbObjectKey: null, altText: null, caption: null, widthPx: 800, heightPx: 600, mediaType: 'image/webp', sortOrder: 0 }],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const item = site?.articles[0];
    expect(item).toBeDefined();
    if (item !== undefined && isNetworkArticle(item)) {
      expect(item.gallery).toHaveLength(1);
      expect(item.gallery[0]).toMatchObject({ id: '0199a2b3-4c5d-7e8f-9012-3456789abcde', alt: null, width: 800, height: 600 });
    } else {
      throw new Error('expected detail article with gallery');
    }
  });

  it('mengosongkan dimensi saat sampul berupa hotlink luar', async () => {
    const { repository } = harness({});
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('imageWidth', null);
    expect(item).toHaveProperty('imageHeight', null);
  });

  it('membawa kanonis artikel sendiri ke setiap portal', async () => {
    const { repository } = harness({
      articles: [articleRow({ canonicalUrl: 'https://sumber.example/berita-utama' })],
    });
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('canonicalUrl', 'https://sumber.example/berita-utama');
  });

  it('membawa kanonis URL tenant bila artikel tidak menetapkannya', async () => {
    const { repository } = harness({ articles: [articleRow({ canonicalUrl: null })] });
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toHaveProperty('canonicalUrl', null);
  });

  it('memakai url publik langsung untuk sampul pub', async () => {
    const { repository } = harness({
      publicHost: 'media.indicate.website',
      articles: [
        articleRow({
          leadMediaId: 'm-1',
          leadMediaType: 'image/webp',
          leadObjectKey: 'pub/o/o1/p/article-cover/y=2026/foto-abcdef1234567890.webp',
          mediaState: 'active',
          coverImageUrl: null,
        }),
      ],
    });
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty(
      'imageUrl',
      'https://media.indicate.website/pub/o/o1/p/article-cover/y=2026/foto-abcdef1234567890.webp',
    );
  });

  it('kembali ke route bertanda saat host publik tak dikonfigurasi', async () => {
    const { repository } = harness({
      articles: [
        articleRow({
          leadMediaId: 'm-1',
          leadMediaType: 'image/webp',
          leadObjectKey: 'pub/o/o1/p/article-cover/y=2026/foto-abcdef1234567890.webp',
          mediaState: 'active',
          coverImageUrl: null,
        }),
      ],
    });
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('imageUrl', 'https://portal.example/api/network/media/m-1');
  });

  it('memproyeksikan override robots per kopi', async () => {
    const { repository } = harness({
      articles: [articleRow({ robotsDirective: 'noindex,nofollow' })],
    });
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('robotsDirective', 'noindex, nofollow');
  });

  it('mewarisi default situs saat robots kopi null', async () => {
    const { repository } = harness({ articles: [articleRow({ robotsDirective: null })] });
    const item = (await repository.loadNetworkSite({ ...CONTEXT }, {}))?.articles[0];
    expect(item).toBeDefined();
    expect(item).toHaveProperty('robotsDirective', null);
  });

  it('customDescription null jatuh ke excerpt 600 karakter kepala', async () => {
    const head = `${'kata '.repeat(150)}<b>rusak`;
    const { repository } = harness({
      articles: [articleRow({ customDescription: null, bodyExcerpt: head })],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    const description = site?.articles[0]?.description ?? '';
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(180);
    expect(description.endsWith(' ')).toBe(false);
    expect(description).not.toContain('<b>');
  });
});

describe('public bundle and category nav reads', () => {
  it('bundle tidak lagi membaca kanal yang tidak pernah dibaca', async () => {
    const { repository, selectLog } = harness({});
    const bundle = await repository.loadNetworkBundle({ ...CONTEXT }, {});
    expect(bundle.bypassed).toBe(false);
    expect(selectLog.some((entry) => entry.keys.includes('slug') && entry.keys.includes('name') && entry.keys.length === 2)).toBe(false);
  });

  it('baca kanal dibatasi di SQL sesuai jumlah kanal yang dirender', async () => {
    const { repository, limitLog } = harness({
      categories: Array.from({ length: 64 }, (_, i) => ({ slug: `kanal-${i}`, name: `Kanal ${i}` })),
    });
    await expect(repository.loadSiteCategories({ ...CONTEXT }, 6)).resolves.toHaveLength(6);
    expect(limitLog).toContain(6);
  });
});

describe('loadSiteShell', () => {
  it('tanpa query artikel untuk 404 bermerek', async () => {
    const { repository, selectLog } = harness({});
    const shell = await repository.loadSiteShell({ ...CONTEXT });
    expect(shell).not.toBe(null);
    expect(shell?.articles).toEqual([]);
    expect(shell?.settings.name).toBe('Portal');
    expect(selectLog).toHaveLength(1);
    expect(selectLog.some((entry) => entry.keys.includes('slug') || entry.keys.includes('body'))).toBe(false);
  });

  it('null bila settings situs tidak ada', async () => {
    const { repository } = harness({ settings: [] });
    await expect(repository.loadSiteShell({ ...CONTEXT })).resolves.toBe(null);
  });
});

describe('resolveBrandMediaId', () => {
  it('mengembalikan id media milik situs', async () => {
    const { repository } = harness({ brand: [{ mediaId: 'logo-1' }] });
    await expect(repository.resolveBrandMediaId({ ...CONTEXT }, 'logo')).resolves.toBe('logo-1');
  });

  it('mewarisi apex untuk regional bila milik null', async () => {
    const { repository } = harness({ brand: [[{ mediaId: null }], [{ mediaId: 'apex-logo' }]] });
    await expect(repository.resolveBrandMediaId({ ...CONTEXT, regionId: 'r1' }, 'logo')).resolves.toBe('apex-logo');
  });

  it('null bila tak ada media', async () => {
    const { repository } = harness({ brand: [] });
    await expect(repository.resolveBrandMediaId({ ...CONTEXT }, 'favicon')).resolves.toBe(null);
  });
});

describe('loadNetworkFeed', () => {  it('menyertakan body penuh untuk RSS', async () => {
    const feedRow = {
      id: 'a1',
      slug: 'berita-utama',
      title: 'Judul Utama',
      originHost: CONTEXT.normalizedHostname,
      description: null,
      body: 'Isi penuh untuk content:encoded RSS.',
      coverImageUrl: null,
      customImageMediaId: null,
      customMediaType: null,
      leadMediaId: null,
      leadMediaType: null,
      mediaState: null,
      publishedAt: new Date('2026-09-14T10:00:00.000Z'),
      categoryName: null,
    };
    const { repository, selectLog } = harness({ feed: [feedRow] });
    const feed = await repository.loadNetworkFeed({ ...CONTEXT }, 50);
    expect(feed).toHaveLength(1);
    expect(feed[0]?.body).toBe('Isi penuh untuk content:encoded RSS.');
    expect(feed[0]?.href).toBe('/berita-utama');
    expect(selectLog.some((entry) => entry.keys.includes('body'))).toBe(true);
  });

  it('menautkan item RSS ke host kota asal saat portal hanya aggregating', async () => {
    const feedRow = {
      id: 'a1', slug: 'berita-utama', title: 'Judul Utama', originHost: 'kota.apex.example',
      description: null, body: 'Isi.', coverImageUrl: null, customImageMediaId: null, customMediaType: null,
      leadMediaId: null, leadMediaType: null, mediaState: null, publishedAt: new Date('2026-09-14T10:00:00.000Z'), categoryName: null,
    };
    const { repository } = harness({ feed: [feedRow] });
    const feed = await repository.loadNetworkFeed({ ...CONTEXT }, 50);
    expect(feed[0]?.href).toBe('https://kota.apex.example/berita-utama');
  });
});
