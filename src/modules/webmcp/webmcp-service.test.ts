import { describe, expect, it, vi } from 'vitest';

import type { ArticleListItem, NetworkArticle, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { executeWebMcpTool } from '@/modules/webmcp/webmcp-service';
import type { WebMcpServiceDeps, WebMcpThrottle } from '@/modules/webmcp/webmcp-service';

const context: ResolvedSiteContext = {
  normalizedHostname: 'portal.example',
  organizationId: 'org-1',
  domainId: 'domain-1',
  siteId: 'site-1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 1,
};

function makeItem(overrides: Partial<ArticleListItem> & { readonly slug: string }): ArticleListItem {
  const { slug, ...rest } = overrides;
  return {
    id: `id-${slug}`,
    slug,
    title: `Judul ${slug}`,
    description: `Ringkasan ${slug}`,
    href: `/${slug}`,
    tags: ['kabar'],
    regionId: 'region-1',
    categoryId: 'cat-1',
    categorySlug: 'politik',
    categoryName: 'Politik',
    authorName: 'Redaksi',
    authorDisplayName: 'Redaksi Portal',
    publisherName: 'Penerbit',
    attribution: 'Penerbit',
    publisherLogoUrl: null,
    publisherCity: 'Kota',
    publisherBio: 'Bio',
    publisherSocials: {},
    authorBio: null,
    authorAvatarUrl: null,
    publisherVerified: false,
    independent: false,
    officialInstitution: null,
    publishedAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T11:00:00.000Z',
    articleSiteId: `as-${slug}`,
    viewCount: 7,
    type: 'standard',
    isSponsored: false,
    videoUrl: null,
    audioUrl: null,
    durationSeconds: null,
    imageUrl: null,
    thumbnailUrl: null,
    imageMediaType: null,
    imageWidth: null,
    imageHeight: null,
    imageFocalX: null,
    imageFocalY: null,
    ...rest,
  };
}

function makeSite(articles: readonly ArticleListItem[]): NetworkSiteData {
  return {
    context,
    regionName: 'Jawa Tengah',
    settings: {
      name: 'Portal Contoh',
      description: 'Deskripsi portal',
      tagline: null,
      seoDefaultTitle: null,
      seoDefaultDescription: 'Deskripsi SEO portal',
      seoSiteName: 'Portal SEO',
      locale: 'id',
      commentsEnabled: false,
      colors: {},
      socialLinks: {},
      navigation: [],
      logoUrl: 'https://portal.example/logo.png',
      faviconUrl: null,
      defaultImageUrl: 'https://portal.example/default.png',
      defaultImageMediaType: null,
      defaultImageWidth: null,
      defaultImageHeight: null,
      robots: [],
    },
    articles,
    siteCreatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeDetail(slug: string, body: string): NetworkArticle {
  return { ...makeItem({ slug }), body, gallery: [], updates: [] };
}

function makeDeps(site: NetworkSiteData | null, throttle: WebMcpThrottle = { allowed: true }): WebMcpServiceDeps & {
  readonly load: ReturnType<typeof vi.fn>;
} {
  const load = vi.fn(async () => site);
  const loadSiteCategories = vi.fn(async (context: ResolvedSiteContext, limit: number) =>
    [
      { slug: 'politik', name: 'Politik', articleCount: 5, lastUpdatedAt: '2026-01-02T00:00:00.000Z' },
      { slug: 'ekonomi', name: 'Ekonomi', articleCount: 0, lastUpdatedAt: null },
    ].slice(0, limit),
  );
  return {
    content: { load },
    repository: { loadSiteCategories },
    locale: 'id',
    checkSearchThrottle: async () => throttle,
    load,
  };
}

function readText(result: { readonly content: readonly { readonly text: string }[] }): Record<string, unknown> {
  return JSON.parse(result.content[0]?.text ?? '{}') as Record<string, unknown>;
}

describe('executeWebMcpTool', () => {
  it('site_info meringkas portal dan kanal dari satu bacaan', async () => {
    const deps = makeDeps(makeSite([makeItem({ slug: 'a-1' }), makeItem({ slug: 'a-2', categorySlug: 'ekonomi', categoryName: 'Ekonomi' })]));
    const result = await executeWebMcpTool(deps, context, 'site_info', {}, 'req-1');
    expect(result.isError).toBeUndefined();
    const payload = readText(result);
    expect(payload.siteName).toBe('Portal SEO');
    expect(payload.url).toBe('https://portal.example/');
    expect(payload.channels).toEqual([
      { slug: 'politik', name: 'Politik' },
      { slug: 'ekonomi', name: 'Ekonomi' },
    ]);
    expect(payload.recentCount).toBe(2);
    expect(deps.load).toHaveBeenCalledTimes(1);
  });

  it('site_info gagal tertutup saat portal tidak tersedia', async () => {
    const result = await executeWebMcpTool(makeDeps(null), context, 'site_info', {}, 'req-1');
    expect(result.isError).toBe(true);
  });

  it('search_articles menahan diri saat throttle menolak tanpa menyentuh DB', async () => {
    const deps = makeDeps(makeSite([makeItem({ slug: 'a-1' })]), { allowed: false, retryAfterSeconds: '45' });
    const result = await executeWebMcpTool(deps, context, 'search_articles', { query: 'rutan' }, 'req-1');
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('45');
    expect(deps.load).not.toHaveBeenCalled();
  });

  it('search_articles memotong hasil pada limit tool', async () => {
    const deps = makeDeps(makeSite([makeItem({ slug: 'a-1' }), makeItem({ slug: 'a-2' }), makeItem({ slug: 'a-3' })]));
    const payload = readText(await executeWebMcpTool(deps, context, 'search_articles', { query: 'rutan', limit: 2 }, 'req-1'));
    expect((payload.articles as readonly unknown[]).length).toBe(2);
    expect(payload.query).toBe('rutan');
  });

  it('list_articles menghalaman dengan offset dan menandai sisa', async () => {
    const deps = makeDeps(makeSite([makeItem({ slug: 'a-1' }), makeItem({ slug: 'a-2' }), makeItem({ slug: 'a-3' })]));
    const payload = readText(await executeWebMcpTool(deps, context, 'list_articles', { limit: 2, offset: 1 }, 'req-1'));
    expect(payload.count).toBe(2);
    expect(payload.hasMore).toBe(false);
    expect((payload.articles as readonly { slug: string }[]).map((article) => article.slug)).toEqual(['a-2', 'a-3']);
  });

  it('list_articles mempertahankan tautan lintas-host milik agregator', async () => {
    const deps = makeDeps(makeSite([makeItem({ slug: 'a-1', href: 'https://kota.example/a-1' })]));
    const payload = readText(await executeWebMcpTool(deps, context, 'list_articles', {}, 'req-1'));
    const articles = payload.articles as readonly { url: string }[];
    expect(articles[0]?.url).toBe('https://kota.example/a-1');
  });

  it('list_categories meneruskan batas ke repository', async () => {
    const deps = makeDeps(makeSite([]));
    const payload = readText(await executeWebMcpTool(deps, context, 'list_categories', { limit: 1 }, 'req-1'));
    expect(payload).toEqual({ count: 1, categories: [{ slug: 'politik', name: 'Politik' }] });
  });

  it('get_article memotong badan panjang dan menandai pemotongan', async () => {
    const deps = makeDeps(makeSite([makeDetail('panjang', 'x'.repeat(9000))]));
    const payload = readText(await executeWebMcpTool(deps, context, 'get_article', { slug: 'panjang' }, 'req-1'));
    expect(payload.truncated).toBe(true);
    expect((payload.body as string).length).toBe(8000);
    expect(payload.url).toBe('https://portal.example/panjang');
  });

  it('get_article menolak slug yang tidak terbit', async () => {
    const deps = makeDeps(makeSite([]));
    const result = await executeWebMcpTool(deps, context, 'get_article', { slug: 'hilang' }, 'req-1');
    expect(result.isError).toBe(true);
  });

  it('argumen tidak valid menjadi hasil error, bukan ledakan', async () => {
    const result = await executeWebMcpTool(makeDeps(makeSite([])), context, 'search_articles', { query: '' }, 'req-1');
    expect(result.isError).toBe(true);
  });
});
