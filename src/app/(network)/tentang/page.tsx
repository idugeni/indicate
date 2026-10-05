import type { Metadata } from 'next';
import { AboutPage } from '@/modules/site/components/network/network-listing';
import { NetworkAttribution } from '@/modules/site/components/network/ui/network-attribution';
import { aboutDescription, aboutTitle, networkAttribution } from '@/modules/site/about-profile';
import { getControlHosts } from '@/core/config/edge-hosts';
import { networkMetadataForSite, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/tentang');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return networkMetadataForSite(
    site,
    '/tentang',
    {},
    aboutTitle(siteName, site.regionName),
    aboutDescription(siteName, site.settings.seoDefaultDescription ?? site.settings.description, site.regionName),
  );
}

/** Tenant portal profile from its own site data. */
export default async function AboutPageRoute() {
  const site = await resolveNetworkSite({}, '/tentang');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return (
    <>
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
      <NetworkAttribution attribution={networkAttribution(site, getControlHosts().dashboard)} />
    </>
  );
}
