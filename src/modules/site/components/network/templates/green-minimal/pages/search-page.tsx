import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GreenMinimalShell } from '@/modules/site/components/network/templates/green-minimal/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
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
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <GreenMinimalSearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <GreenMinimalSearchResults articles={site.articles} query={query} />
      </Container>
    </GreenMinimalShell>
  );
}
