import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const clean = decodeURIComponent(tag).trim().toLowerCase();
  if (clean === '') {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }
  return networkMetadata(`/tags/${clean}`, { tag: clean });
}

/** Params dibaca langsung; loader global `(network)/loading.tsx` yang tampil. */
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const clean = decodeURIComponent(tag).trim().toLowerCase();
  if (clean === '') notFound();
  const site = await resolveNetworkSite({ tag: clean }, `/tags/${clean}`);
  return <ListingPage site={site} title={`Topik: #${clean}`} path={`/tags/${clean}`} />;
}
