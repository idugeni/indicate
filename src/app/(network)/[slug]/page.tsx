import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticlePage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { isNetworkArticle } from '@/modules/delivery/models';

export const maxDuration = 25;

type Props = {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug.trim() === '') {
    notFound();
  }
  return networkMetadata(`/${slug}`, { articleSlug: slug });
}

/**
 * Render artikel tenant tanpa fallback pemuatan.
 *
 * @param params - Parameter rute artikel.
 * @returns Halaman artikel tenant.
 * @remarks Tanpa `Suspense` ber-fallback: tidak ada loader template maupun
 * `RootLoading` domain utama yang boleh ter-cat di segmen ini. Validasi params
 * tetap di dalam render supaya 404 milik halaman.
 */
export default async function DetailPage({ params }: Props) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const normalized = slug.trim().toLowerCase();
  const site = await resolveNetworkSite({ articleSlug: normalized }, `/${slug}`);
  const article = site.articles.find((item) => item.slug === normalized);
  if (article === undefined || !isNetworkArticle(article)) notFound();
  const neighborSite = await resolveNetworkSite({}, '/');
  const rest = neighborSite.articles.filter((item) => item.id !== article.id);
  const mates = article.categorySlug === null
    ? []
    : rest.filter((item) => item.categorySlug === article.categorySlug).slice(0, 4);
  const related = [...mates, ...rest.filter((item) => !mates.some((mate) => mate.id === item.id))].slice(0, 4);
  const older = related.filter((item) => new Date(item.publishedAt).getTime() < new Date(article.publishedAt).getTime());
  const newer = related.filter((item) => new Date(item.publishedAt).getTime() > new Date(article.publishedAt).getTime());
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
