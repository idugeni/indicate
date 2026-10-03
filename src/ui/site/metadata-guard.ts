import 'server-only';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { getPublicConfig } from '@/core/config/public-config';
import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import { resolveGoogleSiteVerification } from '@/core/config/google-verification';
import { deliveryComposition } from '@/modules/delivery';
import { indexableRobots } from '@/modules/site/seo';
import { SERVICE_NAME } from '@/ui/site/marketing-content';

/** Defense-in-depth: repeats the proxy's tenant-host refusal at the page so a routing change can't expose service pages. */
export async function requireDashboardSurface(): Promise<void> {
  const { resolver } = await deliveryComposition();
  const classification = await resolver.classify((await headers()).get('host'));
  if (classification.kind !== 'control' || classification.surface !== 'dashboard') notFound();
}

function controlPlaneOrigin(): string {
  try {
    const siteUrl = getPublicConfig(process.env).siteUrl.trim();
    return new URL(siteUrl).toString().replace(/\/$/, '');
  } catch {
    const dashboardHost = getBootstrapConfig().controlHosts.dashboard;
    return `https://${dashboardHost}`;
  }
}

/**
 * Shared control-plane icons: the ICO covers legacy browsers while the 512px
 * PNG gives crawlers (Google recommends larger than 48x48) a high-resolution
 * source under `rel="icon"` itself, not only `apple-touch-icon`.
 *
 * @returns Icons metadata shared by every control-plane surface.
 */
export function controlPlaneIcons(): Pick<Metadata, 'icons'> {
  return {
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: '/apple-icon.png',
    },
  };
}

/**
 * Build canonical control-plane metadata for a marketing page.
 *
 * @param title - Short page title without brand suffix.
 * @param description - Page description reused for Open Graph and Twitter.
 * @param path - Canonical path starting with `/`.
 * @returns Metadata with canonical URL, indexable robots, and social cards.
 * @remarks Social images are intentionally unset: the colocated
 * `opengraph-image.tsx` file supplies the per-page card automatically
 * (nested generated images carry a Next-assigned hash suffix, so hardcoding
 * the URL would 404). Segments without their own file inherit the root card.
 */
export function siteMetadata(title: string, description: string, path: string): Metadata {
  const origin = controlPlaneOrigin();
  const canonical = `${origin}${path}`;
  const pageTitle = `${title} | ${SERVICE_NAME}`;
  const google = resolveGoogleSiteVerification();
  return {
    title,
    description,
    ...(google === undefined ? {} : { verification: { google } }),
    alternates: {
      canonical,
      languages: { 'id-ID': canonical },
    },
    robots: indexableRobots(),
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url: canonical,
      siteName: SERVICE_NAME,
      title: pageTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
    },
  };
}
