import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { normalizeSlugCandidate } from '@/modules/site/slug-allocator';
import { notFoundMetadata } from '@/modules/site/seo';

export const maxDuration = 25;

type Props = {
  readonly params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug.trim() === '') {
    return notFoundMetadata();
  }
  const clean = normalizeSlugCandidate(slug);
  return networkMetadata(`/categories/${clean}`, { categorySlug: clean });
}

/**
 * Render kanal tenant tanpa fallback pemuatan.
 *
 * @param params - Parameter slug kanal.
 * @returns Halaman kanal tenant.
 * @remarks Tanpa `Suspense` ber-fallback: tidak ada loader template maupun
 * `RootLoading` domain utama yang boleh ter-cat di segmen ini.
 */
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const clean = normalizeSlugCandidate(slug);
  const site = await resolveNetworkSite({ categorySlug: clean }, `/categories/${clean}`);
  const name = site.articles[0]?.categoryName ?? clean;
  return <ChannelPage site={site} kicker="Kanal liputan" title={name} path={`/categories/${clean}`} />;
}
