import type { Metadata } from 'next';
import { ContactPage } from '@/modules/site/components/network/network-listing';
import { interpolateLegalText } from '@/modules/site/legal-placeholders';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/kontak');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return networkMetadata('/kontak', {}, `Kontak ${siteName}`);
}

/** Tenant official channels from its own site `socialLinks`. */
export default async function ContactPageRoute() {
  const site = await resolveNetworkSite({}, '/kontak');
  const vars = { domain: site.context.normalizedHostname, siteName: site.settings.seoSiteName ?? site.settings.name };
  return (
    <ContactPage
      site={site}
      title={`Kontak ${vars.siteName}`}
      description={interpolateLegalText('Saluran resmi untuk menghubungi redaksi {siteName}.', vars)}
      path="/kontak"
    />
  );
}
