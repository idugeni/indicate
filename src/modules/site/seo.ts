import type { Metadata } from 'next';
import type { NetworkArticle, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { articleBodyText } from '@/modules/site/article-markup';
import { MINISTRY_FALLBACK_LOGO_URL } from '@/ui/site/marketing-content';

function absoluteSiteUrl(context: ResolvedSiteContext, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `https://${context.normalizedHostname}`);
  if (url.hostname !== context.normalizedHostname) throw new Error('Invalid site URL path');
  return url.toString();
}

export function absoluteSiteAssetUrl(context: ResolvedSiteContext, value: string): string {
  if (value.startsWith('/')) return absoluteSiteUrl(context, value);
  const parsed = new URL(value, `https://${context.normalizedHostname}`);
  return absoluteSiteUrl(context, `${parsed.pathname}${parsed.search}`);
}

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

function stripHtml(value: string): string {
  return value.replaceAll(/<[^>]*>/gu, ' ').replaceAll(/\s+/gu, ' ').trim();
}

/**
 * Meringkas body menjadi kutipan deskripsi yang tidak terpotong di tengah kata.
 *
 * @param body - Body kanonik artikel (boleh mengandung HTML).
 * @param maxLength - Batas panjang dalam karakter unicode.
 * @returns Kutipan bersih; string kosong bila body tidak memiliki kata.
 */
export function excerptForDescription(body: string, maxLength = 180): string {
  const clean = stripHtml(articleBodyText(body));
  const chars = Array.from(clean);
  if (chars.length <= maxLength) return clean;
  const slice = chars.slice(0, maxLength).join('');
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.5) return slice.slice(0, lastSpace).trimEnd();
  return slice.trimEnd();
}

export interface SeoDocument {
  readonly title: string;
  readonly description: string;
  readonly canonical: string | null;
  readonly robots: 'index, follow' | 'noindex, nofollow';
  readonly openGraph: Readonly<{ title: string; description: string; url: string; siteName: string; type: 'website' | 'article'; image: string }> | null;
  readonly jsonLd: readonly Readonly<Record<string, unknown>>[];
}

/** Shared indexable robots (tenant + control-plane public surfaces). */
export function indexableRobots(): Metadata['robots'] {
  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  };
}

/** Shared non-indexable robots; follows links so equity still flows (search, missing content). */
export function nonIndexableRobots(): Metadata['robots'] {
  return {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
      noimageindex: true,
      'max-snippet': -1,
      'max-image-preview': 'none',
      'max-video-preview': -1,
    },
  };
}

/** Tenant favicon fragment; empty when the site sets no custom icon. */
export function tenantFavicon(faviconUrl: string | null | undefined): Pick<Metadata, 'icons'> {
  return faviconUrl === null || faviconUrl === undefined || faviconUrl === '' ? {} : { icons: { icon: faviconUrl, apple: faviconUrl, shortcut: faviconUrl } };
}

/** Uniform metadata for missing network content (unknown slug, empty id). */
export function notFoundMetadata(): Metadata {
  return { title: 'Not Found', robots: { index: false, follow: false } };
}

export function buildSeoDocument(site: NetworkSiteData, options: { readonly path: string; readonly article?: NetworkArticle; readonly indexable?: boolean; readonly titleOverride?: string }): SeoDocument {
  const indexable = options.indexable ?? true;
  const article = options.article;
  const siteName = site.settings.seoSiteName || site.settings.name;
  const siteDescription = site.settings.seoDefaultDescription || site.settings.description;
  const title = options.titleOverride ?? (article === undefined ? (site.settings.seoDefaultTitle || site.settings.name) : `${article.title} | ${siteName}`);
  const description = article?.description ?? siteDescription;
  if (!indexable) return { title, description, canonical: null, robots: 'noindex, nofollow', openGraph: null, jsonLd: [] };
  const canonical = absoluteSiteUrl(site.context, options.path);
  const image = absoluteSiteAssetUrl(site.context, article?.imageUrl ?? site.settings.defaultImageUrl);
  const rawLogo = site.settings.logoUrl ?? MINISTRY_FALLBACK_LOGO_URL;
  const logo = absoluteSiteAssetUrl(site.context, rawLogo);
  const publisherLogo = article?.publisherLogoUrl === null || article?.publisherLogoUrl === undefined
    ? logo
    : absoluteSiteAssetUrl(site.context, article.publisherLogoUrl);
  const publisher = article?.officialInstitution ?? article?.publisherName ?? siteName;
  const websiteId = absoluteSiteUrl(site.context, '/#website');
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': websiteId, name: siteName, url: absoluteSiteUrl(site.context, '/'), inLanguage: 'id',
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: absoluteSiteUrl(site.context, '/search?q={search_term_string}') }, 'query-input': 'required name=search_term_string' },
    },
    { '@context': 'https://schema.org', '@type': 'Organization', name: publisher, url: absoluteSiteUrl(site.context, '/'), logo: { '@type': 'ImageObject', url: logo } },
  ];
  if (article !== undefined) {
    const wordCount = stripHtml(article.body).split(/\s+/u).filter(Boolean).length;
    jsonLd.push({
      '@context': 'https://schema.org', '@type': 'NewsArticle', '@id': `${canonical}#article`, headline: article.title, description: article.description,
      datePublished: article.publishedAt, dateModified: article.updatedAt, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      image: [image], inLanguage: 'id', isAccessibleForFree: true, wordCount,
      ...(article.categoryName === null ? {} : { articleSection: article.categoryName }),
      ...(article.tags.length === 0 ? {} : { keywords: article.tags.join(', ') }),
      author: { '@type': 'Person', name: article.authorDisplayName ?? article.authorName ?? article.attribution },
      publisher: { '@type': 'Organization', name: publisher, logo: { '@type': 'ImageObject', url: publisherLogo } },
      isPartOf: { '@id': websiteId },
    });
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Beranda', item: absoluteSiteUrl(site.context, '/') }, ...(article.categoryName === null || article.categorySlug === null ? [] : [{ '@type': 'ListItem', position: 2, name: article.categoryName, item: absoluteSiteUrl(site.context, `/categories/${article.categorySlug}`) }]), { '@type': 'ListItem', position: article.categoryName === null ? 2 : 3, name: article.title, item: canonical }] });
  }
  return { title, description, canonical, robots: 'index, follow', openGraph: { title, description, url: canonical, siteName, type: article === undefined ? 'website' : 'article', image }, jsonLd };
}

export interface WebSiteSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'WebSite';
  readonly name: string;
  readonly url: string;
  readonly inLanguage?: string;
  readonly potentialAction?: Readonly<Record<string, unknown>>;
}

export interface OrganizationSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'Organization';
  readonly name: string;
  readonly url: string;
  readonly logo?: string | Readonly<{ '@type': 'ImageObject'; url: string }>;
}

export interface NewsArticleSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'NewsArticle';
  readonly headline: string;
  readonly description: string;
  readonly datePublished: string;
  readonly dateModified: string;
  readonly mainEntityOfPage: string | Readonly<{ '@type': 'WebPage'; '@id': string }>;
  readonly image: readonly string[];
  readonly inLanguage?: string;
  readonly isAccessibleForFree?: boolean;
  readonly wordCount?: number;
  readonly articleSection?: string;
  readonly keywords?: string;
  readonly author: Readonly<{ '@type': 'Person'; name: string }>;
  readonly publisher: Readonly<{
    '@type': 'Organization';
    name: string;
    logo?: Readonly<{ '@type': 'ImageObject'; url: string }>;
  }>;
}

export interface BreadcrumbItemSchema {
  readonly '@type': 'ListItem';
  readonly position: number;
  readonly name: string;
  readonly item: string;
}

export interface BreadcrumbListSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'BreadcrumbList';
  readonly itemListElement: readonly BreadcrumbItemSchema[];
}

export interface FaqQuestionSchema {
  readonly '@type': 'Question';
  readonly name: string;
  readonly acceptedAnswer: Readonly<{ '@type': 'Answer'; text: string }>;
}

export interface FaqPageSchema {
  readonly '@context': 'https://schema.org';
  readonly '@type': 'FAQPage';
  readonly mainEntity: readonly FaqQuestionSchema[];
}

export type JsonLdSchema =
  | WebSiteSchema
  | OrganizationSchema
  | NewsArticleSchema
  | BreadcrumbListSchema
  | FaqPageSchema
  | Readonly<Record<string, unknown>>;

export function buildFaqPageSchema(
  items: readonly Readonly<{ question: string; answer: string }>[],
): FaqPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export function serializeJsonLd(documents: readonly Readonly<Record<string, unknown>>[]): string {
  return safeJson(documents.length === 1 ? documents[0] : documents);
}

export function serializeRobots(site: {
  readonly context: ResolvedSiteContext;
  readonly settings: { readonly robots: readonly string[] };
}): string {
  const custom = site.settings.robots.filter((line) => line.trim().length > 0);
  const lines = [
    'User-agent: *',
    ...custom,
    'Allow: /',
    'Allow: /categories/',
    // Search pages are noindex: disallow them to keep crawl budget on canonical URLs.
    'Disallow: /search',
    'Disallow: /api/',
    'Disallow: /dashboard',
    'Disallow: /auth',
    'Disallow: /sign-in',
    'Disallow: /domain-pending',
  ];
  return `${lines.join('\n')}\nSitemap: ${absoluteSiteUrl(site.context, '/sitemap.xml')}\nSitemap: ${absoluteSiteUrl(site.context, '/news-sitemap.xml')}\n`;
}

interface SitemapEntry {
  readonly loc: string;
  readonly lastmod: string;
  readonly changefreq: 'daily' | 'weekly' | 'monthly';
  readonly priority: string;
  readonly image?: string;
  readonly imageTitle?: string;
}

function toLastmod(value: string, fallback: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return fallback;
  return new Date(time).toISOString();
}

export function serializeSitemap(site: NetworkSiteData): string {
  const now = new Date().toISOString();
  const homepageLastmod = site.articles.reduce<string>(
    (latest, article) => (article.updatedAt > latest ? article.updatedAt : latest),
    now,
  );
  const entries: SitemapEntry[] = [
    { loc: absoluteSiteUrl(site.context, '/'), lastmod: toLastmod(homepageLastmod, now), changefreq: 'daily', priority: '1.0' },
    { loc: absoluteSiteUrl(site.context, '/kebijakan-privasi'), lastmod: toLastmod(homepageLastmod, now), changefreq: 'monthly', priority: '0.3' },
    { loc: absoluteSiteUrl(site.context, '/syarat-ketentuan'), lastmod: toLastmod(homepageLastmod, now), changefreq: 'monthly', priority: '0.3' },
    { loc: absoluteSiteUrl(site.context, '/tentang'), lastmod: toLastmod(homepageLastmod, now), changefreq: 'monthly', priority: '0.3' },
    { loc: absoluteSiteUrl(site.context, '/kontak'), lastmod: toLastmod(homepageLastmod, now), changefreq: 'monthly', priority: '0.3' },
  ];
  const seenCategories = new Set<string>();
  for (const article of site.articles) {
    if (article.categorySlug !== null && !seenCategories.has(article.categorySlug)) {
      seenCategories.add(article.categorySlug);
      entries.push({
        loc: absoluteSiteUrl(site.context, `/categories/${article.categorySlug}`),
        lastmod: toLastmod(article.updatedAt, now),
        changefreq: 'daily',
        priority: '0.7',
      });
    }
  }
  for (const article of site.articles) {
    entries.push({
      loc: absoluteSiteUrl(site.context, `/${article.slug}`),
      lastmod: toLastmod(article.updatedAt, now),
      changefreq: 'weekly',
      priority: '0.8',
      ...(article.imageUrl === null
        ? {}
        : { image: absoluteSiteAssetUrl(site.context, article.imageUrl), imageTitle: article.title }),
    });
  }
  const body = entries
    .map(
      (entry) =>
        `<url><loc>${xml(entry.loc)}</loc><lastmod>${xml(entry.lastmod)}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority>${entry.image === undefined ? '' : `<image:image><image:loc>${xml(entry.image)}</image:loc>${entry.imageTitle === undefined ? '' : `<image:title>${xml(entry.imageTitle)}</image:title>`}</image:image>`}</url>`,
    )
    .join('');
  const hasImages = entries.some((entry) => entry.image !== undefined);
  const ns = hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : '';
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${ns}>${body}</urlset>`;
}

/** Sitemap Google News: hanya artikel ≤2 hari, maks 1000 URL. */
export function serializeNewsSitemap(site: NetworkSiteData): string {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const items = site.articles
    .filter((article) => {
      const time = new Date(article.publishedAt).getTime();
      return !Number.isNaN(time) && time >= cutoff;
    })
    .slice(0, 1000);
  const body = items
    .map(
      (article) =>
        `<url><loc>${xml(absoluteSiteUrl(site.context, `/${article.slug}`))}</loc><news:news><news:publication><news:name>${xml(site.settings.seoSiteName || site.settings.name)}</news:name><news:language>id</news:language></news:publication><news:publication_date>${xml(new Date(article.publishedAt).toISOString())}</news:publication_date><news:title>${xml(article.title)}</news:title></news:news></url>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}</urlset>`;
}

export function serializeRss(site: NetworkSiteData): string {
  const channel = absoluteSiteUrl(site.context, '/');
  const siteName = site.settings.seoSiteName || site.settings.name;
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${xml(siteName)}</title><link>${xml(channel)}</link><description>${xml(site.settings.seoDefaultDescription || site.settings.description)}</description><language>id-ID</language>${site.articles.map((article) => {
    const link = absoluteSiteUrl(site.context, `/${article.slug}`);
    const enclosure = article.imageUrl === null ? '' : `<enclosure url="${xml(absoluteSiteAssetUrl(site.context, article.imageUrl))}" type="image/jpeg" />`;
    return `<item><title>${xml(article.title)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><description>${xml(article.description)}</description><content:encoded>${xml(article.body)}</content:encoded>${enclosure}<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>${article.categoryName === null ? '' : `<category>${xml(article.categoryName)}</category>`}</item>`;
  }).join('')}</channel></rss>`;
}
