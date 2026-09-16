import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueContainer } from '@/modules/site/components/network/templates/clean-blue/ui/container';
import { CleanBlueStatusLine } from '@/modules/site/components/network/templates/clean-blue/ui/status-line';
import { CleanBlueSearchForm, CleanBlueSearchResults } from '@/modules/site/components/network/templates/clean-blue/pages/search-form';

export interface CleanBlueSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function CleanBlueSearch({ site, query }: CleanBlueSearchProps) {
  return (
    <CleanBlueShell site={site} path="/search">
      <CleanBlueContainer className="space-y-6 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title="Pencarian" />
        <CleanBlueSearchForm query={query} />
        <CleanBlueSearchResults articles={site.articles} query={query} />
      </CleanBlueContainer>
    </CleanBlueShell>
  );
}
