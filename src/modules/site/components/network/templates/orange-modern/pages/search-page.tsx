import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { OrangeModernContainer } from '@/modules/site/components/network/templates/orange-modern/ui/container';
import { OrangeModernStatusLine } from '@/modules/site/components/network/templates/orange-modern/ui/status-line';
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
      <OrangeModernContainer className="space-y-6 py-6 md:py-8">
        <OrangeModernStatusLine count={site.articles.length} title="Pencarian" />
        <OrangeModernSearchForm query={query} />
        <OrangeModernSearchResults articles={site.articles} query={query} />
      </OrangeModernContainer>
    </OrangeModernShell>
  );
}
