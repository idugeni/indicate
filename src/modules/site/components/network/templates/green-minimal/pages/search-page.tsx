import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { GreenMinimalContainer } from '@/modules/site/components/network/templates/green-minimal/ui/container';
import { GreenMinimalStatusLine } from '@/modules/site/components/network/templates/green-minimal/ui/status-line';
import { GreenMinimalSearchForm, GreenMinimalSearchResults } from '@/modules/site/components/network/templates/green-minimal/pages/search-form';

export interface GreenMinimalSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function GreenMinimalSearch({ site, query }: GreenMinimalSearchProps) {
  return (
    <GreenMinimalShell site={site} path="/search">
      <GreenMinimalContainer className="space-y-6 py-6 md:py-8">
        <GreenMinimalStatusLine count={site.articles.length} title="Pencarian" />
        <GreenMinimalSearchForm query={query} />
        <GreenMinimalSearchResults articles={site.articles} query={query} />
      </GreenMinimalContainer>
    </GreenMinimalShell>
  );
}
