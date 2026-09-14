import type { Metadata } from 'next';
import { CleanBlueArchive } from '@/modules/site/components/network/templates/clean-blue/archive';
import { parsePageParam } from '@/modules/site/components/network/templates/listing-shared';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  await searchParams;
  return networkMetadata('/articles');
}

/** Indeks /articles: daftar vertikal + pagination (beda dari homepage hero). */
export default async function ArticlesPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const site = await resolveNetworkSite({}, '/articles');
  return (
    <CleanBlueArchive
      site={site}
      title="Berita terbaru"
      description={`Indeks seluruh artikel ${site.settings.name}`}
      path="/articles"
      page={parsePageParam(resolved.page)}
      basePath="/articles"
    />
  );
}
