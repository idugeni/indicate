import 'server-only';
import type { Metadata } from 'next';
import { after } from 'next/server';
import { cacheLife, cacheTag } from 'next/cache';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Redis } from '@upstash/redis';
import { buildSeoDocument, indexableRobots, nonIndexableRobots, tenantFavicon } from '@/modules/site/seo';
import type { NetworkContentQuery, NetworkSiteData, ResolvedSiteContext } from '@/modules/delivery/models';
import { deliveryComposition } from '@/modules/delivery';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';

/**
 * Konten tenant per-host di Next cache. Tag memakai kosakata yang sama dengan
 * `planInvalidation()` (`host:`/`site:`/`org:`) sehingga dispatcher invalidasi
 * yang sudah ada (publish/unpublish/media/hostname) fan-out otomatis tanpa
 * perubahan dispatcher. Key cache mencakup context + query + path + locale.
 */
async function loadCachedNetworkSite(
  context: ResolvedSiteContext,
  query: NetworkContentQuery,
  path: string,
  locale: string,
): Promise<NetworkSiteData | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`);
  const { content } = await deliveryComposition();
  return content.load(context, query, { path, locale });
}

export async function resolveNetworkSite(query: NetworkContentQuery = {}, path = '/'): Promise<NetworkSiteData> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const { resolver, config } = await deliveryComposition();
  const classification = await resolver.classify(host);
  if (classification.kind === 'ambiguous') throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  if (classification.kind !== 'site') notFound();
  // Sanitasi di sini agar key cache stabil (load internal memakai aturan yang sama).
  const sanitized: NetworkContentQuery = {
    ...(query.articleSlug === undefined ? {} : { articleSlug: query.articleSlug.trim().toLowerCase() }),
    ...(query.categorySlug === undefined ? {} : { categorySlug: query.categorySlug.trim().toLowerCase() }),
    ...(query.tag === undefined || query.tag.trim() === '' ? {} : { tag: query.tag.trim().toLowerCase().slice(0, 60) }),
    ...(query.search === undefined || query.search.trim() === '' ? {} : { search: query.search.trim().slice(0, 120) }),
  };
  const site = await loadCachedNetworkSite(classification.context, sanitized, path, config.seo.defaultLocale);
  if (site === null) notFound();
  return site;
}

export function trackArticleView(input: { readonly organizationId: string; readonly siteId: string; readonly articleSiteId: string }): void {
  // Non-blocking: hitungan pageview (bukan unik) tanpa cookie/fingerprint.
  after(async () => {
    try {
      const context = await getServerRuntimeContext();
      const redis = new Redis({ url: context.config.redis.url, token: context.config.redis.token });
      const key = `pv:${context.bootstrap.environment}:${input.organizationId}:${input.siteId}:${input.articleSiteId}`;
      await redis.incr(key);
    } catch {
      /* hitungan boleh hilang; tayangan tidak boleh gagal */
    }
  });
}

/** Tenant metadata; search pages stay `noindex, follow` (link equity without index entry). */
export async function networkMetadata(path: string, query: NetworkContentQuery = {}): Promise<Metadata> {
  const site = await resolveNetworkSite(query, path);
  const article = query.articleSlug === undefined ? undefined : site.articles[0];

  if (query.articleSlug !== undefined && article === undefined) {
    return {
      title: site.settings.name,
      robots: nonIndexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
    };
  }

  if (query.search !== undefined) {
    const seo = buildSeoDocument(site, { path: '/search', indexable: false });
    return {
      title: query.search === '' ? `Pencarian | ${site.settings.name}` : `Hasil untuk "${query.search}" | ${site.settings.name}`,
      description: seo.description,
      robots: nonIndexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
    };
  }

  if (query.categorySlug !== undefined) {
    const categoryName = site.articles[0]?.categoryName ?? query.categorySlug;
    const categoryTitle = `${categoryName} | ${site.settings.name}`;
    const categoryDescription =
      site.articles.length > 0
        ? `Berita terbaru kategori ${categoryName} di ${site.settings.name}.`
        : `Kategori ${categoryName} di ${site.settings.name}.`;
    const categorySeo = buildSeoDocument(site, { path });
    if (categorySeo.canonical === null || categorySeo.openGraph === null) {
      return {
        title: categoryTitle,
        description: categoryDescription,
        robots: indexableRobots(),
        ...tenantFavicon(site.settings.faviconUrl),
      };
    }
    return {
      title: categoryTitle,
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

  if (path === '/articles' && query.articleSlug === undefined && query.search === undefined && query.categorySlug === undefined) {
    const indexTitle = `Berita Terbaru | ${site.settings.name}`;
    const indexDescription = `Berita terbaru di ${site.settings.name}: indeks seluruh artikel.`;
    const indexSeo = buildSeoDocument(site, { path });
    if (indexSeo.canonical === null || indexSeo.openGraph === null) {
      return {
        title: indexTitle,
        description: indexDescription,
        robots: indexableRobots(),
        ...tenantFavicon(site.settings.faviconUrl),
      };
    }
    return {
      title: indexTitle,
      description: indexDescription,
      alternates: {
        canonical: indexSeo.canonical,
        languages: { 'id-ID': indexSeo.canonical },
      },
      robots: indexableRobots(),
      ...tenantFavicon(site.settings.faviconUrl),
      openGraph: {
        title: indexTitle,
        description: indexDescription,
        url: indexSeo.openGraph.url,
        siteName: indexSeo.openGraph.siteName,
        locale: 'id_ID',
        images: [{ url: indexSeo.openGraph.image, width: 1200, height: 630, alt: indexTitle }],
        type: 'website' as const,
      },
      twitter: {
        card: 'summary_large_image',
        title: indexTitle,
        description: indexDescription,
        images: [indexSeo.openGraph.image],
      },
    };
  }

  const seo = buildSeoDocument(site, { path, ...(article === undefined ? {} : { article }) });
  if (seo.canonical === null || seo.openGraph === null) {
    return {
      title: seo.title,
      description: seo.description,
      robots: nonIndexableRobots(),
    };
  }

  const ogImage = {
    url: seo.openGraph.image,
    width: article?.imageWidth ?? 1200,
    height: article?.imageHeight ?? 630,
    alt: article?.title ?? site.settings.name,
  };

  return {
    title: seo.title,
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
            authors: [article.authorName ?? article.attribution],
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
          authors: [{ name: article.authorName ?? article.attribution }],
          keywords: article.categoryName === null ? undefined : [article.categoryName],
        }),
  };
}
