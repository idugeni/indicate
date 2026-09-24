import { Suspense } from 'react';
import type { Metadata } from 'next';
import { buildSeoDocument, indexableRobots, tenantFavicon } from '@/modules/site/seo';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 25;

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/');
  const seo = buildSeoDocument(site, { path: '/' });

  return {
    title: { absolute: seo.title },
    description: seo.description,
    robots: indexableRobots(),
    ...tenantFavicon(site.settings.faviconUrl),
    alternates: seo.canonical
      ? { canonical: seo.canonical, languages: { 'id-ID': seo.canonical } }
      : undefined,
    openGraph: seo.openGraph
      ? {
          ...seo.openGraph,
          locale: 'id_ID',
          images: seo.openGraph.image
            ? [{ url: seo.openGraph.image, width: 1200, height: 630, alt: seo.title }]
            : [],
        }
      : undefined,
    twitter: seo.openGraph
      ? {
          card: 'summary_large_image',
          title: seo.openGraph.title,
          description: seo.openGraph.description,
          images: [seo.openGraph.image],
        }
      : undefined,
  };
}

/**
 * Render the static portal shell.
 *
 * @remarks Hostname is only read inside Suspense for instant validation, matching the sibling network routes.
 */
export default function TenantHomePage() {
  return (
    <Suspense fallback={<RootLoading />}>
      <TenantHomeContent />
    </Suspense>
  );
}

async function TenantHomeContent() {
  const site = await resolveNetworkSite({}, '/');
  return <ListingPage site={site} title={site.settings.name} />;
}
