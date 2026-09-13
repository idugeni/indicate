import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { ListingSkeleton } from '@/modules/site/components/network/listing-skeleton';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly params: Promise<{ tag: string }>;
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const clean = decodeURIComponent(tag).trim().toLowerCase();
  if (clean === '') {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }
  return networkMetadata(`/tags/${clean}`, { tag: clean });
}

/** Params dibaca di dalam boundary agar shell tidak tertahan; konten tenant menyusul via streaming. */
async function TagContent({ params }: Pick<Props, 'params'>) {
  const { tag } = await params;
  const clean = decodeURIComponent(tag).trim().toLowerCase();
  if (clean === '') notFound();
  const site = await resolveNetworkSite({ tag: clean }, `/tags/${clean}`);
  return <ListingPage site={site} title={`Topik: #${clean}`} path={`/tags/${clean}`} />;
}

export default function TagPage({ params }: Props) {
  return (
    <Suspense fallback={<ListingSkeleton label="Memuat topik" />}>
      <TagContent params={params} />
    </Suspense>
  );
}
