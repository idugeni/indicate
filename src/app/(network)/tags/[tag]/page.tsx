import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 60;

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

/** Cangkang statis untuk validasi instant: params hanya dibaca di dalam Suspense. */
export default function TagPage({ params }: Props) {
  return (
    <Suspense fallback={<RootLoading />}>
      <TagContent params={params} />
    </Suspense>
  );
}

async function TagContent({ params }: Pick<Props, 'params'>) {
  const { tag } = await params;
  const clean = decodeURIComponent(tag).trim().toLowerCase();
  if (clean === '') notFound();
  const site = await resolveNetworkSite({ tag: clean }, `/tags/${clean}`);
  return <ChannelPage site={site} kicker="Topik" title={`#${clean}`} path={`/tags/${clean}`} />;
}
