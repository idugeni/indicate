import type { Metadata } from 'next';
import type { FeedArticle, NetworkArticle, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { isNetworkArticle } from '@/modules/delivery/models';
import { deriveAboutPublisher } from '@/modules/site/about-profile';
import { articleBodyText } from '@/modules/site/article-markup';
import { isTipTapDoc, tiptapToText } from '@/modules/site/tiptap-document';

function absoluteSiteUrl(context: ResolvedSiteContext, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `https://${context.normalizedHostname}`);
  if (url.hostname !== context.normalizedHostname) throw new Error('Invalid site URL path');
  return url.toString();
}

/**
 * Resolve public images/assets to the tenant's single-host absolute URL.
 *
 * @param context - Hostname context of the requesting tenant.
 * @param value - Relative path or absolute asset URL.
 * @returns Absolute URL; external URLs are kept as-is so og:image never 404s.
 */
export function absoluteSiteAssetUrl(context: ResolvedSiteContext, value: string): string {
  if (value.startsWith('/')) return absoluteSiteUrl(context, value);
  try {
    const parsed = new URL(value);
    const path = `${parsed.pathname}${parsed.search}`;
    if (path.startsWith('/brand/') || path.startsWith('/assets/')) return absoluteSiteUrl(context, path);
    return parsed.toString();
  } catch {
    return absoluteSiteUrl(context, value.startsWith('/') ? value : `/${value}`);
  }
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
 * Condense the body into a description excerpt that never cuts mid-word.
 *
 * @param body - Canonical article body (may contain HTML).
 * @param maxLength - Maximum length in unicode characters.
 * @returns Clean excerpt; empty string when the body has no words.
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

export type RobotsDirective = 'index, follow' | 'noindex, nofollow' | 'noindex, nofollow, nosnippet';

export interface SeoDocument {
  readonly title: string;
  readonly description: string;
  readonly canonical: string | null;
  readonly robots: RobotsDirective;
  readonly openGraph: Readonly<{ title: string; description: string; url: string; siteName: string; type: 'website' | 'article'; image: string; article?: Readonly<{ publishedTime: string; modifiedTime: string; section?: string; tags?: readonly string[]; authors?: readonly string[] }> }> | null;
  readonly twitter: Readonly<{ card: 'summary_large_image'; title: string; description: string; image: string }> | null;
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

/** Tenant brand icons served as stable same-host bytes (never signed redirects). */
export function tenantFavicon(faviconUrl: string | null | undefined): Pick<Metadata, 'icons' | 'manifest'> {
  if (faviconUrl === null || faviconUrl === undefined || faviconUrl === '') return {};
  return {
    icons: {
      icon: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
      apple: '/apple-touch-icon.png',
      shortcut: '/icon.png',
    },
    manifest: '/manifest.webmanifest',
  };
}

/**
 * Derive the public Facebook App ID from the platform app token.
 *
 * @param appToken - `APP_ID|APP_SECRET` token, or nullish when unconfigured.
 * @returns App ID for the `fb:app_id` tag, or null when no usable ID half exists.
 * @remarks `FB_APP_TOKEN` stores the Graph API app token as `APP_ID|APP_SECRET`.
 * Only the ID half is document metadata, so the secret never leaves the caller
 * that authenticates to the Graph API.
 */
export function facebookAppId(appToken: string | null | undefined): string | null {
  if (appToken === null || appToken === undefined) return null;
  const separator = appToken.indexOf('|');
  const appId = (separator === -1 ? appToken : appToken.slice(0, separator)).trim();
  return appId === '' ? null : appId;
}

/**
 * `fb:app_id` metadata for tenant documents.
 *
 * @param appToken - `APP_ID|APP_SECRET` token, or nullish when unconfigured.
 * @returns Facebook metadata carrying the App ID, or an empty object so an
 *   unconfigured deployment emits no empty tag that Meta would flag again.
 * @remarks Meta reports `fb:app_id` as a missing required property, and without
 * it insights and link-breakdown attributes stay unavailable for the tenant.
 */
export function tenantFacebook(appToken: string | null | undefined): Pick<Metadata, 'facebook'> {
  const appId = facebookAppId(appToken);
  return appId === null ? {} : { facebook: { appId } };
}

/** Uniform metadata for missing network content (unknown slug, empty id). */
export function notFoundMetadata(): Metadata {
  return {
    title: { absolute: 'Not Found' },
    description: 'Halaman tidak ditemukan.',
    robots: { index: false, follow: false },
    alternates: null,
    openGraph: null,
    twitter: null,
    icons: null,
    manifest: null,
  };
}

/**
 * Tenant homepage title: name plus the site's own tagline so tabs and SERPs
 * carry the portal identity, not a bare name.
 *
 * @param siteName - Tenant portal name.
 * @param siteDescription - Tenant portal description/tagline.
 * @returns "Name — Tagline" title truncated at a word boundary.
 */
function homeTitle(siteName: string, siteDescription: string): string {
  const chars = Array.from(siteDescription.trim());
  if (chars.length === 0) return siteName;
  const slice = chars.slice(0, 48).join('');
  const lastSpace = slice.lastIndexOf(' ');
  const tagline = `${(lastSpace > 24 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
  return chars.length <= 48 ? `${siteName} - ${siteDescription.trim()}` : `${siteName} - ${tagline}`;
}

/**
 * Resolve the canonical URL, honoring an editorial override.
 *
 * @param site - Tenant site data for the default hostname.
 * @param path - Default in-tenant path.
 * @param article - Article carrying an optional absolute canonical override.
 * @returns Override when it is an absolute http(s) URL; otherwise the tenant URL.
 */
export function resolveArticleCanonical(site: NetworkSiteData, path: string, article: NetworkArticle | undefined): string {
  const override = article?.canonicalUrl?.trim() ?? '';
  if (/^https?:\/\/[^/]+/u.test(override)) return override;
  return absoluteSiteUrl(site.context, path);
}

export function buildSeoDocument(site: NetworkSiteData, options: { readonly path: string; readonly article?: NetworkArticle; readonly indexable?: boolean; readonly titleOverride?: string; readonly descriptionOverride?: string; readonly robotsOverride?: RobotsDirective }): SeoDocument {
  const indexable = options.indexable ?? true;
  const article = options.article;
  const robots: RobotsDirective = options.robotsOverride ?? article?.robotsDirective ?? 'index, follow';
  const siteName = site.settings.seoSiteName || site.settings.name;
  const siteDescription = site.settings.seoDefaultDescription || site.settings.description;
  const title = options.titleOverride ?? (article === undefined ? (site.settings.seoDefaultTitle || (site.settings.tagline === null ? homeTitle(siteName, siteDescription) : `${siteName} - ${site.settings.tagline}`)) : `${article.title} - ${siteName}`);
  const description = options.descriptionOverride ?? article?.description ?? siteDescription;
  if (!indexable) return { title, description, canonical: null, robots: 'noindex, nofollow', openGraph: null, twitter: null, jsonLd: [] };
  const canonical = resolveArticleCanonical(site, options.path, article);
  const image = absoluteSiteAssetUrl(site.context, article?.imageUrl ?? site.settings.defaultImageUrl);
  const logo = absoluteSiteAssetUrl(site.context, site.settings.logoUrl);
  const publisherLogo = article?.publisherLogoUrl === null || article?.publisherLogoUrl === undefined
    ? logo
    : absoluteSiteAssetUrl(site.context, article.publisherLogoUrl);
  const publisher = article?.officialInstitution ?? article?.publisherName ?? siteName;
  const websiteId = absoluteSiteUrl(site.context, '/#website');
  const organizationId = absoluteSiteUrl(site.context, '/#organization');
  const aboutProfile = article === undefined && options.path === '/tentang' ? deriveAboutPublisher(site) : null;
  const sameAs = [...new Set([...Object.values(site.settings.socialLinks), ...Object.values(aboutProfile?.socials ?? {})].map((href) => href.trim()).filter((href) => /^https?:\/\//u.test(href)))];
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org', '@type': 'WebSite', '@id': websiteId, name: siteName, url: absoluteSiteUrl(site.context, '/'), inLanguage: 'id',
      potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: absoluteSiteUrl(site.context, '/search?q={search_term_string}') }, 'query-input': 'required name=search_term_string' },
    },
    {
      '@context': 'https://schema.org', '@type': 'Organization', '@id': organizationId, name: publisher, url: absoluteSiteUrl(site.context, '/'), logo: { '@type': 'ImageObject', url: logo },
      ...(aboutProfile === null
        ? {}
        : {
            description: aboutProfile.bio ?? description,
            ...(sameAs.length === 0 ? {} : { sameAs }),
            ...(aboutProfile.city === null
              ? {}
              : { address: { '@type': 'PostalAddress', addressLocality: aboutProfile.city, addressCountry: 'ID' } }),
          }),
    },
  ];
  if (aboutProfile !== null) {
    jsonLd.push({
      '@context': 'https://schema.org', '@type': 'AboutPage', '@id': `${canonical}#about`, url: canonical, name: title, description,
      inLanguage: 'id', about: { '@id': organizationId },
    });
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Beranda', item: absoluteSiteUrl(site.context, '/') }, { '@type': 'ListItem', position: 2, name: title, item: canonical }] });
  }
  if (article !== undefined) {
    const richText = 'bodyJson' in article && isTipTapDoc(article.bodyJson) ? tiptapToText(article.bodyJson) : '';
    const wordCount = (richText !== '' ? richText : stripHtml(article.body)).split(/\s+/u).filter(Boolean).length;
    jsonLd.push({
      '@context': 'https://schema.org', '@type': 'NewsArticle', '@id': `${canonical}#article`, headline: article.title, description: article.description,
      datePublished: article.publishedAt, dateModified: article.updatedAt, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      image: [image], inLanguage: 'id', isAccessibleForFree: true, wordCount,
      ...(article.categoryName === null ? {} : { articleSection: article.categoryName }),
      ...(article.tags.length === 0 ? {} : { keywords: article.tags.join(', ') }),
      ...((article.authorDisplayName ?? article.authorName) === null
        ? {}
        : { author: { '@type': 'Person', name: article.authorDisplayName ?? article.authorName ?? article.attribution } }),
      publisher: { '@type': 'Organization', name: publisher, logo: { '@type': 'ImageObject', url: publisherLogo } },
      isPartOf: { '@id': websiteId },
    });
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Beranda', item: absoluteSiteUrl(site.context, '/') }, ...(article.categoryName === null || article.categorySlug === null ? [] : [{ '@type': 'ListItem', position: 2, name: article.categoryName, item: absoluteSiteUrl(site.context, `/categories/${article.categorySlug}`) }]), { '@type': 'ListItem', position: article.categoryName === null ? 2 : 3, name: article.title, item: canonical }] });
  }
  const authorName = article === undefined ? undefined : (article.authorDisplayName ?? article.authorName ?? article.attribution);
  return {
    title, description, canonical, robots,
    openGraph: {
      title, description, url: canonical, siteName, type: article === undefined ? 'website' : 'article', image,
      ...(article === undefined
        ? {}
        : {
            article: {
              publishedTime: article.publishedAt,
              modifiedTime: article.updatedAt,
              ...(article.categoryName === null ? {} : { section: article.categoryName }),
              ...(article.tags.length === 0 ? {} : { tags: article.tags }),
              ...(authorName === undefined ? {} : { authors: [authorName] }),
            },
          }),
    },
    twitter: { card: 'summary_large_image', title, description, image },
    jsonLd,
  };
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

/**
 * Serialize robots.txt for a site.
 *
 * @remarks Search pages are noindex: disallow them to keep crawl budget on canonical URLs.
 * `/api/network/media/` is carved back out of the `/api/` catch-all because it is the only
 * crawler-facing image surface: uploaded article covers, gallery images, and the tenant
 * `site-default` card are all addressed there, so a blocked prefix makes social crawlers
 * report every one of them as "Corrupted Image" (Meta refuses the fetch and never sees the
 * bytes). The carve-out is longer than `/api/`, so longest-match precedence makes `Allow`
 * win. Logo and favicon already ship from `/logo.png` + `/icon.png` for the same reason.
 */
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
    'Allow: /icon.png',
    'Allow: /apple-touch-icon.png',
    'Allow: /logo.png',
    'Allow: /manifest.webmanifest',
    'Allow: /favicon.ico',
    'Allow: /api/network/media/',
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
  const stable = site.siteCreatedAt;
  const indexable = site.articles.filter((article) => article.robotsDirective?.startsWith('noindex') !== true);
  const homepageLastmod = indexable.reduce<string>(
    (latest, article) => (article.updatedAt > latest ? article.updatedAt : latest),
    stable,
  );
  const entries: SitemapEntry[] = [
    { loc: absoluteSiteUrl(site.context, '/'), lastmod: toLastmod(homepageLastmod, stable), changefreq: 'daily', priority: '1.0' },
    { loc: absoluteSiteUrl(site.context, '/kebijakan-privasi'), lastmod: toLastmod(homepageLastmod, stable), changefreq: 'monthly', priority: '0.3' },
    { loc: absoluteSiteUrl(site.context, '/syarat-ketentuan'), lastmod: toLastmod(homepageLastmod, stable), changefreq: 'monthly', priority: '0.3' },
    { loc: absoluteSiteUrl(site.context, '/tentang'), lastmod: toLastmod(homepageLastmod, stable), changefreq: 'monthly', priority: '0.3' },
    { loc: absoluteSiteUrl(site.context, '/kontak'), lastmod: toLastmod(homepageLastmod, stable), changefreq: 'monthly', priority: '0.3' },
  ];
  const seenCategories = new Set<string>();
  for (const article of indexable) {
    if (article.categorySlug !== null && !seenCategories.has(article.categorySlug)) {
      seenCategories.add(article.categorySlug);
      entries.push({
        loc: absoluteSiteUrl(site.context, `/categories/${article.categorySlug}`),
        lastmod: toLastmod(article.updatedAt, stable),
        changefreq: 'daily',
        priority: '0.7',
      });
    }
  }
  for (const article of indexable) {
    entries.push({
      loc: resolveArticleCanonical(site, `/${article.slug}`, isNetworkArticle(article) ? article : undefined),
      lastmod: toLastmod(article.updatedAt, stable),
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

/** Google News sitemap: only articles ≤2 days old, max 1000 URLs. */
export function serializeNewsSitemap(site: NetworkSiteData): string {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const items = site.articles
    .filter((article) => article.robotsDirective?.startsWith('noindex') !== true)
    .filter((article) => {
      const time = new Date(article.publishedAt).getTime();
      return !Number.isNaN(time) && time >= cutoff;
    })
    .slice(0, 1000);
  const body = items
    .map(
      (article) =>
        `<url><loc>${xml(resolveArticleCanonical(site, `/${article.slug}`, isNetworkArticle(article) ? article : undefined))}</loc><news:news><news:publication><news:name>${xml(site.settings.seoSiteName || site.settings.name)}</news:name><news:language>id</news:language></news:publication><news:publication_date>${xml(new Date(article.publishedAt).toISOString())}</news:publication_date><news:title>${xml(article.title)}</news:title></news:news></url>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}</urlset>`;
}

export function serializeRss(channel: {
  readonly context: ResolvedSiteContext;
  readonly siteName: string;
  readonly description: string;
  readonly articles: readonly FeedArticle[];
}): string {
  const feedChannel = absoluteSiteUrl(channel.context, '/');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${xml(channel.siteName)}</title><link>${xml(feedChannel)}</link><description>${xml(channel.description)}</description><language>id-ID</language>${channel.articles.map((article) => {
    const link = absoluteSiteUrl(channel.context, `/${article.slug}`);
    const enclosure = article.imageUrl === null ? '' : `<enclosure url="${xml(absoluteSiteAssetUrl(channel.context, article.imageUrl))}"${article.imageMediaType === null ? ' type="image/jpeg"' : ` type="${xml(article.imageMediaType)}"`} />`;
    return `<item><title>${xml(article.title)}</title><link>${xml(link)}</link><guid isPermaLink="true">${xml(link)}</guid><description>${xml(article.description)}</description><content:encoded>${xml(article.body)}</content:encoded>${enclosure}<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>${article.categoryName === null ? '' : `<category>${xml(article.categoryName)}</category>`}</item>`;
  }).join('')}</channel></rss>`;
}
