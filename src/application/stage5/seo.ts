import type { PublicArticle, PublicSiteData, ResolvedSiteContext } from '@/domain/stage5/models';

export function absoluteSiteUrl(context: ResolvedSiteContext, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `https://${context.normalizedHostname}`);
  if (url.hostname !== context.normalizedHostname) throw new Error('Invalid site URL path');
  return url.toString();
}

export function absoluteSiteAssetUrl(context: ResolvedSiteContext, value: string): string {
  const parsed = new URL(value, `https://${context.normalizedHostname}`);
  return absoluteSiteUrl(context, `${parsed.pathname}${parsed.search}`);
}

function xml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export interface SeoDocument {
  readonly title: string;
  readonly description: string;
  readonly canonical: string | null;
  readonly robots: 'index, follow' | 'noindex, nofollow';
  readonly openGraph: Readonly<{ title: string; description: string; url: string; siteName: string; type: 'website' | 'article'; image: string }> | null;
  readonly jsonLd: readonly Readonly<Record<string, unknown>>[];
}

export function buildSeoDocument(site: PublicSiteData, options: { readonly path: string; readonly article?: PublicArticle; readonly indexable?: boolean }): SeoDocument {
  const indexable = options.indexable ?? true;
  const article = options.article;
  const title = article === undefined ? site.settings.name : `${article.title} | ${site.settings.name}`;
  const description = article?.description ?? site.settings.description;
  if (!indexable) return { title, description, canonical: null, robots: 'noindex, nofollow', openGraph: null, jsonLd: [] };
  const canonical = absoluteSiteUrl(site.context, options.path);
  const image = absoluteSiteAssetUrl(site.context, article?.imageUrl ?? site.settings.fallbackImageUrl);
  const logo = site.settings.logoUrl === null ? null : absoluteSiteAssetUrl(site.context, site.settings.logoUrl);
  const publisher = article?.officialInstitution ?? article?.publisherName ?? site.settings.name;
  const jsonLd: Record<string, unknown>[] = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site.settings.name, url: absoluteSiteUrl(site.context, '/') },
    { '@context': 'https://schema.org', '@type': 'Organization', name: publisher, url: absoluteSiteUrl(site.context, '/'), ...(logo === null ? {} : { logo }) },
  ];
  if (article !== undefined) {
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.title, description: article.description, datePublished: article.publishedAt, dateModified: article.updatedAt, mainEntityOfPage: canonical, image: [image], author: { '@type': 'Person', name: article.authorName ?? article.attribution }, publisher: { '@type': 'Organization', name: publisher, ...(logo === null ? {} : { logo: { '@type': 'ImageObject', url: logo } }) } });
    jsonLd.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Beranda', item: absoluteSiteUrl(site.context, '/') }, ...(article.categoryName === null || article.categorySlug === null ? [] : [{ '@type': 'ListItem', position: 2, name: article.categoryName, item: absoluteSiteUrl(site.context, `/categories/${article.categorySlug}`) }]), { '@type': 'ListItem', position: article.categoryName === null ? 2 : 3, name: article.title, item: canonical }] });
  }
  return { title, description, canonical, robots: 'index, follow', openGraph: { title, description, url: canonical, siteName: site.settings.name, type: article === undefined ? 'website' : 'article', image }, jsonLd };
}

export function serializeJsonLd(documents: readonly Readonly<Record<string, unknown>>[]): string {
  return safeJson(documents.length === 1 ? documents[0] : documents);
}

export function serializeRobots(site: PublicSiteData): string {
  const directives = site.settings.robots.length === 0 ? ['User-agent: *', 'Allow: /'] : site.settings.robots;
  return `${directives.join('\n')}\nSitemap: ${absoluteSiteUrl(site.context, '/sitemap.xml')}\n`;
}

export function serializeSitemap(site: PublicSiteData): string {
  const urls = [absoluteSiteUrl(site.context, '/'), ...site.articles.map((article) => absoluteSiteUrl(site.context, `/articles/${article.slug}`))];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xml(url)}</loc></url>`).join('')}</urlset>`;
}

export function serializeRss(site: PublicSiteData): string {
  const channel = absoluteSiteUrl(site.context, '/');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(site.settings.name)}</title><link>${xml(channel)}</link><description>${xml(site.settings.description)}</description>${site.articles.map((article) => `<item><title>${xml(article.title)}</title><link>${xml(absoluteSiteUrl(site.context, `/articles/${article.slug}`))}</link><guid isPermaLink="true">${xml(absoluteSiteUrl(site.context, `/articles/${article.slug}`))}</guid><description>${xml(article.description)}</description><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
}
