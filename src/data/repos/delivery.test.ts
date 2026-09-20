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
};

function articleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    slug: 'berita-utama',
    title: 'Judul Utama',
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
    coverImageUrl: 'https://portal.example/cover.jpg',
    mediaState: null,
    leadThumbKey: null,
    customTitle: null,
    customDescription: 'Deskripsi kustom yang sudah final dari redaksi.',
    bodyExcerpt: null,
    customImageMediaId: null,
    customMediaType: null,
    customThumbKey: null,
    affiliationInstitution: null,
    articleSiteId: 'as1',
    viewCount: 0,
    ...overrides,
  };
}

function chainable(rows: readonly unknown[]): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') return (resolve: (value: unknown) => void) => resolve(rows);
        return () => chainable(rows);
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
}) {
  const selectLog: SelectLog[] = [];
  const settings = handlers.settings ?? [SETTINGS_ROW];
  const articles = handlers.articles ?? [articleRow()];
  const body = handlers.body ?? [];
  const gallery = handlers.gallery ?? [];
  const feed = handlers.feed ?? [];
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
            if (only('body')) return chainable(body);
            if (only('id', 'thumbObjectKey')) return chainable(gallery);
            if (keys.includes('logoMediaId')) return chainable(settings);
            if (keys.includes('bodyExcerpt')) return chainable(articles);
            if (keys.includes('body') && keys.includes('slug')) return chainable(feed);
            return chainable([]);
          };
        return () => transaction;
      },
    },
  );
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  const repository = new DrizzleDeliveryRepository(database as never, 'https://portal.example/brand/default.jpg');
  return { repository, selectLog };
}

describe('readSite projection', () => {
  it('listing tidak memilih body penuh dan tidak query galeri', async () => {
    const { repository, selectLog } = harness({});
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site).not.toBe(null);
    const articleKeys = selectLog.filter((entry) => entry.keys.includes('bodyExcerpt')).map((entry) => entry.keys);
    expect(articleKeys).toHaveLength(1);
    expect(articleKeys[0]).not.toContain('body');
    expect(selectLog.filter((entry) => entry.keys.includes('id') && entry.keys.includes('thumbObjectKey'))).toHaveLength(0);
    expect(selectLog).toHaveLength(2);
    const item = site?.articles[0];
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('body');
    expect(item).not.toHaveProperty('gallery');
    expect(item?.description).toBe('Deskripsi kustom yang sudah final dari redaksi.');
  });

  it('detail artikel tunggal membawa body penuh dan galeri', async () => {
    const { repository, selectLog } = harness({
      body: [{ body: 'Isi penuh artikel untuk halaman detail.' }],
      gallery: [{ id: 'g1', thumbObjectKey: null }],
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

describe('loadNetworkFeed', () => {  it('menyertakan body penuh untuk RSS', async () => {
    const feedRow = {
      id: 'a1',
      slug: 'berita-utama',
      title: 'Judul Utama',
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
    expect(selectLog.some((entry) => entry.keys.includes('body'))).toBe(true);
  });
});
