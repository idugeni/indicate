import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticlePage } from '@/modules/site/components/network/network-listing';
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
  return networkMetadata(`/${slug}`, { articleSlug: slug });
}

/** Params + konten tenant dibaca langsung; loader global `(network)/loading.tsx` yang tampil. */
export default async function DetailPage({ params }: Props) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const normalized = slug.trim().toLowerCase();
  const site = await resolveNetworkSite({}, `/${slug}`);
  const article = site.articles.find((item) => item.slug === normalized);
  if (article === undefined) notFound();
  const rest = site.articles.filter((item) => item.id !== article.id);
  const mates = article.categorySlug === null
    ? []
    : rest.filter((item) => item.categorySlug === article.categorySlug).slice(0, 4);
  const related = [...mates, ...rest.filter((item) => !mates.some((mate) => mate.id === item.id))].slice(0, 4);
  const older = related.filter((item) => new Date(item.publishedAt).getTime() < new Date(article.publishedAt).getTime());
  const newer = related.filter((item) => new Date(item.publishedAt).getTime() > new Date(article.publishedAt).getTime());
  // Tetangga tanggal dari daftar penuh bila seksi related tidak mencakupnya.
  const byDate = [...rest].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  const fallbackOlder = byDate.find((item) => new Date(item.publishedAt).getTime() < new Date(article.publishedAt).getTime()) ?? null;
  const fallbackNewer = [...byDate].reverse().find((item) => new Date(item.publishedAt).getTime() > new Date(article.publishedAt).getTime()) ?? null;
  return (
    <ArticlePage
      site={site}
      article={article}
      related={related}
      newer={newer.length > 0 ? newer[newer.length - 1]! : fallbackNewer}
      older={older.length > 0 ? older[0]! : fallbackOlder}
    />
  );
}
