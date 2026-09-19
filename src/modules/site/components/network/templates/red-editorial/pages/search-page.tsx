import type { NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { RedEditorialContainer } from '@/modules/site/components/network/templates/red-editorial/ui/container';
import { RedEditorialStatusLine } from '@/modules/site/components/network/templates/red-editorial/ui/status-line';
import { RedEditorialSearchForm, RedEditorialSearchResults } from '@/modules/site/components/network/templates/red-editorial/pages/search-form';

export interface RedEditorialSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function RedEditorialSearch({ site, query }: RedEditorialSearchProps) {
  return (
    <RedEditorialShell site={site} path="/search">
      <RedEditorialContainer className="space-y-6 py-6 md:py-8">
        <RedEditorialStatusLine count={site.articles.length} title="Pencarian" />
        <RedEditorialSearchForm query={query} />
        <RedEditorialSearchResults articles={site.articles} query={query} />
      </RedEditorialContainer>
    </RedEditorialShell>
  );
}
