import type { Metadata } from 'next';
import { AboutPage } from '@/modules/site/components/network/network-listing';
import { aboutDescription, aboutTitle } from '@/modules/site/about-profile';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/tentang');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return networkMetadata(
    '/tentang',
    {},
    aboutTitle(siteName, site.regionName),
    aboutDescription(siteName, site.settings.seoDefaultDescription ?? site.settings.description, site.regionName),
  );
}

/** Profil portal tenant dari data situsnya sendiri. */
export default async function AboutPageRoute() {
  const site = await resolveNetworkSite({}, '/tentang');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return (
    <AboutPage
      site={site}
      title={aboutTitle(siteName, site.regionName)}
      description={aboutDescription(
        siteName,
        site.settings.seoDefaultDescription ?? site.settings.description,
        site.regionName,
      )}
      path="/tentang"
    />
  );
}
