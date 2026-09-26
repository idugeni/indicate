import 'server-only';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { buildSeoDocument, indexableRobots, nonIndexableRobots, notFoundMetadata, tenantFacebook, tenantFavicon } from '@/modules/site/seo';
import type { NetworkContentQuery, NetworkSiteData, RequestClassification, ResolvedSiteContext } from '@/modules/delivery/models';
import { isNetworkArticle } from '@/modules/delivery/models';
import { activeDeliveryComposition, deliveryComposition } from '@/modules/delivery';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';
import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { readPageviewCounts } from '@/integrations/redis/pageview-buffer';
import { buildPageviewKey } from '@/modules/site/pageview-contract';

const getDeliveryComposition = cache(async () => deliveryComposition());

let cachedTenantFacebook: Pick<Metadata, 'facebook'> | undefined;

/**
 * `fb:app_id` for every tenant document, resolved once per process.
 *
 * @returns Facebook metadata for the platform app, or an empty object when
 *   `FB_APP_TOKEN` is unconfigured.
 * @remarks One Meta app serves the whole network, so the tag is platform-wide
 * rather than per-tenant; memoized because the token never changes at runtime.
 */
function tenantFacebookMetadata(): Pick<Metadata, 'facebook'> {
  if (cachedTenantFacebook === undefined) {
    cachedTenantFacebook = tenantFacebook(getBootstrapConfig().credentials.facebookAppToken?.reveal());
  }
  return cachedTenantFacebook;
}

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

const requireNetworkContext = cache(async (): Promise<ResolvedSiteContext> => {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const classification = await classifyTenantHost(host);
  if (classification.kind === 'ambiguous') throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  if (classification.kind !== 'site') notFound();
  return classification.context;
});

/**
 * Reject an unknown or control hostname before tenant content rendering.
 *
 * @returns Nothing when the request resolves to one active site.
 */
export async function assertNetworkHost(): Promise<void> {
  await requireNetworkContext();
}

/**
 * Per-site cache-bypass flag, cached in the Next data cache.
 *
 * @param organizationId - Owning organization of the site.
 * @param siteId - Site the flag belongs to.
 * @returns True when the site opted out of the shared content caches.
 * @remarks Reads one `cache_bypasses` row through a tenant-scoped transaction. Uncached, that transaction was the only Postgres work left on a warm public render (hostname and content are both cached), so every request on a warm instance serialised on the single pooled connection. Lifetime and tags mirror `loadCachedNetworkSite` so the flag and the content it gates are always evicted together and cannot disagree.
 */
async function readCachedBypass(organizationId: string, siteId: string): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`org:${organizationId}`, `site:${siteId}`);
  const { repository } = activeDeliveryComposition();
  return repository.isCacheBypassed({ organizationId, siteId });
}

const readBypassed = cache(readCachedBypass);

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
  return content.load(context, query, { path, locale }, true);
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
  const { content } = activeDeliveryComposition();
  return content.load(context, query, { path, locale }, false);
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
  const { content } = activeDeliveryComposition();
  return content.load(context, query, { path, locale }, false);
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
  const { config } = await getDeliveryComposition();
  const context = await requireNetworkContext();
  const sanitized: NetworkContentQuery = {
    ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
    ...(query.categorySlug === undefined || query.categorySlug.trim() === '' ? {} : { categorySlug: normalizeSlugCandidate(query.categorySlug) }),
    ...(query.tag === undefined || query.tag.trim() === '' ? {} : { tag: normalizeSlugCandidate(query.tag).slice(0, TAG_MAX_LENGTH) }),
    ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
  };
  const bypassed = await readBypassed(context.organizationId, context.siteId);
  const loader = sanitized.search === undefined ? loadCachedNetworkSite : loadCachedSearchSite;
  const site = bypassed
    ? await loadFreshNetworkSite(context, sanitized, path, config.seo.defaultLocale)
    : await loader(context, sanitized, path, config.seo.defaultLocale);
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

/**
 * Aggregator index threshold: list/tag/category pages stay noindex until content volume
 * is sufficient (anti thin-content). Rises on its own as articles grow,
 * with no per-site configuration.
 */
const TAG_INDEX_MINIMUM = 3;
const CATEGORY_INDEX_MINIMUM = 3;

/**
 * Social card entries for one tenant page, shared by Open Graph and Twitter.
 *
 * @param image - Absolute social image URL for the page.
 * @param alt - Text alternative describing that image.
 * @param width - Intrinsic width when known, else the 1200 card width.
 * @param height - Intrinsic height when known, else the 630 card height.
 * @param mediaType - Verified MIME type of that image, when the read path knows it.
 * @returns Matching `openGraph.images` and `twitter.images` entries.
 * @remarks Both surfaces take the same entry so the two cannot drift, which is
 * how `twitter:image:alt` went missing while `og:image:alt` existed. The MIME
 * type is emitted only when the read path actually carries it: an article
 * resolves `imageMediaType` and the site default image resolves
 * `defaultImageMediaType`, both from the `media` row, so neither is guessed. A
 * site with no default media, or a media row predating dimension capture, simply
 * omits the field — every major scraper sniffs the bytes it fetches, and a
 * wrongly declared type is worse than none.
 */
function socialCardImages(image: string, alt: string, width = 1200, height = 630, mediaType?: string | null) {
  const typed = isDeclaredImageType(mediaType) ? { type: mediaType } : {};
  const entry = { url: image, alt, width, height, ...typed };
  return { openGraphImages: [entry], twitterImages: [entry] };
}

/**
 * Narrow a stored media type to something safe to publish as `og:image:type`.
 *
 * @param mediaType - Candidate MIME type from the media record.
 * @returns The type when it is a well-formed image MIME, otherwise `null`.
 */
function isDeclaredImageType(mediaType: string | null | undefined): mediaType is string {
  return typeof mediaType === 'string' && /^image\/[a-z0-9.+-]+$/iu.test(mediaType.trim());
}

/**
 * Tenant metadata for deliberately unindexed pages (search,
 * below-threshold aggregators): still carries the tenant's own canonical + OG
 * so it never inherits control-plane metadata from the layout.
 */
function tenantHiddenMeta(
  site: NetworkSiteData,
  path: string,
  title: string,
  description: string,
): Metadata {
  const seo = buildSeoDocument(site, { path, titleOverride: title });
  const card = seo.openGraph === null
    ? null
    : socialCardImages(
        seo.openGraph.image,
        site.settings.name,
        site.settings.defaultImageWidth ?? 1200,
        site.settings.defaultImageHeight ?? 630,
        site.settings.defaultImageMediaType,
      );
  return {
    title: { absolute: title },
    description,
    alternates: seo.canonical
      ? { canonical: seo.canonical, languages: { 'id-ID': seo.canonical } }
      : undefined,
    robots: nonIndexableRobots(),
    ...tenantFavicon(site.settings.faviconUrl),
    ...tenantFacebookMetadata(),
    openGraph: card === null || seo.openGraph === null
      ? undefined
      : {
          title,
          description,
          url: seo.openGraph.url,
          siteName: seo.openGraph.siteName,
          locale: 'id_ID',
          images: card.openGraphImages,
          type: 'website' as const,
        },
    twitter: card === null
      ? undefined
      : { card: 'summary_large_image', title, description, images: card.twitterImages },
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
    return notFoundMetadata();
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
        ...tenantFacebookMetadata(),
      };
    }
    const categoryCard = socialCardImages(
      categorySeo.openGraph.image,
      site.settings.name,
      site.settings.defaultImageWidth ?? 1200,
      site.settings.defaultImageHeight ?? 630,
      site.settings.defaultImageMediaType,
    );
    return {
      title: { absolute: categoryTitle },
      description: categoryDescription,
      alternates: {
        canonical: categorySeo.canonical,
        languages: { 'id-ID': categorySeo.canonical },
      },
      robots: indexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
      ...tenantFacebookMetadata(),
      openGraph: {
        title: categoryTitle,
        description: categoryDescription,
        url: categorySeo.openGraph.url,
        siteName: categorySeo.openGraph.siteName,
        locale: 'id_ID',
        images: categoryCard.openGraphImages,
        type: 'website' as const,
      },
      twitter: {
        card: 'summary_large_image',
        title: categoryTitle,
        description: categoryDescription,
        images: categoryCard.twitterImages,
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
    const tagCard = tagSeo.openGraph === null
      ? null
      : socialCardImages(
          tagSeo.openGraph.image,
          site.settings.name,
          site.settings.defaultImageWidth ?? 1200,
          site.settings.defaultImageHeight ?? 630,
          site.settings.defaultImageMediaType,
        );
    return {
      title: { absolute: tagTitle },
      description: tagDescription,
      alternates: tagSeo.canonical
        ? { canonical: tagSeo.canonical, languages: { 'id-ID': tagSeo.canonical } }
        : undefined,
      robots: indexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
      ...tenantFacebookMetadata(),
      openGraph: tagCard === null || tagSeo.openGraph === null
        ? undefined
        : {
            title: tagTitle,
            description: tagDescription,
            url: tagSeo.openGraph.url,
            siteName: tagSeo.openGraph.siteName,
            locale: 'id_ID',
            images: tagCard.openGraphImages,
            type: 'website' as const,
          },
      twitter: tagCard === null
        ? undefined
        : { card: 'summary_large_image', title: tagTitle, description: tagDescription, images: tagCard.twitterImages },
    };
  }

  const seo = buildSeoDocument(site, { path, ...(article === undefined ? {} : { article }), ...(titleOverride === undefined ? {} : { titleOverride }), ...(descriptionOverride === undefined ? {} : { descriptionOverride }) });
  if (seo.canonical === null || seo.openGraph === null) {
    return {
      title: { absolute: seo.title },
      description: seo.description,
      robots: nonIndexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
      ...tenantFacebookMetadata(),
    };
  }

  const card = socialCardImages(
    seo.openGraph.image,
    article?.title ?? site.settings.name,
    article?.imageWidth ?? site.settings.defaultImageWidth ?? 1200,
    article?.imageHeight ?? site.settings.defaultImageHeight ?? 630,
    article === undefined ? site.settings.defaultImageMediaType : article.imageMediaType,
  );

  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: {
      canonical: seo.canonical,
      languages: { 'id-ID': seo.canonical },
    },
    robots: robotsForDocument(seo.robots),
    ...tenantFavicon(site.settings.faviconUrl),
    ...tenantFacebookMetadata(),
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      siteName: seo.openGraph.siteName,
      locale: 'id_ID',
      images: card.openGraphImages,
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
      ? { card: seo.twitter.card, title: seo.twitter.title, description: seo.twitter.description, images: card.twitterImages }
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
