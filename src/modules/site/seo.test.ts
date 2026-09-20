import { describe, expect, it } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import {
  absoluteSiteAssetUrl,
  buildFaqPageSchema,
  buildSeoDocument,
  indexableRobots,
  nonIndexableRobots,
  notFoundMetadata,
  serializeJsonLd,
  serializeNewsSitemap,
  serializeRobots,
  serializeRss,
  serializeSitemap,
  tenantFavicon,
} from '@/modules/site/seo';

describe('serializeRss enclosure', () => {
  it('memakai tipe MIME media R2 bila diketahui', () => {
    const articles = [
      makeNetworkArticle({
        title: 'Judul berita utama',
        description: 'Deskripsi berita utama yang cukup panjang untuk kebutuhan tayang.',
        imageUrl: 'https://portal.example/api/network/media/img1',
        imageMediaType: 'image/webp',
      }),
    ];
    const site = makeNetworkSite(articles);
    expect(
      serializeRss({
        context: site.context,
        siteName: site.settings.name,
        description: site.settings.description,
        articles,
      }),
    ).toContain('type="image/webp"');
  });

  it('mempertahankan image/jpeg untuk hotlink eksternal', () => {
    const articles = [
      makeNetworkArticle({
        title: 'Judul berita utama',
        description: 'Deskripsi berita utama yang cukup panjang untuk kebutuhan tayang.',
        imageUrl: 'https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200&q=80',
      }),
    ];
    const site = makeNetworkSite(articles);
    expect(
      serializeRss({
        context: site.context,
        siteName: site.settings.name,
        description: site.settings.description,
        articles,
      }),
    ).toContain('type="image/jpeg"');
  });
});

describe('absoluteSiteAssetUrl', () => {
  const context = makeNetworkSite().context;

  it('mengabsolutkan path relatif dan mempertahankan query', () => {
    expect(absoluteSiteAssetUrl(context, '/brand/logo.svg')).toBe('https://portal.example/brand/logo.svg');
    expect(absoluteSiteAssetUrl(context, 'https://portal.example/foto.jpg?w=100')).toBe('https://portal.example/foto.jpg?w=100');
  });

  it('mengekstrak path URL eksternal ke hostname situs', () => {
    expect(absoluteSiteAssetUrl(context, 'https://evil.test/x?y=1')).toBe('https://portal.example/x?y=1');
  });
});

describe('buildSeoDocument', () => {
  it('membawa identitas portal pada beranda', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/' });
    expect(document.title).toContain('Portal');
    expect(document.canonical).toBe('https://portal.example/');
    expect(document.robots).toBe('index, follow');
    expect(document.openGraph?.type).toBe('website');
  });

  it('menonaktifkan index saat tidak indexable', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/', indexable: false });
    expect(document.robots).toBe('noindex, nofollow');
    expect(document.canonical).toBe(null);
    expect(document.openGraph).toBe(null);
  });

  it('menyematkan NewsArticle untuk halaman artikel', () => {
    const article = makeNetworkArticle({ title: 'Judul Utama', description: 'Deskripsi artikel yang cukup panjang.' });
    const site = makeNetworkSite([article]);
    const document = buildSeoDocument(site, { path: '/berita-utama', article });
    expect(document.title).toContain('Judul Utama');
    expect(document.openGraph?.type).toBe('article');
    expect(document.jsonLd.some((node) => node['@type'] === 'NewsArticle')).toBe(true);
  });
});

describe('serializers', () => {
  it('membangun FAQPage dan meng-escape JSON-LD', () => {
    const schema = buildFaqPageSchema([{ question: 'Apa itu?', answer: 'Layanan <b>redaksi</b>.' }]);
    expect(schema.mainEntity).toHaveLength(1);
    const document = schema as unknown as Readonly<Record<string, unknown>>;
    expect(serializeJsonLd([document])).not.toContain('<b>');
    expect(serializeJsonLd([document])).toContain('\\u003c');
  });

  it('membuat robots dengan custom dan sitemap', () => {
    const site = makeNetworkSite();
    const robots = serializeRobots({ context: site.context, settings: { robots: ['Disallow: /rahasia'] } });
    expect(robots).toContain('Disallow: /search');
    expect(robots).toContain('Disallow: /rahasia');
    expect(robots).toContain('Sitemap: https://portal.example/sitemap.xml');
  });

  it('membuat sitemap dengan beranda, kategori, dan artikel', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ slug: 'berita-utama', updatedAt: '2026-09-14T10:00:00.000Z', categorySlug: 'politik' }),
    ]);
    const sitemap = serializeSitemap(site);
    expect(sitemap).toContain('https://portal.example/</loc>');
    expect(sitemap).toContain('/categories/politik');
    expect(sitemap).toContain('/berita-utama');
  });

  it('menyaring news sitemap ke artikel dua hari terakhir', () => {
    const fresh = makeNetworkArticle({ slug: 'baru', publishedAt: new Date(Date.now() - 3_600_000).toISOString() });
    const stale = makeNetworkArticle({ slug: 'lama', publishedAt: '2020-01-01T00:00:00.000Z' });
    const news = serializeNewsSitemap(makeNetworkSite([fresh, stale]));
    expect(news).toContain('/baru');
    expect(news).not.toContain('/lama');
  });
});

describe('metadata helpers', () => {
  it('mengatur favicon, 404, dan robots', () => {
    expect(tenantFavicon(null)).toEqual({});
    expect(tenantFavicon('https://portal.example/icon.svg')).toEqual({
      icons: { icon: 'https://portal.example/icon.svg', apple: 'https://portal.example/icon.svg', shortcut: 'https://portal.example/icon.svg' },
    });
    expect(notFoundMetadata().title).toBe('Not Found');
    expect(indexableRobots()).toMatchObject({ index: true, follow: true });
    expect(nonIndexableRobots()).toMatchObject({ index: false, follow: true });
  });
});
