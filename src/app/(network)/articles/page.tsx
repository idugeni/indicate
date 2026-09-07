import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { ListingSkeleton } from '@/modules/site/components/network/listing-skeleton';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await searchParams;
  return networkMetadata('/articles');
}

/** Konten tenant (host + DB) streaming di belakang shell; metadata tetap dinamis per request. */
async function ArticlesContent() {
  const site = await resolveNetworkSite({}, '/articles');
  return <ListingPage site={site} title="Berita terbaru" />;
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<ListingSkeleton label="Memuat artikel" />}>
      <ArticlesContent />
    </Suspense>
  );
}
