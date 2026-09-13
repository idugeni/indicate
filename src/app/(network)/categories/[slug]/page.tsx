import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { ListingSkeleton } from '@/modules/site/components/network/listing-skeleton';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug.trim() === '') {
    return { title: 'Not Found', robots: { index: false, follow: false } };
  }
  return networkMetadata(`/categories/${slug}`, { categorySlug: slug });
}

/** Params dibaca di dalam boundary agar shell tidak tertahan; konten tenant menyusul via streaming. */
async function CategoryContent({ params }: Pick<Props, 'params'>) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const site = await resolveNetworkSite({ categorySlug: slug }, `/categories/${slug}`);
  return <ListingPage site={site} title={`Kategori: ${site.articles[0]?.categoryName ?? slug}`} path={`/categories/${slug}`} />;
}

export default function CategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<ListingSkeleton label="Memuat kategori" />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}
