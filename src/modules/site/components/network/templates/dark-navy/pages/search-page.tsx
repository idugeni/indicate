import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DarkNavyContainer } from '@/modules/site/components/network/templates/dark-navy/ui/container';
import { DarkNavyStatusLine } from '@/modules/site/components/network/templates/dark-navy/ui/status-line';
import { DarkNavySearchForm, DarkNavySearchResults } from '@/modules/site/components/network/templates/dark-navy/pages/search-form';

export interface DarkNavySearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function DarkNavySearch({ site, query }: DarkNavySearchProps) {
  return (
    <DarkNavyShell site={site} path="/search">
      <DarkNavyContainer className="space-y-6 py-6 md:py-8">
        <DarkNavyStatusLine count={site.articles.length} title="Pencarian" />
        <DarkNavySearchForm query={query} />
        <DarkNavySearchResults articles={site.articles} query={query} />
      </DarkNavyContainer>
    </DarkNavyShell>
  );
}
