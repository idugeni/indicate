import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { indexableRobots } from '@/modules/site/seo';
import { docsPage } from '@/modules/docs/navigation';

export async function docsRequestHost(): Promise<string> {
  const requestHeaders = await headers();
  return requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'docs.indicate.web.id';
}

export function docsPageMetadata(host: string, slug: string): Metadata {
  const page = docsPage(slug);
  const siteName = 'Indicate Docs';
  if (page === null) return { title: 'Not Found', robots: { index: false, follow: false } };
  const canonical = `https://${host}${page.path}`;
  const title = page.slug === 'home' ? page.title : `${page.title} | ${siteName}`;
  const socialImage = `https://${host}/docs-opengraph-image`;
  return {
    title: { absolute: title },
    description: page.description,
    robots: indexableRobots(),
    alternates: { canonical, languages: { 'id-ID': canonical } },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: canonical,
      siteName,
      title,
      description: page.description,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description: page.description, images: [socialImage] },
  };
}
