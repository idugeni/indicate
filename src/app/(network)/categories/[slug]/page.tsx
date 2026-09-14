import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { parsePageParam } from '@/modules/site/components/network/templates/listing-shared';
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

/** Params dibaca langsung; loader global `(network)/loading.tsx` yang tampil. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const site = await resolveNetworkSite({ categorySlug: slug }, `/categories/${slug}`);
  return <ListingPage site={site} title={`Kategori: ${site.articles[0]?.categoryName ?? slug}`} path={`/categories/${slug}`} page={parsePageParam((await searchParams).page)} basePath={`/categories/${slug}`} />;
}
