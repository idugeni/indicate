import 'server-only';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { buildSeoDocument } from '@/application/stage5/seo';
import type { PublicContentQuery, PublicSiteData } from '@/domain/stage5/models';
import { stage5Composition } from './stage5-composition';

export async function resolvePublicSite(query: PublicContentQuery = {}, path = '/'): Promise<PublicSiteData> {
  const requestHeaders = await headers(); const { resolver, content, config } = stage5Composition();
  const classification = await resolver.classify(requestHeaders.get('host'));
  if (classification.kind === 'ambiguous') throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  if (classification.kind !== 'site') notFound();
  const site = await content.load(classification.context, query, { path, locale: config.seo.defaultLocale });
  if (site === null) notFound(); return site;
}
export async function publicMetadata(path: string, query: PublicContentQuery = {}): Promise<Metadata> {
  const site = await resolvePublicSite(query, path); const article = query.articleSlug === undefined ? undefined : site.articles[0];
  if (query.articleSlug !== undefined && article === undefined) return { title: site.settings.name, robots: { index: false, follow: false }, icons: site.settings.faviconUrl === null ? undefined : { icon: site.settings.faviconUrl } };
  const seo = buildSeoDocument(site, { path, ...(article === undefined ? {} : { article }) });
  return { title: seo.title, description: seo.description, robots: { index: true, follow: true }, icons: site.settings.faviconUrl === null ? undefined : { icon: site.settings.faviconUrl }, alternates: { canonical: seo.canonical! }, openGraph: seo.openGraph === null ? undefined : { title: seo.openGraph.title, description: seo.openGraph.description, url: seo.openGraph.url, siteName: seo.openGraph.siteName, type: seo.openGraph.type, images: [seo.openGraph.image] } };
}
