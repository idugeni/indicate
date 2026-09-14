import type { Metadata } from 'next';
import { CleanBlueContainer, CleanBlueStatusLine } from '@/modules/site/components/network/templates/clean-blue/shared';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/shell';
import { CleanBlueSearchForm, CleanBlueSearchResults } from '@/modules/site/components/network/templates/clean-blue/search';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly searchParams: Promise<{ q?: string } & { [key: string]: string | string[] | undefined }>;
};

function normalizeQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? '').slice(0, 120);
  return (value ?? '').slice(0, 120);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolved = await searchParams;
  return networkMetadata('/search', { search: normalizeQuery(resolved.q) });
}

/** Single-template: seluruh domain memakai Clean Blue Editorial. */
export default async function SearchPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = normalizeQuery(resolved.q);
  const site = await resolveNetworkSite({ search: query }, '/search');
  return (
    <CleanBlueShell site={site} path="/search">
      <CleanBlueContainer className="space-y-6 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title="Pencarian" />
        <CleanBlueSearchForm query={query} />
        <CleanBlueSearchResults articles={site.articles} query={query} />
      </CleanBlueContainer>
    </CleanBlueShell>
  );
}
