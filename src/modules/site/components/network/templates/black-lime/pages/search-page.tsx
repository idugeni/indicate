import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { StatusLine } from '@/modules/site/components/network/ui/status-line';
import { BlackLimeSearchForm, BlackLimeSearchResults } from '@/modules/site/components/network/templates/black-lime/pages/search-form';

export interface BlackLimeSearchProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Halaman pencarian tenant: hasil dari korpus situs aktif, tanpa indeks global.
 */
export function BlackLimeSearch({ site, query }: BlackLimeSearchProps) {
  return (
    <BlackLimeShell site={site} path="/search">
      <Container className="space-y-6 py-6 md:py-8">
        <StatusLine count={site.articles.length} title="Pencarian" />
        <BlackLimeSearchForm query={query} />
        <BlackLimeSearchResults articles={site.articles} query={query} />
      </Container>
    </BlackLimeShell>
  );
}
