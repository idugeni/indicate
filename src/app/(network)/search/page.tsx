import { Suspense } from 'react';
import type { Metadata } from 'next';
import Form from 'next/form';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { Section } from '@/modules/site/components/layout/content';
import { Skeleton } from '@/components/ui/skeleton';
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

function SearchFormFallback() {
  // Sengaja <form> polos (bukan next/form): tetap berfungsi sebelum hidrasi.
  return (
    <form className="public-search" action="/search" role="search" aria-busy="true">
      <label htmlFor="public-search">Cari berita</label>
      <div>
        <input id="public-search" name="q" defaultValue="" maxLength={120} autoComplete="off" />
        <button type="submit">Cari</button>
      </div>
    </form>
  );
}

async function SearchForm({ searchParams }: Props) {
  const resolved = await searchParams;
  const q = normalizeQuery(resolved.q);
  return (
    <Form className="public-search" action="/search" role="search">
      <label htmlFor="public-search">Cari berita</label>
      <div>
        <input id="public-search" name="q" defaultValue={q} maxLength={120} autoComplete="off" />
        <button type="submit">Cari</button>
      </div>
    </Form>
  );
}

function SearchResultsSkeleton() {
  return (
    <Section aria-busy="true" aria-label="Memuat hasil pencarian">
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-hairline bg-bg-raised p-4">
              <Skeleton className="aspect-video w-full bg-bg-raised-2" />
              <Skeleton className="mt-4 h-4 w-3/4 bg-bg-raised-2" />
              <Skeleton className="mt-2 h-3 w-1/2 bg-bg-raised-2" />
            </div>
          ))}
        </div>
        <Skeleton className="h-40 w-full rounded-lg border border-hairline bg-bg-raised" aria-hidden="true" />
      </div>
    </Section>
  );
}

async function SearchResults({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = normalizeQuery(resolved.q);
  const site = await resolveNetworkSite({ search: query }, '/search');
  return <ListingPage site={site} title={query === '' ? 'Pencarian' : `Hasil untuk “${query}”`} path="/search" indexable={false} />;
}

/** Form dan hasil adalah island terpisah: form interaktif segera, hasil menyusul via streaming. */
export default function SearchPage({ searchParams }: Props) {
  return (
    <>
      <Suspense fallback={<SearchFormFallback />}>
        <SearchForm searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
