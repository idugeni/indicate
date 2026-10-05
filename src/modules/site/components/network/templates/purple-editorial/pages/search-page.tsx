import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
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
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <PurpleEditorialSearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <PurpleEditorialSearchResults articles={site.articles} query={query} />
      </Container>
    </PurpleEditorialShell>
  );
}
