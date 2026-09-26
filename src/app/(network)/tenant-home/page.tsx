import { Suspense } from 'react';
import type { Metadata } from 'next';

import { ListingPage } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 25;

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/');
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
