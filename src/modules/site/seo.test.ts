import { describe, expect, it } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import {
  absoluteSiteAssetUrl,
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

/** Kanal aktif beserta jumlah artikel yang sudah dihitung SQL pada scope lineage. */
function channel(slug: string, name: string, articleCount: number, lastUpdatedAt: string | null = '2026-09-10T00:00:00.000Z') {
  return { slug, name, articleCount, lastUpdatedAt } as const;
}

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

  it('memakai enclosure audio untuk mode audio', () => {
    const articles = [
      makeNetworkArticle({
        type: 'audio',
        audioUrl: 'https://audio.portalberita.id/rekaman.mp3',
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
    ).toContain('<enclosure url="https://audio.portalberita.id/rekaman.mp3" type="audio/mpeg" />');
  });

  it('menandai disclosure sponsor di RSS', () => {
    const articles = [
      makeNetworkArticle({ isSponsored: true, description: 'Inti berita.' }),
    ];
    const site = makeNetworkSite(articles);
    expect(
      serializeRss({
        context: site.context,
        siteName: site.settings.name,
        description: site.settings.description,
        articles,
      }),
    ).toContain('<description>Inti berita. (Konten bersponsor.)</description>');
  });

  it('memakai media RSS untuk mode video', () => {
    const fileArticles = [
      makeNetworkArticle({ type: 'video', videoUrl: 'https://video.portalberita.id/liputan.mp4' }),
    ];
    const fileSite = makeNetworkSite(fileArticles);
    expect(
      serializeRss({
        context: fileSite.context,
        siteName: fileSite.settings.name,
        description: fileSite.settings.description,
        articles: fileArticles,
      }),
    ).toContain('<media:content url="https://video.portalberita.id/liputan.mp4" medium="video" />');
    const tubeArticles = [
      makeNetworkArticle({ type: 'video', videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    ];
    const tubeSite = makeNetworkSite(tubeArticles);
    expect(
      serializeRss({
        context: tubeSite.context,
        siteName: tubeSite.settings.name,
        description: tubeSite.settings.description,
        articles: tubeArticles,
      }),
    ).toContain('<media:player url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />');
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

  it('menyatakan kanonis ke portal asal untuk artikel warisan tanpa override', () => {
    const inherited = makeNetworkArticle({ canonicalUrl: null, href: 'https://kota.portal.example/berita-utama' });
    const document = buildSeoDocument(makeNetworkSite([inherited]), { path: '/berita-utama', article: inherited });
    expect(document.canonical).toBe('https://kota.portal.example/berita-utama');
  });

  it('membiarkan override editorial menang atas asal warisan', () => {
    const inherited = makeNetworkArticle({ canonicalUrl: 'https://sumber.example/asli', href: 'https://kota.portal.example/berita-utama' });
    const document = buildSeoDocument(makeNetworkSite([inherited]), { path: '/berita-utama', article: inherited });
    expect(document.canonical).toBe('https://sumber.example/asli');
  });

  it('menahan og:url di URL tenant ketika kanonis menunjuk sumber luar', () => {
    const syndicated = makeNetworkArticle({ canonicalUrl: 'https://sumber.example/asli', href: 'https://portal.example/berita-utama' });
    const document = buildSeoDocument(makeNetworkSite([syndicated]), { path: '/berita-utama', article: syndicated });
    expect(document.canonical).toBe('https://sumber.example/asli');
    expect(document.openGraph?.url).toBe('https://portal.example/berita-utama');
  });

  it('menyamakan og:url dengan kanonis untuk artikel milik sendiri', () => {
    const owned = makeNetworkArticle({ canonicalUrl: null, href: '/berita-utama' });
    const document = buildSeoDocument(makeNetworkSite([owned]), { path: '/berita-utama', article: owned });
    expect(document.openGraph?.url).toBe(document.canonical);
  });

  it('memakai kanonis tenant untuk artikel milik sendiri', () => {
    const owned = makeNetworkArticle({ canonicalUrl: null, href: '/berita-utama' });
    const document = buildSeoDocument(makeNetworkSite([owned]), { path: '/berita-utama', article: owned });
    expect(document.canonical).toBe('https://portal.example/berita-utama');
  });

  it('memperkaya NewsMediaOrganization dan ProfilePage untuk halaman tentang', () => {
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
    const organization = document.jsonLd.find((node) => node['@type'] === 'NewsMediaOrganization');
    expect(organization?.['description']).toBe('Bio humas uji.');
    expect(organization?.['sameAs']).toEqual(
      expect.arrayContaining(['https://x.com/portaluji', 'https://instagram.com/humasuji']),
    );
    expect(organization?.['address']).toMatchObject({ addressLocality: 'Wonosobo', addressCountry: 'ID' });
    expect(document.jsonLd.some((node) => node['@type'] === 'ProfilePage')).toBe(true);
    expect(document.jsonLd.some((node) => node['@type'] === 'BreadcrumbList')).toBe(true);
  });

  it('tidak menyematkan ProfilePage di luar halaman tentang', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/' });
    expect(document.jsonLd.some((node) => node['@type'] === 'ProfilePage')).toBe(false);
  });

  it('menaikkan identitas penerbit ke NewsMediaOrganization dengan masthead', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/' });
    const organization = document.jsonLd.find((node) => node['@type'] === 'NewsMediaOrganization');
    expect(document.jsonLd.some((node) => node['@type'] === 'Organization')).toBe(false);
    expect(organization?.['name']).toBe('Portal');
    expect(organization?.['masthead']).toBe('https://portal.example/tentang');
  });

  it('menautkan NewsArticle.publisher ke node organisasi lewat @id', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/berita-utama', article: makeNetworkArticle() });
    const article = document.jsonLd.find((node) => node['@type'] === 'NewsArticle');
    expect(article?.['publisher']).toEqual({ '@id': 'https://portal.example/#organization' });
    expect(article?.['publisher']).not.toHaveProperty('name');
  });

  it('menyembunyikan author pada artikel tanpa penulis bernama', () => {
    const anonymous = makeNetworkArticle({ authorName: null, authorDisplayName: null });
    const document = buildSeoDocument(makeNetworkSite(), { path: '/berita-utama', article: anonymous });
    const article = document.jsonLd.find((node) => node['@type'] === 'NewsArticle');
    expect(article).not.toHaveProperty('author');
  });

  it('tidak memancarkan FAQPage yang tidak lagi tampil di Google sejak Mei 2026', () => {
    const document = buildSeoDocument(makeNetworkSite(), { path: '/faq' });
    expect(JSON.stringify(document.jsonLd)).not.toContain('FAQPage');
  });

  it('menerapkan override deskripsi regional', () => {
    const document = buildSeoDocument(makeNetworkSite(), {
      path: '/tentang',
      descriptionOverride: 'Deskripsi portal. Melayani wilayah Jawa Tengah.',
    });
    expect(document.description).toBe('Deskripsi portal. Melayani wilayah Jawa Tengah.');
    expect(document.openGraph?.description).toBe('Deskripsi portal. Melayani wilayah Jawa Tengah.');
  });

  it('menyematkan VideoObject untuk mode video dengan durasi ISO 8601', () => {
    const article = makeNetworkArticle({
      type: 'video',
      videoUrl: 'https://video.portalberita.id/liputan.mp4',
      durationSeconds: 150,
    });
    const document = buildSeoDocument(makeNetworkSite([article]), { path: '/berita-utama', article });
    const video = document.jsonLd.find((node) => node['@type'] === 'VideoObject');
    expect(video).toMatchObject({
      name: article.title,
      contentUrl: 'https://video.portalberita.id/liputan.mp4',
      duration: 'PT2M30S',
    });
  });

  it('menyematkan embedUrl dan hitungan tonton untuk URL YouTube', () => {
    const article = makeNetworkArticle({
      type: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      durationSeconds: 150,
    });
    const document = buildSeoDocument(makeNetworkSite([article]), { path: '/berita-utama', article });
    const video = document.jsonLd.find((node) => node['@type'] === 'VideoObject');
    expect(video).toMatchObject({
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      interactionStatistic: {
        '@type': 'InteractionCounter',
        userInteractionCount: 0,
      },
    });
  });

  it('menyematkan LiveBlogPosting dengan entri berpenanda waktu untuk mode liveblog', () => {
    const article = makeNetworkArticle({
      type: 'liveblog',
      updates: [
        { id: 'u-2', body: 'Gol kedua.\nSkor 2-0.', publishedAt: '2026-10-04T08:00:00.000Z' },
        { id: 'u-1', body: 'Gol pertama.', publishedAt: '2026-10-04T07:00:00.000Z' },
      ],
    });
    const document = buildSeoDocument(makeNetworkSite([article]), { path: '/berita-utama', article });
    const liveblog = document.jsonLd.find((node) => node['@type'] === 'LiveBlogPosting');
    expect(liveblog).toMatchObject({
      coverageStartTime: article.publishedAt,
      liveBlogUpdate: [
        { '@type': 'BlogPosting', headline: 'Gol kedua.', datePublished: '2026-10-04T08:00:00.000Z' },
        { '@type': 'BlogPosting', headline: 'Gol pertama.', datePublished: '2026-10-04T07:00:00.000Z' },
      ],
    });
    expect(document.jsonLd.some((node) => node['@type'] === 'NewsArticle')).toBe(false);
  });

  it('memakai LiveBlogPosting hanya bila ada entri dan galeri di image NewsArticle', () => {
    const empty = makeNetworkArticle({ type: 'liveblog', updates: [] });
    const emptyDocument = buildSeoDocument(makeNetworkSite([empty]), { path: '/berita-utama', article: empty });
    expect(emptyDocument.jsonLd.some((node) => node['@type'] === 'NewsArticle')).toBe(true);
    const galleryArticle = makeNetworkArticle({
      gallery: [
        { id: 'g1', url: 'https://portal.example/api/network/media/g1', thumbnailUrl: null, alt: null, caption: null, width: null, height: null, mediaType: 'image/webp' },
        { id: 'g2', url: 'https://portal.example/api/network/media/g2', thumbnailUrl: null, alt: null, caption: null, width: null, height: null, mediaType: 'image/webp' },
      ],
    });
    const galleryDocument = buildSeoDocument(makeNetworkSite([galleryArticle]), { path: '/berita-utama', article: galleryArticle });
    const news = galleryDocument.jsonLd.find((node) => node['@type'] === 'NewsArticle');
    expect(news?.['image']).toHaveLength(3);
  });

  it('menyematkan AudioObject untuk mode audio dan bukan untuk standar', () => {
    const audio = makeNetworkArticle({ type: 'audio', audioUrl: 'https://audio.portalberita.id/rekaman.mp3', durationSeconds: 65 });
    const audioDocument = buildSeoDocument(makeNetworkSite([audio]), { path: '/berita-utama', article: audio });
    expect(audioDocument.jsonLd.find((node) => node['@type'] === 'AudioObject')).toMatchObject({
      contentUrl: 'https://audio.portalberita.id/rekaman.mp3',
      duration: 'PT1M5S',
    });
    const standardDocument = buildSeoDocument(makeNetworkSite(), { path: '/berita-utama', article: makeNetworkArticle() });
    expect(standardDocument.jsonLd.some((node) => node['@type'] === 'VideoObject')).toBe(false);
    expect(standardDocument.jsonLd.some((node) => node['@type'] === 'AudioObject')).toBe(false);
  });
});

describe('serializers', () => {
  it('meng-escape JSON-LD supaya copy artikel tidak keluar dari script', () => {
    const serialized = serializeJsonLd([{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Layanan <b>redaksi</b>.' }]);
    expect(serialized).not.toContain('<b>');
    expect(serialized).toContain('\\u003c');
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
    expect(robots).toContain('Allow: /api/network/media/');
    expect(robots).toContain('Disallow: /cdn-cgi/');
    expect(robots).toContain('Sitemap: https://portal.example/sitemap.xml');
  });

  it('menjaga carve-out media tetap sempit dan-ordered sebelum Disallow', () => {
    const robots = serializeRobots({ context: makeNetworkSite().context, settings: { robots: [] } });
    const rules = robots.split('\n').map((line) => line.trim());
    const carveOut = rules.indexOf('Allow: /api/network/media/');
    // Allow must precede Disallow so first-match parsers (not just Google's
    // longest-match) still resolve the media prefix as crawlable.
    expect(carveOut).toBeGreaterThan(-1);
    expect(carveOut).toBeLessThan(rules.indexOf('Disallow: /api/'));
    expect(rules.filter((rule) => rule.startsWith('Allow: /api/'))).toEqual(['Allow: /api/network/media/']);
  });

  it('tetap menutup permukaan mesin lain di bawah /api/', () => {
    const robots = serializeRobots({ context: makeNetworkSite().context, settings: { robots: [] } });
    const rules = robots.split('\n').map((line) => line.trim());
    expect(robots).toContain('Disallow: /api/');
    // Exact-line comparison: a broader `Allow: /api/network/` would also
    // unblock /api/network/reports, the report-submission surface.
    expect(rules).not.toContain('Allow: /api/network/');
    for (const surface of ['/api/v1', '/api/internal', '/api/dashboard', '/api/health', '/api/webhooks', '/api/network/reports']) {
      expect(rules).not.toContain(`Allow: ${surface}`);
      expect(rules).not.toContain(`Allow: ${surface}/`);
    }
  });

  it('membuat sitemap dengan beranda, kategori, dan artikel', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ slug: 'berita-utama', updatedAt: '2026-09-14T10:00:00.000Z', categorySlug: 'politik' }),
    ]);
    const sitemap = serializeSitemap(site, [channel('politik', 'Politik', 12)]);
    expect(sitemap).toContain('https://portal.example/</loc>');
    expect(sitemap).toContain('/categories/politik');
    expect(sitemap).toContain('/berita-utama');
  });

  describe('sitemap mengikuti aturan Google Search Central', () => {
    it('tidak mendaftarkan kanal yang halamannya noindex (konten tipis)', () => {
      const site = makeNetworkSite([makeNetworkArticle({ slug: 'a', categorySlug: 'gemuk' })]);
      const sitemap = serializeSitemap(site, [channel('tipis', 'Tipis', 2), channel('gemuk', 'Gemuk', 3)]);
      // `tipis`articleCount-nya 2 < CATEGORY_INDEX_MINIMUM, jadi `/categories/tipis`
      // dilayani `noindex, nofollow` oleh network-runtime.
      expect(sitemap).not.toContain('/categories/tipis');
      expect(sitemap).toContain('/categories/gemuk');
    });

    it('mendaftarkan kanal yang artikelnya di luar 100 terakhir', () => {
      // `site.articles` hanya 100 baris terakhir; kanal tua harus tetap masuk
      // sitemap karena jumlahnya datang dari SQL, bukan dari jendela itu.
      const site = makeNetworkSite([makeNetworkArticle({ slug: 'segar', categorySlug: 'segar' })]);
      const sitemap = serializeSitemap(site, [
        channel('lama', 'Lama', 480, '2024-01-02T00:00:00.000Z'),
        channel('segar', 'Segar', 6),
      ]);
      expect(sitemap).toContain('/categories/lama');
      expect(sitemap).toContain('/categories/segar');
    });

    it('berhenti mengirim lastmod yang tidak jujur pada dokumen statis', () => {
      const site = makeNetworkSite([
        makeNetworkArticle({ slug: 'baru', updatedAt: '2026-09-14T10:00:00.000Z' }),
      ]);
      const sitemap = serializeSitemap(site, []);
      const privacy = /<loc>[^<]*\/kebijakan-privasi<\/loc><lastmod>([^<]*)<\/lastmod>/.exec(sitemap);
      const home = /<loc>https:\/\/portal\.example\/<\/loc><lastmod>([^<]*)<\/lastmod>/.exec(sitemap);
      expect(privacy).not.toBeNull();
      expect(home).not.toBeNull();
      // Dokumen statis tidak berubah karena artikel baru terbit, jadi lastmod-nya
      // tidak boleh mengikuti `updatedAt` artikel.
      expect(privacy?.[1]).not.toBe('2026-09-14T10:00:00.000Z');
      expect(home?.[1]).toBe('2026-09-14T10:00:00.000Z');
    });

    it('tidak mengirim changefreq dan priority yang diabaikan Google', () => {
      const site = makeNetworkSite([makeNetworkArticle({ slug: 'satu' })]);
      const sitemap = serializeSitemap(site, []);
      expect(sitemap).not.toContain('<changefreq>');
      expect(sitemap).not.toContain('<priority>');
    });

    it('mendaftarkan indeks kanal A-Z yang indexable', () => {
      const sitemap = serializeSitemap(makeNetworkSite([makeNetworkArticle({ slug: 'satu' })]), []);
      expect(sitemap).toContain('https://portal.example/indeks</loc>');
    });
  });

  it('tidak mendeklarasikan artikel warisan kota di sitemap portal pencetus', () => {
    const inherited = makeNetworkArticle({ slug: 'kota-lokal', href: 'https://kota.portal.example/kota-lokal' });
    const owned = makeNetworkArticle({ slug: 'milik-sendiri', href: '/milik-sendiri' });
    const sitemap = serializeSitemap(makeNetworkSite([inherited, owned]), []);
    expect(sitemap).toContain('/milik-sendiri');
    expect(sitemap).not.toContain('kota.portal.example');
    const news = serializeNewsSitemap(makeNetworkSite([inherited, owned]));
    expect(news).not.toContain('kota.portal.example');
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
    const sitemap = serializeSitemap(makeNetworkSite([canonical]), []);
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
    const sitemap = serializeSitemap(makeNetworkSite([hidden]), []);
    expect(sitemap).not.toContain('/tersembunyi');
    const news = serializeNewsSitemap(makeNetworkSite([hidden]));
    expect(news).not.toContain('/tersembunyi');
  });

  it('menstabilkan lastmod situs kosong ke createdAt situs', () => {
    const empty = makeNetworkSite([]);
    const first = serializeSitemap(empty, []);
    const second = serializeSitemap(empty, []);
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
    expect(notFoundMetadata()).toMatchObject({
      title: { absolute: 'Not Found' },
      description: 'Halaman tidak ditemukan.',
      alternates: null,
      openGraph: null,
      twitter: null,
    });
    expect(indexableRobots()).toMatchObject({ index: true, follow: true });
    expect(nonIndexableRobots()).toMatchObject({ index: false, follow: true });
  });
});
