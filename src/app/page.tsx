import { cache } from 'react';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { indexableRobots } from '@/modules/site/seo';
import { controlPlaneIcons } from '@/ui/site/metadata-guard';
import { resolveGoogleSiteVerification } from '@/core/config/google-verification';
import { SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { LandingPage } from '@/modules/site/components/landing-page';
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
      const google = resolveGoogleSiteVerification();
      return {
        description: SERVICE_SUMMARY,
        robots: indexableRobots(),
        ...(google === undefined ? {} : { verification: { google } }),
        ...controlPlaneIcons(),
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

  return {
    title: 'Not Found',
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: '#f4f2ec',
  colorScheme: 'light',
};

/** Control-plane `/` (landing). Portal home renders `(network)/tenant-home`
 *  via rewrite proxy to follow the tenant segment boundary. */
export default async function RootPage() {
  const { classification } = await resolveRouteContext();

  if (classification.kind === 'control' && classification.surface === 'dashboard') {
    return <LandingPage />;
  }

  if (classification.kind === 'ambiguous') {
    throw new Error('AMBIGUOUS_PUBLIC_HOST_CONFIGURATION');
  }

  notFound();
}
