import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { OrangeModernSearchForm, OrangeModernSearchResults } from '@/modules/site/components/network/templates/orange-modern/pages/search-form';

export interface OrangeModernSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function OrangeModernSearch({ site, query }: OrangeModernSearchProps) {
  return (
    <OrangeModernShell site={site} path="/search">
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <OrangeModernSearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <OrangeModernSearchResults articles={site.articles} query={query} />
      </Container>
    </OrangeModernShell>
  );
}
