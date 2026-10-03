import type { Metadata } from 'next';

import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { getSiteCategoryIndex } from '@/modules/site/components/network/server/site-nav';
import { IndexPage } from '@/modules/site/components/network/network-index';

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/indeks');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return networkMetadata(
    '/indeks',
    {},
    `Indeks Kanal - ${siteName}`,
    `Daftar A–Z ${siteName}: semua kanal liputan dalam satu halaman.`,
  );
}

/**
 * Render indeks kanal tenant tanpa fallback pemuatan.
 *
 * @returns Halaman indeks kanal tenant.
 * @remarks Tanpa `Suspense` ber-fallback: tidak ada loader template maupun
 * `RootLoading` domain utama yang boleh ter-cat di segmen ini.
 */
export default async function IndexPageRoute() {
  const site = await resolveNetworkSite({}, '/indeks');
  const categories = await getSiteCategoryIndex(site);
  return <IndexPage site={site} categories={categories} path="/indeks" />;
}
