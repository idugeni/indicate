import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';
import { notFoundMetadata } from '@/modules/site/seo';

export const maxDuration = 25;

type Props = {
  readonly params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const raw = decodeURIComponent(tag);
  if (raw.trim() === '') {
    return notFoundMetadata();
  }
  const clean = normalizeSlugCandidate(raw).slice(0, TAG_MAX_LENGTH);
  return networkMetadata(`/tags/${clean}`, { tag: clean });
}

/**
 * Render topik tenant tanpa fallback pemuatan.
 *
 * @param params - Parameter tag topik.
 * @returns Halaman topik tenant.
 * @remarks Tanpa `Suspense` ber-fallback: tidak ada loader template maupun
 * `RootLoading` domain utama yang boleh ter-cat di segmen ini.
 */
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const raw = decodeURIComponent(tag);
  if (raw.trim() === '') notFound();
  const clean = normalizeSlugCandidate(raw).slice(0, TAG_MAX_LENGTH);
  const site = await resolveNetworkSite({ tag: clean }, `/tags/${clean}`);
  return <ChannelPage site={site} kicker="Topik" title={`#${clean}`} path={`/tags/${clean}`} />;
}
