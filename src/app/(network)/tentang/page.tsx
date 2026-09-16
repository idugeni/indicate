import type { Metadata } from 'next';
import { AboutPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/tentang');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return networkMetadata('/tentang', {}, `Tentang ${siteName}`);
}

/** Profil portal tenant dari data situsnya sendiri. */
export default async function AboutPageRoute() {
  const site = await resolveNetworkSite({}, '/tentang');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return (
    <AboutPage
      site={site}
      title={`Tentang ${siteName}`}
      description={site.settings.seoDefaultDescription ?? site.settings.description}
      path="/tentang"
    />
  );
}
