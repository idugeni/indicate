import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { buildSeoDocument, indexableRobots, notFoundMetadata, tenantFavicon } from '@/modules/site/seo';
import { SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { LandingPage } from '@/modules/site/components/landing-page';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { deliveryComposition } from '@/modules/delivery';

const resolveRouteContext = cache(async () => {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const composition = await deliveryComposition();
  const classification = await composition.resolver.classify(host);

  if (classification.kind !== 'site') {
    return { composition, classification, site: null };
  }

  const site = await composition.content.load(
    classification.context,
    {},
    { path: '/', locale: composition.config.seo.defaultLocale }
  );

  return { composition, classification, site };
});

export async function generateMetadata(): Promise<Metadata> {
  const { classification, site } = await resolveRouteContext();

  if (classification.kind === 'control') {
    if (classification.surface === 'dashboard') {
      return {
        description: SERVICE_SUMMARY,
        robots: indexableRobots(),
        twitter: { card: 'summary_large_image' },
      };
    }

    return {
      title: { absolute: 'Indicate Control Plane' },
      description: 'Shared control plane for the Indicate publishing platform.',
      robots: { index: false, follow: false },
    };
  }

  if (classification.kind === 'ambiguous') {
    return {
      title: 'Configuration Error',
      robots: { index: false, follow: false },
    };
  }

  if (classification.kind !== 'site' || !site) {
    return notFoundMetadata();
  }

  const seo = buildSeoDocument(site, {
    path: '/',
    titleOverride: `${site.settings.name} — Berita Terkini, Laporan Redaksi, dan Siaran Pers`,
  });

  return {
    title: seo.title,
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

/** Klasifikasi host + muat konten butuh request + DB → streaming di belakang fallback. */
async function RootContent() {
  const { classification, site } = await resolveRouteContext();

  if (classification.kind === 'control' && classification.surface === 'dashboard') {
    return <LandingPage />;
  }

  if (classification.kind === 'ambiguous') {
    throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  }

  if (classification.kind !== 'site' || !site) {
    notFound();
  }

  return <ListingPage site={site} title={site.settings.name} />;
}

function RootLoading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman" className="mx-auto w-full max-w-6xl px-6 py-14 md:py-20">
      <div className="h-4 w-40 animate-pulse rounded bg-bg-raised-2" />
      <div className="mt-4 h-10 w-3/4 animate-pulse rounded bg-bg-raised-2" />
      <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-bg-raised-2" />
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<RootLoading />}>
      <RootContent />
    </Suspense>
  );
}