import type { Metadata } from 'next';

import { ListingPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 25;

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/');
}

/**
 * Render portal tenant tanpa fallback pemuatan.
 *
 * @returns Halaman daftar tenant.
 * @remarks Tanpa `Suspense` ber-fallback: tidak ada loader template maupun
 * `RootLoading` domain utama yang boleh ter-cat di segmen ini. Resolusi situs
 * tetap di dalam render agar 404 milik halaman.
 */
export default async function TenantHomePage() {
  const site = await resolveNetworkSite({}, '/');
  return <ListingPage site={site} title={site.settings.name} />;
}
