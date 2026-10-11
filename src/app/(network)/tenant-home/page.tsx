import { Suspense } from 'react';
import type { Metadata } from 'next';

import { ListingPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 25;

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/');
}

/**
 * Keep hostname-dependent tenant resolution behind a stable streaming boundary.
 *
 * The null fallback avoids showing a global loading template on tenant domains
 * while preventing the async request-bound subtree from shifting the route's
 * initial resumable tree during hydration.
 */
export default function TenantHomePage() {
  return (
    <Suspense fallback={null}>
      <TenantHomeContent />
    </Suspense>
  );
}

async function TenantHomeContent() {
  const site = await resolveNetworkSite({}, '/');
  return <ListingPage site={site} title={site.settings.name} />;
}
