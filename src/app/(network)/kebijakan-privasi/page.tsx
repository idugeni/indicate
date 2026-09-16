import type { Metadata } from 'next';
import { LegalPage } from '@/modules/site/components/network/network-listing';
import { TENANT_LEGAL_DOCS } from '@/modules/site/legal-documents';
import { interpolateLegalText, resolveLegalSections } from '@/modules/site/legal-placeholders';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/kebijakan-privasi');
}

/** Dokumen legal tenant: copy master bersama, domain diinterpolasi per host. */
export default async function PrivacyPage() {
  const site = await resolveNetworkSite({}, '/kebijakan-privasi');
  const doc = TENANT_LEGAL_DOCS.privacy;
  const vars = { domain: site.context.normalizedHostname, siteName: site.settings.seoSiteName ?? site.settings.name };
  return (
    <LegalPage
      site={site}
      title={interpolateLegalText(doc.title, vars)}
      description={interpolateLegalText(doc.description, vars)}
      path="/kebijakan-privasi"
      sections={resolveLegalSections(doc.sections, vars)}
    />
  );
}
