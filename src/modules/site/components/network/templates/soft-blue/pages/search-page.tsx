import type { NetworkSiteData } from '@/modules/delivery/models';
import { SoftBlueShell } from '@/modules/site/components/network/templates/soft-blue/chrome/shell';
import { SoftBlueContainer } from '@/modules/site/components/network/templates/soft-blue/ui/container';
import { SoftBlueStatusLine } from '@/modules/site/components/network/templates/soft-blue/ui/status-line';
import { SoftBlueSearchForm, SoftBlueSearchResults } from '@/modules/site/components/network/templates/soft-blue/pages/search-form';

export interface SoftBlueSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function SoftBlueSearch({ site, query }: SoftBlueSearchProps) {
  return (
    <SoftBlueShell site={site} path="/search">
      <SoftBlueContainer className="space-y-6 py-6 md:py-8">
        <SoftBlueStatusLine count={site.articles.length} title="Pencarian" />
        <SoftBlueSearchForm query={query} />
        <SoftBlueSearchResults articles={site.articles} query={query} />
      </SoftBlueContainer>
    </SoftBlueShell>
  );
}
