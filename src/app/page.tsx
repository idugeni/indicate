import { cache } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { indexableRobots } from '@/modules/site/seo';
import { SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { LandingPage } from '@/modules/site/components/landing-page';
import { DocsShell } from '@/modules/docs/components/docs-ui';
import { DocsHomeContent } from '@/modules/docs/components/home-content';
import { docsPageMetadata } from '@/modules/docs/page-meta';
import { deliveryComposition } from '@/modules/delivery';

const resolveRouteContext = cache(async () => {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const composition = await deliveryComposition();
  const classification = await composition.resolver.classify(host);
  return { classification };
});

export async function generateMetadata(): Promise<Metadata> {
  const { classification } = await resolveRouteContext();

  if (classification.kind === 'control') {
    if (classification.surface === 'dashboard') {
      return {
        description: SERVICE_SUMMARY,
        robots: indexableRobots(),
        twitter: { card: 'summary_large_image' },
      };
    }

    if (classification.surface === 'docs') {
      return docsPageMetadata(classification.hostname, 'home');
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

  return {
    title: 'Not Found',
    robots: { index: false, follow: false },
  };
}

/** Control-plane `/` (landing). Beranda portal dirender `(network)/tenant-home`
 *  via rewrite proxy agar ikut boundary segmen tenant. */
export default async function RootPage() {
  const { classification } = await resolveRouteContext();

  if (classification.kind === 'control' && classification.surface === 'dashboard') {
    return <LandingPage />;
  }

  if (classification.kind === 'control' && classification.surface === 'docs') {
    return (
      <DocsShell host={classification.hostname}>
        <DocsHomeContent host={classification.hostname} />
      </DocsShell>
    );
  }

  if (classification.kind === 'ambiguous') {
    throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  }

  notFound();
}
