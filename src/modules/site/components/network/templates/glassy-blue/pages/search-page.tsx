import { AdSlot } from '@/modules/ads/ad-slot';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { GlassyBlueSearchForm, GlassyBlueSearchResults } from '@/modules/site/components/network/templates/glassy-blue/pages/search-form';

export interface GlassyBlueSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function GlassyBlueSearch({ site, query }: GlassyBlueSearchProps) {
  return (
    <GlassyBlueShell site={site} path="/search">
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <GlassyBlueSearchForm query={query} />
        {site.articles.length === 0 ? null : <AdSlot site={site} slot="in-feed" />}
        <GlassyBlueSearchResults articles={site.articles} query={query} />
      </Container>
    </GlassyBlueShell>
  );
}
