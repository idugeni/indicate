import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
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
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <DarkNavySearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <DarkNavySearchResults articles={site.articles} query={query} />
      </Container>
    </DarkNavyShell>
  );
}
