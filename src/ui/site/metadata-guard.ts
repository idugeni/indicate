import 'server-only';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { getPublicConfig } from '@/core/config/public-config';
import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import { deliveryComposition } from '@/modules/delivery';
import { indexableRobots } from '@/modules/site/seo';
import { SERVICE_NAME } from '@/ui/site/marketing-content';

/** Defense-in-depth: repeats the proxy's tenant-host refusal at the page so a routing change can't expose service pages. */
export async function requireDashboardSurface(): Promise<void> {
  const { resolver } = await deliveryComposition();
  const classification = await resolver.classify((await headers()).get('host'));
  if (classification.kind !== 'control' || classification.surface !== 'dashboard') notFound();
}

/** Docs-surface guard for `docs.indicate.web.id`: same shape as the dashboard guard. */
export async function requireDocsSurface(): Promise<void> {
  const { resolver } = await deliveryComposition();
  const classification = await resolver.classify((await headers()).get('host'));
  if (classification.kind !== 'control' || classification.surface !== 'docs') notFound();
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

export function siteMetadata(title: string, description: string, path: string): Metadata {
  const origin = controlPlaneOrigin();
  const canonical = `${origin}${path}`;
  const pageTitle = `${title} | ${SERVICE_NAME}`;
  return {
    title,
    description,
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
      images: [
        {
          url: `${origin}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: pageTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [`${origin}/opengraph-image`],
    },
  };
}
