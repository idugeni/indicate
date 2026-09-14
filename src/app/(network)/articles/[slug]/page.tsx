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
  return networkMetadata(`/articles/${slug}`, { articleSlug: slug });
}

/** Params + konten tenant dibaca langsung; loader global `(network)/loading.tsx` yang tampil. */
export default async function DetailPage({ params }: Props) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const site = await resolveNetworkSite({ articleSlug: slug }, `/articles/${slug}`);
  const article = site.articles[0];
  if (article === undefined) notFound();
  // Pencatatan view pindah ke CleanBlueViewBeacon (Worker → Upstash, nol
  // execution Vercel, mencakup edge HIT). Incr server dihapus agar tak dobel.
  const mates = article.categorySlug === null
    ? []
    : (await resolveNetworkSite({ categorySlug: article.categorySlug }, `/articles/${slug}`)
        .then((relatedSite) => relatedSite.articles.filter((item) => item.id !== article.id).slice(0, 4))
        .catch(() => []));
  // Fallback daftar penuh (entri cache tersendiri, ter-amortisasi): menjamin
  // related + prev/next SELALU ada meski satu kategori hanya berisi 1 artikel.
  const full = await resolveNetworkSite({}, `/articles/${slug}`)
    .then((fullSite) => fullSite.articles.filter((item) => item.id !== article.id))
    .catch(() => []);
  const related = [...mates, ...full.filter((item) => !mates.some((mate) => mate.id === item.id))].slice(0, 4);
  const older = related.filter((item) => new Date(item.publishedAt).getTime() < new Date(article.publishedAt).getTime());
  const newer = related.filter((item) => new Date(item.publishedAt).getTime() > new Date(article.publishedAt).getTime());
  // Tetangga tanggal dari daftar penuh bila seksi related tidak mencakupnya.
  const byDate = [...full].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
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
