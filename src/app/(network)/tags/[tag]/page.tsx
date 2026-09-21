import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';

export const maxDuration = 25;

type Props = {
  readonly params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const raw = decodeURIComponent(tag);
  if (raw.trim() === '') {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }
  const clean = normalizeSlugCandidate(raw).slice(0, TAG_MAX_LENGTH);
  return networkMetadata(`/tags/${clean}`, { tag: clean });
}

/** Static shell for instant validation: params are only read inside Suspense. */
export default function TagPage({ params }: Props) {
  return (
    <Suspense fallback={<RootLoading />}>
      <TagContent params={params} />
    </Suspense>
  );
}

async function TagContent({ params }: Pick<Props, 'params'>) {
  const { tag } = await params;
  const raw = decodeURIComponent(tag);
  if (raw.trim() === '') notFound();
  const clean = normalizeSlugCandidate(raw).slice(0, TAG_MAX_LENGTH);
  const site = await resolveNetworkSite({ tag: clean }, `/tags/${clean}`);
  return <ChannelPage site={site} kicker="Topik" title={`#${clean}`} path={`/tags/${clean}`} />;
}
