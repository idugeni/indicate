import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { WarmEditorialContainer } from '@/modules/site/components/network/templates/warm-editorial/ui/container';
import { WarmEditorialStatusLine } from '@/modules/site/components/network/templates/warm-editorial/ui/status-line';
import { WarmEditorialSearchForm, WarmEditorialSearchResults } from '@/modules/site/components/network/templates/warm-editorial/pages/search-form';

export interface WarmEditorialSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function WarmEditorialSearch({ site, query }: WarmEditorialSearchProps) {
  return (
    <WarmEditorialShell site={site} path="/search">
      <WarmEditorialContainer className="space-y-6 py-6 md:py-8">
        <WarmEditorialStatusLine count={site.articles.length} title="Pencarian" />
        <WarmEditorialSearchForm query={query} />
        <WarmEditorialSearchResults articles={site.articles} query={query} />
      </WarmEditorialContainer>
    </WarmEditorialShell>
  );
}
