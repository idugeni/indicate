import 'server-only';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { buildSeoDocument, indexableRobots, nonIndexableRobots, tenantFavicon } from '@/modules/site/seo';
import type { NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { isNetworkArticle } from '@/modules/delivery/models';
import { deliveryComposition } from '@/modules/delivery';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';

/**
 * Konten tenant per-host di Next cache. Tag memakai kosakata yang sama dengan
 * `planInvalidation()` (`host:`/`site:`/`org:`/`article:`) sehingga dispatcher invalidasi
 * yang sudah ada (publish/unpublish/media/hostname) fan-out otomatis tanpa
 * perubahan dispatcher. Key cache mencakup context + query + path + locale.
 */
async function loadFreshNetworkSite(
  context: ResolvedSiteContext,
  query: NetworkContentQuery,
  path: string,
  locale: string,
): Promise<NetworkSiteData | null> {
  const { content } = await deliveryComposition();
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
  const { content } = await deliveryComposition();
  return content.load(context, query, { path, locale });
}

/**
 * Selesaikan situs tenant untuk host dan path masuk.
 *
 * @remarks Sanitasi di sini agar key cache stabil (load internal memakai aturan yang sama).
 * Bypass Postgres dilewati sebelum loader cache: mutasi yang mengantre invalidasi
 * harus terbaca segar walau entri luar masih hangat.
 */
export async function resolveNetworkSite(query: NetworkContentQuery = {}, path = '/'): Promise<NetworkSiteData> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const { resolver, config, repository } = await deliveryComposition();
  const classification = await resolver.classify(host);
  if (classification.kind === 'ambiguous') throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  if (classification.kind !== 'site') notFound();
  const sanitized: NetworkContentQuery = {
    ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
    ...(query.categorySlug === undefined || query.categorySlug.trim() === '' ? {} : { categorySlug: normalizeSlugCandidate(query.categorySlug) }),
    ...(query.tag === undefined || query.tag.trim() === '' ? {} : { tag: normalizeSlugCandidate(query.tag).slice(0, TAG_MAX_LENGTH) }),
    ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
  };
  const bypassed = await repository.isCacheBypassed(classification.context);
  const site = bypassed
    ? await loadFreshNetworkSite(classification.context, sanitized, path, config.seo.defaultLocale)
    : await loadCachedNetworkSite(classification.context, sanitized, path, config.seo.defaultLocale);
  if (site === null) notFound();
  return site;
}

/** Tenant metadata; search pages stay `noindex, follow` (link equity without index entry). */

/**
 * Ambang indeks agregator: halaman daftar/tag/kategori di-noindex sampai volume
 * konten cukup (anti thin-content). Naik sendiri saat artikel bertambah —
 * tanpa konfigurasi per site.
 */
const TAG_INDEX_MINIMUM = 3;
const CATEGORY_INDEX_MINIMUM = 3;

/**
 * Metadata tenant untuk halaman yang sengaja tidak diindeks (pencarian,
 * agregator di bawah ambang, artikel hilang): tetap membawa canonical + OG
 * milik tenant agar tidak mewarisi metadata control-plane dari layout.
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
 * Susun metadata tenant untuk path dan query yang diberikan.
 *
 * @remarks Judul memakai bentuk absolut agar tidak ditempeli template '| Indicate' milik control-plane (src/app/layout.tsx).
 */
export async function networkMetadata(path: string, query: NetworkContentQuery = {}, titleOverride?: string): Promise<Metadata> {
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

  const seo = buildSeoDocument(site, { path, ...(article === undefined ? {} : { article }), ...(titleOverride === undefined ? {} : { titleOverride }) });
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
    robots: indexableRobots(),
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
          }),
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      images: [seo.openGraph.image],
    },
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
