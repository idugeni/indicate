import type { NetworkSiteData } from '@/modules/delivery/models';
import { GlassyBlueShell } from '@/modules/site/components/network/templates/glassy-blue/chrome/shell';
import { GlassyBlueContainer } from '@/modules/site/components/network/templates/glassy-blue/ui/container';
import { GlassyBlueStatusLine } from '@/modules/site/components/network/templates/glassy-blue/ui/status-line';
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
      <GlassyBlueContainer className="space-y-6 py-6 md:py-8">
        <GlassyBlueStatusLine count={site.articles.length} title="Pencarian" />
        <GlassyBlueSearchForm query={query} />
        <GlassyBlueSearchResults articles={site.articles} query={query} />
      </GlassyBlueContainer>
    </GlassyBlueShell>
  );
}
