import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
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
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <CleanBlueSearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <CleanBlueSearchResults articles={site.articles} query={query} />
      </Container>
    </CleanBlueShell>
  );
}
