import { Suspense } from 'react';
import type { Metadata } from 'next';
import { connection } from 'next/server';

import { ListingPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 25;

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/');
}

/**
 * Keep hostname-dependent tenant resolution behind a stable streaming boundary.
 *
 * A tenant homepage is not meaningfully prerenderable without its request host.
 * Explicitly switch this subtree to request-time rendering before resolving the
 * host. This prevents Cache Components from replaying a prerendered placeholder
 * against a different host-specific tenant tree (React resumable-slot error #488)
 * while preserving the explicit shared caches used by resolveNetworkSite.
 */
export default function TenantHomePage() {
  return (
    <Suspense fallback={null}>
      <TenantHomeContent />
    </Suspense>
  );
}

async function TenantHomeContent() {
  await connection();
  const site = await resolveNetworkSite({}, '/');
  return <ListingPage site={site} title={site.settings.name} />;
}
