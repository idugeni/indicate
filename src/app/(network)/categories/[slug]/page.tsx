import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

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

/** Satu sampel agar validasi prerender lolos; rute ini dinamis per-host per request. */
export function generateStaticParams(): { slug: string }[] {
  return [{ slug: '__missing__' }];
}

/** Params dibaca langsung; loader global `(network)/loading.tsx` yang tampil. */
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const site = await resolveNetworkSite({ categorySlug: slug }, `/categories/${slug}`);
  const name = site.articles[0]?.categoryName ?? slug;
  return <ChannelPage site={site} kicker="Kanal liputan" title={name} path={`/categories/${slug}`} />;
}
