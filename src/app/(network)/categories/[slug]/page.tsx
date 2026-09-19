import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const maxDuration = 60;

type Props = {
  readonly params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug.trim() === '') {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }
  return networkMetadata(`/categories/${slug}`, { categorySlug: slug });
}

/** Cangkang statis untuk validasi instant: params hanya dibaca di dalam Suspense. */
export default function CategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<RootLoading />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: Pick<Props, 'params'>) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const site = await resolveNetworkSite({ categorySlug: slug }, `/categories/${slug}`);
  const name = site.articles[0]?.categoryName ?? slug;
  return <ChannelPage site={site} kicker="Kanal liputan" title={name} path={`/categories/${slug}`} />;
}
