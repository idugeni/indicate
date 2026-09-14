import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CleanBlueContainer, CleanBlueStatusLine } from '@/modules/site/components/network/templates/clean-blue/shared';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/shell';
import { CleanBlueSearchForm, CleanBlueSearchResults, CleanBlueSearchSkeleton } from '@/modules/site/components/network/templates/clean-blue/search';
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
async function SearchShell({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = normalizeQuery(resolved.q);
  const site = await resolveNetworkSite({ search: query }, '/search');
  return (
    <CleanBlueShell site={site} path="/search">
      <CleanBlueContainer className="space-y-6 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title="Pencarian" />
        <CleanBlueSearchForm query={query} />
        <Suspense fallback={<CleanBlueSearchSkeleton />}>
          <CleanBlueSearchResults articles={site.articles} query={query} />
        </Suspense>
      </CleanBlueContainer>
    </CleanBlueShell>
  );
}

/** Form dan hasil adalah island terpisah: form interaktif segera, hasil menyusul via streaming. */
export default function SearchPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<CleanBlueSearchSkeleton />}>
      <SearchShell searchParams={searchParams} />
    </Suspense>
  );
}
