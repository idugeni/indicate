import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { PurpleEditorialContainer } from '@/modules/site/components/network/templates/purple-editorial/ui/container';
import { PurpleEditorialStatusLine } from '@/modules/site/components/network/templates/purple-editorial/ui/status-line';
import { PurpleEditorialSearchForm, PurpleEditorialSearchResults } from '@/modules/site/components/network/templates/purple-editorial/pages/search-form';

export interface PurpleEditorialSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function PurpleEditorialSearch({ site, query }: PurpleEditorialSearchProps) {
  return (
    <PurpleEditorialShell site={site} path="/search">
      <PurpleEditorialContainer className="space-y-6 py-6 md:py-8">
        <PurpleEditorialStatusLine count={site.articles.length} title="Pencarian" />
        <PurpleEditorialSearchForm query={query} />
        <PurpleEditorialSearchResults articles={site.articles} query={query} />
      </PurpleEditorialContainer>
    </PurpleEditorialShell>
  );
}
