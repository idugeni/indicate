import 'server-only';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { buildSeoDocument, indexableRobots, nonIndexableRobots, tenantFavicon } from '@/modules/site/seo';
import type { NetworkContentQuery, NetworkSiteData, RequestClassification, ResolvedSiteContext } from '@/modules/delivery/models';
import { isNetworkArticle } from '@/modules/delivery/models';
import { deliveryComposition } from '@/modules/delivery';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { readPageviewCounts } from '@/integrations/redis/pageview-buffer';
import { buildPageviewKey } from '@/modules/site/pageview-contract';

const getDeliveryComposition = cache(async () => deliveryComposition());

/**
 * Classify a request hostname with per-request deduplication.
 *
 * @param host - Value of `x-forwarded-host` or `host` for the request.
 * @returns Control, site, or error classification for the hostname.
 * @remarks Shared by page, metadata, and throttle helpers so one request pays a single hostname lookup no matter how many server components resolve the tenant.
 */
export const classifyTenantHost = cache(async (host: string | null | undefined): Promise<RequestClassification> => {
  const { resolver } = await getDeliveryComposition();
  return resolver.classify(host);
});

const readBypassed = cache(async (organizationId: string, siteId: string): Promise<boolean> => {
  const { repository } = await getDeliveryComposition();
  return repository.isCacheBypassed({ organizationId, siteId });
});

const readArticleBuffer = cache(async (organizationId: string, siteId: string, articleSiteId: string): Promise<number> => {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') return 0;
    const context = await getServerRuntimeContext();
    const [pending] = await readPageviewCounts({
      url: context.config.redis.url,
      token: context.config.redis.token,
      keys: [buildPageviewKey(context.bootstrap.environment, { o: organizationId, s: siteId, a: articleSiteId })],
    });
    return pending ?? 0;
  } catch {
    return 0;
  }
});

/**
 * Per-host tenant content in the Next cache. Tags use the same vocabulary as
 * `planInvalidation()` (`host:`/`site:`/`org:`/`article:`) so the existing invalidation dispatcher
 * (publish/unpublish/media/hostname) fans out automatically with no
 * dispatcher changes. Cache keys cover context + query + path + locale.
 */
async function loadFreshNetworkSite(
  context: ResolvedSiteContext,
  query: NetworkContentQuery,
  path: string,
  locale: string,
): Promise<NetworkSiteData | null> {
  const { content } = await getDeliveryComposition();
  return content.load(context, query, { path, locale });
}
async function loadCachedNetworkSite(
  context: ResolvedSiteContext,
  query: NetworkContentQuery,
  path: string,
  locale: string,
): Promise<NetworkSiteData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`, ...(query.articleSlug === undefined ? [] : [`article:${query.articleSlug}`]));
  const { content } = await getDeliveryComposition();
  return content.load(context, query, { path, locale });
}
async function loadCachedSearchSite(
  context: ResolvedSiteContext,
  query: NetworkContentQuery,
  path: string,
  locale: string,
): Promise<NetworkSiteData | null> {
  'use cache';
  cacheLife('seconds');
  cacheTag(`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`);
  const { content } = await getDeliveryComposition();
  return content.load(context, query, { path, locale });
}

/**
 * Resolve the tenant site for the incoming host and path.
 *
 * @remarks Sanitize here to keep cache keys stable (internal loads use the same rules).
 * Host classification, delivery composition, and the bypass flag are deduplicated per request
 * via `cache()` so `generateMetadata()` + page components + neighbor lookups
 * share one context without duplicate transactions. Search queries use the
 * `seconds` loader so unbounded keys never inhabit the minute cache.
 */
export async function resolveNetworkSite(query: NetworkContentQuery = {}, path = '/'): Promise<NetworkSiteData> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const { config } = await getDeliveryComposition();
  const classification = await classifyTenantHost(host);
  if (classification.kind === 'ambiguous') throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  if (classification.kind !== 'site') notFound();
  const sanitized: NetworkContentQuery = {
    ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
    ...(query.categorySlug === undefined || query.categorySlug.trim() === '' ? {} : { categorySlug: normalizeSlugCandidate(query.categorySlug) }),
    ...(query.tag === undefined || query.tag.trim() === '' ? {} : { tag: normalizeSlugCandidate(query.tag).slice(0, TAG_MAX_LENGTH) }),
    ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
  };
  const bypassed = await readBypassed(classification.context.organizationId, classification.context.siteId);
  const loader = sanitized.search === undefined ? loadCachedNetworkSite : loadCachedSearchSite;
  const site = bypassed
    ? await loadFreshNetworkSite(classification.context, sanitized, path, config.seo.defaultLocale)
    : await loader(classification.context, sanitized, path, config.seo.defaultLocale);
  if (site === null) notFound();
  if (sanitized.articleSlug === undefined) return site;
  const head = site.articles[0];
  if (head === undefined) return site;
  const pending = await readArticleBuffer(site.context.organizationId, site.context.siteId, head.articleSiteId);
  if (pending === 0) return site;
  return {
    ...site,
    articles: site.articles.map((item, index) => (index === 0 ? { ...item, viewCount: item.viewCount + pending } : item)),
  };
}

/** Tenant metadata; search pages stay `noindex, follow` (link equity without index entry). */

/**
 * Aggregator index threshold: list/tag/category pages stay noindex until content volume
 * is sufficient (anti thin-content). Rises on its own as articles grow,
 * with no per-site configuration.
 */
const TAG_INDEX_MINIMUM = 3;
const CATEGORY_INDEX_MINIMUM = 3;

/**
 * Tenant metadata for deliberately unindexed pages (search,
 * below-threshold aggregators, missing articles): still carries the tenant's own canonical + OG
 * so it never inherits control-plane metadata from the layout.
 */
function tenantHiddenMeta(
  site: NetworkSiteData,
  path: string,
  title: string,
  description: string,
): Metadata {
  const seo = buildSeoDocument(site, { path, titleOverride: title });
  return {
    title: { absolute: title },
    description,
    alternates: seo.canonical
      ? { canonical: seo.canonical, languages: { 'id-ID': seo.canonical } }
      : undefined,
    robots: nonIndexableRobots(),
    ...tenantFavicon(site.settings.faviconUrl),
    openGraph: seo.openGraph
      ? {
          title,
          description,
          url: seo.openGraph.url,
          siteName: seo.openGraph.siteName,
          locale: 'id_ID',
          images: [{ url: seo.openGraph.image, width: 1200, height: 630, alt: title }],
          type: 'website' as const,
        }
      : undefined,
    twitter: seo.openGraph
      ? { card: 'summary_large_image', title, description, images: [seo.openGraph.image] }
      : undefined,
  };
}
/**
 * Map a document robots directive to Next metadata.
 *
 * @param robots - Document-level directive from the SEO builder.
 * @returns Next robots object; nosnippet appends the matching flag.
 */
function robotsForDocument(robots: 'index, follow' | 'noindex, nofollow' | 'noindex, nofollow, nosnippet'): Metadata['robots'] {
  if (robots === 'index, follow') return indexableRobots();
  const base = nonIndexableRobots();
  if (robots === 'noindex, nofollow, nosnippet' && typeof base === 'object' && base !== null) return { ...base, nosnippet: true };
  return base;
}

/**
 * Build tenant metadata for the given path and query.
 *
 * @remarks Titles use the absolute form so the control-plane '| Indicate' template (src/app/layout.tsx) is never appended.
 */
export async function networkMetadata(path: string, query: NetworkContentQuery = {}, titleOverride?: string, descriptionOverride?: string): Promise<Metadata> {
  const site = await resolveNetworkSite(query, path);
  const candidate = query.articleSlug === undefined ? undefined : site.articles[0];
  const article = candidate !== undefined && isNetworkArticle(candidate) ? candidate : undefined;

  if (query.articleSlug !== undefined && article === undefined) {
    return tenantHiddenMeta(site, path, site.settings.name, site.settings.seoDefaultDescription ?? site.settings.description);
  }

  if (query.search !== undefined) {
    return tenantHiddenMeta(
      site,
      '/search',
      query.search === '' ? `Pencarian - ${site.settings.name}` : `Hasil untuk "${query.search}" - ${site.settings.name}`,
      site.settings.seoDefaultDescription ?? site.settings.description,
    );
  }

  if (query.categorySlug !== undefined) {
    const categoryName = site.articles[0]?.categoryName ?? query.categorySlug;
    const categoryTitle = `${categoryName} - ${site.settings.seoSiteName ?? site.settings.name}`;
    const categoryDescription =
      site.articles.length > 0
        ? `Liputan ${categoryName} pilihan redaksi ${site.settings.name}: ${site.articles.length} laporan terkini, diperbarui mengikuti perkembangan di lapangan.`
        : `Arsip liputan ${categoryName} redaksi ${site.settings.name}.`;
    if (site.articles.length < CATEGORY_INDEX_MINIMUM) {
      return tenantHiddenMeta(site, path, categoryTitle, categoryDescription);
    }
    const categorySeo = buildSeoDocument(site, { path });
    if (categorySeo.canonical === null || categorySeo.openGraph === null) {
      return {
        title: { absolute: categoryTitle },
        description: categoryDescription,
        robots: indexableRobots(),
        ...tenantFavicon(site.settings.faviconUrl),
      };
    }
    return {
      title: { absolute: categoryTitle },
      description: categoryDescription,
      alternates: {
        canonical: categorySeo.canonical,
        languages: { 'id-ID': categorySeo.canonical },
      },
      robots: indexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
      openGraph: {
        title: categoryTitle,
        description: categoryDescription,
        url: categorySeo.openGraph.url,
        siteName: categorySeo.openGraph.siteName,
        locale: 'id_ID',
        images: [{ url: categorySeo.openGraph.image, width: 1200, height: 630, alt: categoryName }],
        type: 'website' as const,
      },
      twitter: {
        card: 'summary_large_image',
        title: categoryTitle,
        description: categoryDescription,
        images: [categorySeo.openGraph.image],
      },
    };
  }

  if (query.tag !== undefined) {
    const tagTitle = `Topik: #${query.tag} - ${site.settings.seoSiteName ?? site.settings.name}`;
    const tagDescription =
      site.articles.length > 0
        ? `Kumpulan ${site.articles.length} laporan bertopik #${query.tag} pilihan redaksi ${site.settings.name}.`
        : `Arsip topik #${query.tag} redaksi ${site.settings.name}.`;
    if (site.articles.length < TAG_INDEX_MINIMUM) {
      return tenantHiddenMeta(site, path, tagTitle, tagDescription);
    }
    const tagSeo = buildSeoDocument(site, { path, titleOverride: tagTitle });
    return {
      title: { absolute: tagTitle },
      description: tagDescription,
      alternates: tagSeo.canonical
        ? { canonical: tagSeo.canonical, languages: { 'id-ID': tagSeo.canonical } }
        : undefined,
      robots: indexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
      openGraph: tagSeo.openGraph
        ? {
            title: tagTitle,
            description: tagDescription,
            url: tagSeo.openGraph.url,
            siteName: tagSeo.openGraph.siteName,
            locale: 'id_ID',
            images: [{ url: tagSeo.openGraph.image, width: 1200, height: 630, alt: tagTitle }],
            type: 'website' as const,
          }
        : undefined,
    };
  }

  const seo = buildSeoDocument(site, { path, ...(article === undefined ? {} : { article }), ...(titleOverride === undefined ? {} : { titleOverride }), ...(descriptionOverride === undefined ? {} : { descriptionOverride }) });
  if (seo.canonical === null || seo.openGraph === null) {
    return {
      title: { absolute: seo.title },
      description: seo.description,
      robots: nonIndexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
    };
  }

  const ogImage = {
    url: seo.openGraph.image,
    width: article?.imageWidth ?? 1200,
    height: article?.imageHeight ?? 630,
    alt: article?.title ?? site.settings.name,
  };

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: {
      canonical: seo.canonical,
      languages: { 'id-ID': seo.canonical },
    },
    robots: robotsForDocument(seo.robots),
    ...tenantFavicon(site.settings.faviconUrl),
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      siteName: seo.openGraph.siteName,
      locale: 'id_ID',
      images: [ogImage],
      ...(article === undefined
        ? { type: 'website' as const }
        : {
            type: 'article' as const,
            publishedTime: article.publishedAt,
            modifiedTime: article.updatedAt,
            authors: [article.authorDisplayName ?? article.authorName ?? article.attribution],
            section: article.categoryName ?? undefined,
            tags: article.tags.length === 0 ? undefined : [...article.tags],
          }),
    },
    twitter: seo.twitter
      ? { card: seo.twitter.card, title: seo.twitter.title, description: seo.twitter.description, images: [seo.twitter.image] }
      : undefined,
    ...(article === undefined
      ? {}
      : {
          authors: [{ name: article.authorDisplayName ?? article.authorName ?? article.attribution }],
          keywords: article.categoryName === null && article.tags.length === 0
            ? undefined
            : [...(article.categoryName === null ? [] : [article.categoryName]), ...article.tags],
        }),
  };
}
