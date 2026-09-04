import type { Metadata } from 'next';
import { ListingPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

export const dynamic = 'force-dynamic';

type Props = {
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await searchParams;
  return networkMetadata('/articles');
}

export default async function ArticlesPage() {
  const site = await resolveNetworkSite({}, '/articles');
  return <ListingPage site={site} title="Berita terbaru" />;
}
