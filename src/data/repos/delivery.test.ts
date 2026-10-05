import { beforeEach, describe, expect, it, expectTypeOf, vi } from 'vitest';

import { DrizzleDeliveryRepository, dedupeBridgeAssignmentRows, resolvePublisherAttribution } from '@/data/repos/delivery';
import { isNetworkArticle } from '@/modules/delivery/models';
import type { ArticleListItem, NetworkArticle } from '@/modules/delivery/models';

const recordOperation = vi.hoisted(() => vi.fn());

vi.mock('@/core/observability/operation-metrics', () => ({
  recordOperation,
}));

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
      get(target, prop) {
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
  readonly reportSitekey?: readonly unknown[];
  readonly adSettings?: readonly unknown[];
  readonly placements?: readonly unknown[];
  readonly bridgeAssignments?: readonly unknown[];
  readonly bridgeDetails?: readonly unknown[];
  readonly updates?: readonly unknown[];
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
  const executeStats = { assignedArticleReads: 0 };
  const transaction = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === 'execute')
          return async (query?: unknown) => {
            try {
              if (JSON.stringify(query ?? null)?.includes('fetch_assigned_articles')) executeStats.assignedArticleReads += 1;
            } catch {
              /* unserializable driver payload: not a bridge reader call */
            }
            return handlers.bridgeDetails ?? [];
          };
        if (prop === 'select')
          return (projection: Record<string, unknown>) => {
            const keys = Object.keys(projection ?? {});
            selectLog.push({ keys });
            const only = (...wanted: readonly string[]) =>
              wanted.length === keys.length && wanted.every((key) => keys.includes(key));
            if (only('body') || only('body', 'bodyJson')) return chainable(body, limitLog);
            if (keys.includes('sourceArticleId')) return chainable(handlers.bridgeAssignments ?? [], limitLog);
            if (keys.includes('sortOrder')) return chainable(gallery, limitLog);
            if (keys.includes('publishedAt') && !keys.includes('slug')) return chainable(handlers.updates ?? [], limitLog);
            if (only('mediaId')) {
              const set = brandSets[Math.min(brandCursor, brandSets.length - 1)] ?? [];
              brandCursor += 1;
              return chainable(set, limitLog);
            }
            if (keys.includes('slotId') && keys.includes('enabled')) return chainable(handlers.adSettings ?? [], limitLog);
            if (keys.includes('slotId')) return chainable(handlers.placements ?? [], limitLog);
            if (keys.includes('logoMediaId')) return chainable(settings, limitLog);
            if (keys.includes('bodyExcerpt')) return chainable(articles, limitLog);
            if (keys.includes('body') && keys.includes('slug')) return chainable(feed, limitLog);
            if (only('slug', 'name', 'articleCount', 'lastUpdatedAt')) return chainable(handlers.categories ?? [], limitLog);
            if (only('sitekey')) return chainable(handlers.reportSitekey ?? [{ sitekey: null }], limitLog);
            return chainable([], limitLog);
          };
        return () => transaction;
      },
    },
  );
  const database = { transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) };
  const repository = new DrizzleDeliveryRepository(database as never, 'https://portal.example/brand/default.jpg', handlers.publicHost ?? null);
  return { repository, selectLog, limitLog, executeStats };
}

describe('resolvePublisherAttribution', () => {
  it('mengembangkan label generik menjadi Redaksi {tenant}', () => {
    expect(resolvePublisherAttribution('Redaksi', 'Fakta01')).toBe('Redaksi Fakta01');
    expect(resolvePublisherAttribution('  redaksi  ', 'BacaZaman')).toBe('Redaksi BacaZaman');
  });

  it('melewatkan label spesifik apa adanya', () => {
    expect(resolvePublisherAttribution('Indicate Newsroom', 'Fakta01')).toBe('Indicate Newsroom');
    expect(resolvePublisherAttribution('Humas Lapas Semarang', 'Fakta01')).toBe('Humas Lapas Semarang');
    expect(resolvePublisherAttribution('Redaksi Fakta01', 'Fakta01')).toBe('Redaksi Fakta01');
  });

  it('memetakan atribusi generik per portal pada listing', async () => {
    const { repository } = harness({ articles: [articleRow({ publisherName: 'Redaksi', attribution: 'Redaksi' })] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]?.attribution).toBe('Redaksi Portal');
  });

  it('mempertahankan atribusi spesifik pada listing', async () => {
    const { repository } = harness({ articles: [articleRow({ publisherName: 'Indicate Newsroom', attribution: 'Indicate Newsroom' })] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]?.attribution).toBe('Indicate Newsroom');
  });
});

describe('readBridgeArticles', () => {
  const bridgeDetail = {
    article_id: 'art-upt-1',
    slug: 'berita-upt',
    title: 'Berita UPT',
    excerpt: 'Ringkasan UPT.',
    canonical_url: null,
    tags: ['wonosobo'],
    status: 'active',
    article_type: 'standard',
    is_sponsored: false,
    video_url: null,
    audio_url: null,
    duration_seconds: null,
    region_id: 'r-1',
    category_slug: null,
    category_name: null,
    publisher_name: 'RUTAN KELAS II B WONOSOBO',
    attribution: 'Humas Rutan Wonosobo',
    publisher_logo: null,
    publisher_city: 'Kab. Wonosobo',
    publisher_bio: null,
    publisher_verified: true,
    publisher_type: 'correctional_institution',
    author_display: 'Tim Redaksi',
    author_bio: null,
    author_avatar: null,
    author_url: null,
    cover_image_url: 'https://cdn.example/cover.jpg',
    lead_media_id: null,
    published_at: new Date('2026-10-04T10:00:00.000Z'),
    updated_at: new Date('2026-10-04T10:00:00.000Z'),
    body: 'Isi lengkap berita UPT.',
    body_json: null,
  };
  const bridgeAssignment = {
    id: 'bridge-1',
    siteId: 's1',
    sourceOrganizationId: 'org-upt',
    sourceArticleId: 'art-upt-1',
    publishedAt: new Date('2026-10-04T11:00:00.000Z'),
    originHost: 'portal.example',
  };

  it('menayangkan artikel pemilik di portal penyaji', async () => {
    const { repository } = harness({ articles: [], bridgeAssignments: [bridgeAssignment], bridgeDetails: [bridgeDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles).toHaveLength(1);
    expect(site?.articles[0]).toMatchObject({
      id: 'art-upt-1',
      slug: 'berita-upt',
      href: '/berita-upt',
      attribution: 'Humas Rutan Wonosobo',
      publisherVerified: true,
      officialInstitution: 'RUTAN KELAS II B WONOSOBO',
      imageUrl: 'https://cdn.example/cover.jpg',
      articleSiteId: 'bridge-1',
      viewCount: 0,
    });
  });

  it('membawa isi penuh untuk halaman detail bridge', async () => {
    const { repository } = harness({ articles: [], bridgeAssignments: [bridgeAssignment], bridgeDetails: [bridgeDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-upt' });
    const item = site?.articles[0];
    if (item === undefined || !isNetworkArticle(item)) throw new Error('expected detail article');
    expect(item.body).toBe('Isi lengkap berita UPT.');
    expect(item.gallery).toEqual([]);
  });

  it('menyelesaikan slug bridge menjadi id artikel pemilik', async () => {
    const { repository } = harness({ articles: [], bridgeAssignments: [bridgeAssignment], bridgeDetails: [bridgeDetail] });
    await expect(repository.resolveArticleId({ ...CONTEXT }, 'berita-upt')).resolves.toBe('art-upt-1');
    await expect(repository.resolveArticleId({ ...CONTEXT }, 'tidak-ada')).resolves.toBeNull();
  });

  it('satu reader call untuk banyak baris bridge satu org', async () => {
    const row = (id: string, articleId: string) => ({ ...bridgeAssignment, id, sourceArticleId: articleId });
    const { repository, executeStats } = harness({
      articles: [],
      bridgeAssignments: [row('b1', 'art-1'), row('b2', 'art-2'), row('b3', 'art-3')],
      bridgeDetails: [{ article_id: 'art-2', slug: 'target' }],
    });
    await expect(repository.resolveArticleId({ ...CONTEXT }, 'target')).resolves.toBe('art-2');
    expect(executeStats.assignedArticleReads).toBe(1);
  });

  it('satu call per org pemilik dan menang sesuai urutan bridge', async () => {
    const { repository, executeStats } = harness({
      articles: [],
      bridgeAssignments: [
        { ...bridgeAssignment, id: 'b1', sourceOrganizationId: 'org-a', sourceArticleId: 'art-1' },
        { ...bridgeAssignment, id: 'b2', sourceOrganizationId: 'org-b', sourceArticleId: 'art-2' },
      ],
      bridgeDetails: [
        { article_id: 'art-1', slug: 'target' },
        { article_id: 'art-2', slug: 'target' },
      ],
    });
    await expect(repository.resolveArticleId({ ...CONTEXT }, 'target')).resolves.toBe('art-1');
    expect(executeStats.assignedArticleReads).toBe(2);
  });

  it('memakai lead pemilik sebagai sampul saat cover kosong', async () => {
    const leadDetail = { ...bridgeDetail, cover_image_url: null, lead_media_id: 'lead-1' };
    const { repository } = harness({ articles: [], bridgeAssignments: [bridgeAssignment], bridgeDetails: [leadDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]).toMatchObject({ imageUrl: 'https://portal.example/api/network/media/lead-1' });
  });

  it('sampul bridge apex menunjuk portal kota pemilik', async () => {
    const cityRow = { ...bridgeAssignment, id: 'bridge-city', siteId: 's-city', originHost: 'wonosobo.portal.example' };
    const leadDetail = { ...bridgeDetail, cover_image_url: null, lead_media_id: 'lead-1' };
    const { repository } = harness({ articles: [], bridgeAssignments: [cityRow], bridgeDetails: [leadDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT, siteId: 's-apex' }, {});
    expect(site?.articles[0]).toMatchObject({ imageUrl: 'https://wonosobo.portal.example/api/network/media/lead-1' });
  });

  it('menggabungkan duplikat bridge apex dan kota menjadi satu baris', async () => {
    const apexRow = { ...bridgeAssignment, id: 'bridge-apex', siteId: 's-apex' };
    const cityRow = { ...bridgeAssignment, id: 'bridge-city', siteId: 's-city' };
    const { repository } = harness({ articles: [], bridgeAssignments: [apexRow, cityRow], bridgeDetails: [bridgeDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT, siteId: 's-apex' }, {});
    expect(site?.articles).toHaveLength(1);
    expect(site?.articles[0]).toMatchObject({ id: 'art-upt-1', articleSiteId: 'bridge-apex' });
  });

  it('menautkan bridge apex ke url portal kota pemilik', async () => {
    const cityRow = { ...bridgeAssignment, id: 'bridge-city', siteId: 's-city', originHost: 'wonosobo.portal.example' };
    const { repository } = harness({ articles: [], bridgeAssignments: [cityRow], bridgeDetails: [bridgeDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT, siteId: 's-apex' }, {});
    expect(site?.articles[0]).toMatchObject({ href: 'https://wonosobo.portal.example/berita-upt' });
  });

  it('memakai path relatif untuk bridge portal sendiri', async () => {
    const { repository } = harness({ articles: [], bridgeAssignments: [bridgeAssignment], bridgeDetails: [bridgeDetail] });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]).toMatchObject({ href: '/berita-upt' });
  });

  describe('instrumentasi delivery', () => {
    beforeEach(() => {
      recordOperation.mockReset();
    });

    function samples() {
      return recordOperation.mock.calls.map((call) => call[0] as Record<string, unknown>);
    }

    it('resolusi tenant mencatat satu query tanpa hostname mentah', async () => {
      const rows = [{
        hostname: 'portal.example', organization_id: 'o1', domain_id: 'd1', site_id: 's1',
        region_id: null, routing_version: 1, content_version: 1,
      }];
      const repository = new DrizzleDeliveryRepository({ execute: async () => rows } as never, 'https://portal.example/brand/default.jpg', null);
      await expect(repository.findActiveSitesByExactHostname('portal.example')).resolves.toHaveLength(1);
      expect(samples()).toHaveLength(1);
      expect(samples()[0]).toMatchObject({ route: 'delivery', operation: 'delivery.tenant-resolve', provider: 'supabase-postgres', dbQueries: 1, tenantId: 'o1' });
      expect(JSON.stringify(samples())).not.toContain('portal.example');
    });

    it('discover lokal mencatat dua query ber-tenant', async () => {
      const selectImpl = (projection: Record<string, unknown>) =>
        chainable(Object.keys(projection ?? {}).join(',') === 'id' ? [{ id: 'a1' }] : []);
      const transaction = new Proxy({}, { get: (_target, prop) => (prop === 'execute' ? async () => [] : prop === 'select' ? selectImpl : () => transaction) });
      const repository = new DrizzleDeliveryRepository({ transaction: async (callback: (tx: unknown) => unknown) => callback(transaction) } as never, 'https://portal.example/brand/default.jpg', null);
      await expect(repository.resolveArticleId({ ...CONTEXT }, 'berita-utama')).resolves.toBe('a1');
      expect(samples()).toHaveLength(1);
      expect(samples()[0]).toMatchObject({ route: 'delivery', operation: 'delivery.discover', dbQueries: 2, tenantId: 'o1' });
    });

    it('discover bridge menghitung select plus satu call per org', async () => {
      const { repository } = harness({
        articles: [],
        bridgeAssignments: [
          { ...bridgeAssignment, id: 'b1', sourceOrganizationId: 'org-a', sourceArticleId: 'art-1' },
          { ...bridgeAssignment, id: 'b2', sourceOrganizationId: 'org-b', sourceArticleId: 'art-2' },
        ],
        bridgeDetails: [{ article_id: 'art-2', slug: 'target' }],
      });
      await expect(repository.resolveArticleId({ ...CONTEXT }, 'target')).resolves.toBe('art-2');
      expect(samples()).toHaveLength(1);
      expect(samples()[0]).toMatchObject({ operation: 'delivery.discover', dbQueries: 5, tenantId: 'o1' });
    });
  });
});

describe('dedupeBridgeAssignmentRows', () => {
  const row = (id: string, siteId: string) => ({
    id,
    siteId,
    sourceOrganizationId: 'org-upt',
    sourceArticleId: 'art-upt-1',
    publishedAt: new Date('2026-10-05T09:17:46.000Z'),
  });

  it('memenangkan baris portal penyaji saat duplikat', () => {
    expect(dedupeBridgeAssignmentRows([row('a', 's-city'), row('b', 's-apex')], 's-apex')).toEqual([row('b', 's-apex')]);
  });

  it('mempertahankan baris pertama tanpa duplikat', () => {
    const rows = [row('a', 's-city'), { ...row('b', 's-city'), sourceArticleId: 'art-lain' }];
    expect(dedupeBridgeAssignmentRows(rows, 's-apex')).toEqual(rows);
  });

  it('kosong saat tanpa baris', () => {
    expect(dedupeBridgeAssignmentRows([], 's-apex')).toEqual([]);
  });
});

describe('loadReportChallengeSitekey', () => {
  it('membaca satu kolom dari domain tenant', async () => {
    const { repository, selectLog } = harness({ reportSitekey: [{ sitekey: '0x4AAAAAAFHN_lpLqmLytOD5' }] });
    expect(await repository.loadReportChallengeSitekey({ ...CONTEXT })).toBe('0x4AAAAAAFHN_lpLqmLytOD5');
    expect(selectLog).toEqual([{ keys: ['sitekey'] }]);
  });

  it('null saat domain belum punya widget', async () => {
    const { repository } = harness({ reportSitekey: [{ sitekey: null }] });
    expect(await repository.loadReportChallengeSitekey({ ...CONTEXT })).toBe(null);
  });

  it('null saat baris domain tidak ada', async () => {
    const { repository } = harness({ reportSitekey: [] });
    expect(await repository.loadReportChallengeSitekey({ ...CONTEXT })).toBe(null);
  });
});

describe('readSite projection', () => {
  it('listing tidak memilih body penuh dan tidak query galeri', async () => {
    const { repository, selectLog } = harness({});
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site).not.toBe(null);
    const articleKeys = selectLog.filter((entry) => entry.keys.includes('bodyExcerpt')).map((entry) => entry.keys);
    expect(articleKeys).toHaveLength(1);
    expect(articleKeys[0]).not.toContain('body');
    expect(selectLog.filter((entry) => entry.keys.includes('sortOrder'))).toHaveLength(0);
    expect(selectLog).toHaveLength(5);
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

  it('memenangkan baris tenant_ad_settings atas carrier seo', async () => {
    const { repository } = harness({
      adSettings: [
        {
          slotId: 'leaderboard',
          enabled: false,
          kind: null,
          imageUrl: null,
          href: null,
          altText: null,
          widthPx: null,
          heightPx: null,
          html: null,
          provider: null,
          providerClientId: null,
          providerSlotId: null,
        },
      ],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.settings.ads).toEqual({ leaderboard: { enabled: false, creative: null } });
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
    expect(selectLog).toHaveLength(7);
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

  it('memakai thumbnail YouTube sebagai sampul video tanpa sampul', async () => {
    const { repository } = harness({
      articles: [articleRow({ type: 'video', coverImageUrl: null, videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })],
      body: [{ body: 'Naskah pendamping video.' }],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    expect(site?.articles[0]?.imageUrl).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
  });

  it('mendahulukan sampul eksplisit daripada thumbnail YouTube', async () => {
    const { repository } = harness({
      articles: [articleRow({ type: 'video', coverImageUrl: 'https://portal.example/cover.jpg', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, {});
    expect(site?.articles[0]?.imageUrl).toBe('https://portal.example/cover.jpg');
  });

  it('memakai foto galeri pertama sebagai sampul galeri tanpa sampul', async () => {
    const { repository } = harness({
      articles: [articleRow({ type: 'gallery', coverImageUrl: null })],
      body: [{ body: 'Rangkaian foto.' }],
      gallery: [{ id: 'g1', objectKey: 'o/o1/p/article-inline/y=2026/m=09/article/a1/14-g1-0123456789abcdef.webp', thumbObjectKey: null, altText: null, caption: null, widthPx: 800, heightPx: 600, mediaType: 'image/webp', sortOrder: 0 }],
    });
    const site = await repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const item = site?.articles[0];
    expect(item).toBeDefined();
    if (item !== undefined && isNetworkArticle(item)) {
      expect(item.imageUrl).toBe('https://portal.example/api/network/media/g1');
    } else {
      throw new Error('expected detail article with gallery fallback');
    }
  });

  it('memuat linimasa liveblog hanya untuk mode liveblog', async () => {
    const updates = [{ id: 'u-1', body: 'Gol pertama.', publishedAt: new Date('2026-10-04T07:00:00.000Z'), updatedAt: new Date('2026-10-04T07:00:00.000Z') }];
    const live = harness({
      articles: [articleRow({ type: 'liveblog' })],
      body: [{ body: 'Ringkasan.' }],
      updates,
    });
    const liveSite = await live.repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const liveItem = liveSite?.articles[0];
    if (liveItem === undefined || !isNetworkArticle(liveItem)) throw new Error('expected liveblog detail');
    expect(liveItem.updates).toEqual([{ id: 'u-1', body: 'Gol pertama.', publishedAt: '2026-10-04T07:00:00.000Z' }]);
    const standard = harness({ body: [{ body: 'Isi.' }] });
    const standardSite = await standard.repository.loadNetworkSite({ ...CONTEXT }, { articleSlug: 'berita-utama' });
    const standardItem = standardSite?.articles[0];
    if (standardItem === undefined || !isNetworkArticle(standardItem)) throw new Error('expected standard detail');
    expect(standardItem.updates).toEqual([]);
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
    expect(selectLog.some((entry) => entry.keys.includes('articleCount'))).toBe(false);
  });

  it('baca kanal dibatasi di SQL sesuai jumlah kanal yang dirender', async () => {
    const { repository, limitLog } = harness({
      categories: Array.from({ length: 64 }, (slot, i) => ({ slug: `kanal-${i}`, name: `Kanal ${i}`, articleCount: 4, lastUpdatedAt: null })),
    });
    await expect(repository.loadSiteCategories({ ...CONTEXT }, 6)).resolves.toHaveLength(6);
    expect(limitLog).toContain(6);
  });

  it('baca kanal sekaligus jumlah artikelnya, bukan kolom terpisah', async () => {
    // Jumlah ini menentukan `robots` halaman kanal DAN entri sitemap-nya, jadi
    // keduanya harus datang dari satu baca yang sama.
    const { repository, selectLog } = harness({
      categories: [{ slug: 'politik', name: 'Politik', articleCount: 480, lastUpdatedAt: new Date('2026-09-10T00:00:00.000Z') }],
    });
    const rows = await repository.loadSiteCategories({ ...CONTEXT }, 200);

    expect(selectLog.filter((entry) => entry.keys.includes('articleCount'))).toHaveLength(1);
    expect(selectLog.find((entry) => entry.keys.includes('articleCount'))?.keys).toEqual([
      'slug',
      'name',
      'articleCount',
      'lastUpdatedAt',
    ]);
    expect(rows).toEqual([
      { slug: 'politik', name: 'Politik', articleCount: 480, lastUpdatedAt: '2026-09-10T00:00:00.000Z' },
    ]);
  });

  it('lastmod kanal kosong tetap null, bukan string kosong', async () => {
    const { repository } = harness({
      categories: [{ slug: 'tipis', name: 'Tipis', articleCount: 0, lastUpdatedAt: null }],
    });
    const rows = await repository.loadSiteCategories({ ...CONTEXT }, 200);
    expect(rows[0]?.lastUpdatedAt).toBeNull();
    expect(rows[0]?.articleCount).toBe(0);
  });
});

describe('loadSiteShell', () => {
  it('tanpa query artikel untuk 404 bermerek', async () => {
    const { repository, selectLog } = harness({});
    const shell = await repository.loadSiteShell({ ...CONTEXT });
    expect(shell).not.toBe(null);
    expect(shell?.articles).toEqual([]);
    expect(shell?.settings.name).toBe('Portal');
    expect(selectLog).toHaveLength(3);
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
