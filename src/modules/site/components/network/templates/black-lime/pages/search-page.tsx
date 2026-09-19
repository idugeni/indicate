import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { BlackLimeContainer } from '@/modules/site/components/network/templates/black-lime/ui/container';
import { BlackLimeStatusLine } from '@/modules/site/components/network/templates/black-lime/ui/status-line';
import { BlackLimeSearchForm, BlackLimeSearchResults } from '@/modules/site/components/network/templates/black-lime/pages/search-form';

export interface BlackLimeSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function BlackLimeSearch({ site, query }: BlackLimeSearchProps) {
  return (
    <BlackLimeShell site={site} path="/search">
      <BlackLimeContainer className="space-y-6 py-6 md:py-8">
        <BlackLimeStatusLine count={site.articles.length} title="Pencarian" />
        <BlackLimeSearchForm query={query} />
        <BlackLimeSearchResults articles={site.articles} query={query} />
      </BlackLimeContainer>
    </BlackLimeShell>
  );
}
