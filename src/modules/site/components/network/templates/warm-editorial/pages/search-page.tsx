import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
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
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <WarmEditorialSearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <WarmEditorialSearchResults articles={site.articles} query={query} />
      </Container>
    </WarmEditorialShell>
  );
}
