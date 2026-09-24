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

  it('mempertahankan URL gambar eksternal apa adanya', () => {
    expect(absoluteSiteAssetUrl(context, 'https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200&q=80')).toBe(
      'https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200&q=80',
    );
    expect(absoluteSiteAssetUrl(context, 'https://evil.test/x?y=1')).toBe('https://evil.test/x?y=1');
  });

  it('me-re-anchor aset publik bersama ke hostname situs', () => {
    expect(absoluteSiteAssetUrl(context, 'https://indicate.website/brand/indicate-mark.svg')).toBe(
      'https://portal.example/brand/indicate-mark.svg',
    );
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

  it('menyertakan Twitter Card dan tag artikel OpenGraph', () => {
    const article = makeNetworkArticle({ title: 'Judul Utama', description: 'Deskripsi artikel yang cukup panjang.', tags: ['wonosobo', 'apbd'], categoryName: 'Politik' });
    const site = makeNetworkSite([article]);
    const document = buildSeoDocument(site, { path: '/berita-utama', article });
    expect(document.twitter).toMatchObject({ card: 'summary_large_image', title: document.title });
    expect(document.openGraph?.article).toMatchObject({ section: 'Politik', tags: ['wonosobo', 'apbd'] });
    expect(document.openGraph?.article?.publishedTime).toBe(article.publishedAt);
  });

  it('menghormati override kanonis dan robots per artikel', () => {
    const article = makeNetworkArticle({ canonicalUrl: 'https://sindikasi.example/asal', robotsDirective: 'noindex, nofollow' });
    const site = makeNetworkSite([article]);
    const document = buildSeoDocument(site, { path: '/berita-utama', article });
    expect(document.canonical).toBe('https://sindikasi.example/asal');
    expect(document.robots).toBe('noindex, nofollow');
    const overridden = buildSeoDocument(site, { path: '/berita-utama', article, robotsOverride: 'noindex, nofollow, nosnippet' });
    expect(overridden.robots).toBe('noindex, nofollow, nosnippet');
    const invalid = buildSeoDocument(site, { path: '/berita-utama', article: makeNetworkArticle({ canonicalUrl: 'javascript:alert(1)' }) });
    expect(invalid.canonical).toBe('https://portal.example/berita-utama');
  });

  it('memperkaya Organization dan AboutPage untuk halaman tentang', () => {
    const article = makeNetworkArticle({
      publisherName: 'Humas Uji',
      publisherBio: 'Bio humas uji.',
      publisherCity: 'Wonosobo',
      publisherSocials: { instagram: 'https://instagram.com/humasuji' },
      publisherVerified: true,
    });
    const base = makeNetworkSite([article]);
    const site = { ...base, settings: { ...base.settings, socialLinks: { x: 'https://x.com/portaluji' } } };
    const document = buildSeoDocument(site, { path: '/tentang' });
    const organization = document.jsonLd.find((node) => node['@type'] === 'Organization');
    expect(organization?.['description']).toBe('Bio humas uji.');
    expect(organization?.['sameAs']).toEqual(
      expect.arrayContaining(['https://x.com/portaluji', 'https://instagram.com/humasuji']),
    );
    expect(organization?.['address']).toMatchObject({ addressLocality: 'Wonosobo', addressCountry: 'ID' });
    expect(document.jsonLd.some((node) => node['@type'] === 'AboutPage')).toBe(true);
    expect(document.jsonLd.some((node) => node['@type'] === 'BreadcrumbList')).toBe(true);
  });

  it('tidak menyematkan AboutPage di luar halaman tentang', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/' });
    expect(document.jsonLd.some((node) => node['@type'] === 'AboutPage')).toBe(false);
  });

  it('menerapkan override deskripsi regional', () => {
    const document = buildSeoDocument(makeNetworkSite(), {
      path: '/tentang',
      descriptionOverride: 'Deskripsi portal. Melayani wilayah Jawa Tengah.',
    });
    expect(document.description).toBe('Deskripsi portal. Melayani wilayah Jawa Tengah.');
    expect(document.openGraph?.description).toBe('Deskripsi portal. Melayani wilayah Jawa Tengah.');
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
    expect(robots).toContain('Allow: /icon.png');
    expect(robots).toContain('Allow: /apple-touch-icon.png');
    expect(robots).toContain('Allow: /logo.png');
    expect(robots).toContain('Allow: /manifest.webmanifest');
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

  it('memakai url kanonis override di sitemap dan news sitemap', () => {
    const canonical = makeNetworkArticle({
      slug: 'berita-cascade',
      canonicalUrl: 'https://portal-apex.example/berita-cascade',
      publishedAt: new Date(Date.now() - 3_600_000).toISOString(),
      updatedAt: '2026-09-14T10:00:00.000Z',
    });
    const sitemap = serializeSitemap(makeNetworkSite([canonical]));
    expect(sitemap).toContain('https://portal-apex.example/berita-cascade');
    expect(sitemap).not.toContain('https://portal.example/berita-cascade');
    const news = serializeNewsSitemap(makeNetworkSite([canonical]));
    expect(news).toContain('https://portal-apex.example/berita-cascade');
  });

  it('mengeluarkan artikel noindex dari kedua sitemap', () => {
    const hidden = makeNetworkArticle({
      slug: 'tersembunyi',
      robotsDirective: 'noindex, nofollow',
      publishedAt: new Date(Date.now() - 3_600_000).toISOString(),
      updatedAt: '2026-09-14T10:00:00.000Z',
    });
    const sitemap = serializeSitemap(makeNetworkSite([hidden]));
    expect(sitemap).not.toContain('/tersembunyi');
    const news = serializeNewsSitemap(makeNetworkSite([hidden]));
    expect(news).not.toContain('/tersembunyi');
  });

  it('menstabilkan lastmod situs kosong ke createdAt situs', () => {
    const empty = makeNetworkSite([]);
    const first = serializeSitemap(empty);
    const second = serializeSitemap(empty);
    expect(first).toBe(second);
    expect(first).toContain('2026-09-01T00:00:00.000Z');
  });
});

describe('metadata helpers', () => {
  it('mengatur favicon, 404, dan robots', () => {
    expect(tenantFavicon(null)).toEqual({});
    expect(tenantFavicon('https://portal.example/icon.svg')).toEqual({
      icons: {
        icon: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
        apple: '/apple-touch-icon.png',
        shortcut: '/icon.png',
      },
      manifest: '/manifest.webmanifest',
    });
    expect(notFoundMetadata().title).toBe('Not Found');
    expect(indexableRobots()).toMatchObject({ index: true, follow: true });
    expect(nonIndexableRobots()).toMatchObject({ index: false, follow: true });
  });
});
