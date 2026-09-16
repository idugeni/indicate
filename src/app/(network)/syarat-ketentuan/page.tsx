import type { Metadata } from 'next';
import { LegalPage } from '@/modules/site/components/network/network-listing';
import { TENANT_LEGAL_DOCS } from '@/modules/site/legal-documents';
import { interpolateLegalText, resolveLegalSections } from '@/modules/site/legal-placeholders';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/syarat-ketentuan');
}

/** Dokumen legal tenant: copy master bersama, domain diinterpolasi per host. */
export default async function TermsPage() {
  const site = await resolveNetworkSite({}, '/syarat-ketentuan');
  const doc = TENANT_LEGAL_DOCS.terms;
  const vars = { domain: site.context.normalizedHostname, siteName: site.settings.seoSiteName ?? site.settings.name };
  return (
    <LegalPage
      site={site}
      title={interpolateLegalText(doc.title, vars)}
      description={interpolateLegalText(doc.description, vars)}
      path="/syarat-ketentuan"
      sections={resolveLegalSections(doc.sections, vars)}
    />
  );
}
