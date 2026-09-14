import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticlePage } from '@/modules/site/components/network/network-listing';
import { normalizeTemplateId } from '@/modules/site/components/network/templates/listing-shared';
import { CleanBlueLoader } from '@/modules/site/components/network/templates/clean-blue/loader';
import { ListingSkeleton } from '@/modules/site/components/network/listing-skeleton';
import { networkMetadata, resolveNetworkSite, trackArticleView } from '@/modules/delivery/network-runtime';

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

/** Params + konten tenant dibaca di dalam boundary agar shell tidak tertahan. */
async function ArticleContent({ params }: Pick<Props, 'params'>) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const site = await resolveNetworkSite({ articleSlug: slug }, `/articles/${slug}`);
  const article = site.articles[0];
  if (article === undefined) notFound();
  trackArticleView({ organizationId: site.context.organizationId, siteId: site.context.siteId, articleSiteId: article.articleSiteId });
  const related = article.categorySlug === null
    ? []
    : (await resolveNetworkSite({ categorySlug: article.categorySlug }, `/articles/${slug}`)
        .then((relatedSite) => relatedSite.articles.filter((item) => item.id !== article.id).slice(0, 5))
        .catch(() => []));
  const older = related.filter((item) => new Date(item.publishedAt).getTime() < new Date(article.publishedAt).getTime());
  const newer = related.filter((item) => new Date(item.publishedAt).getTime() > new Date(article.publishedAt).getTime());
  return (
    <ArticlePage
      site={site}
      article={article}
      related={related.slice(0, 4)}
      newer={newer.length > 0 ? newer[newer.length - 1]! : null}
      older={older.length > 0 ? older[0]! : null}
    />
  );
}

export default function DetailPage({ params }: Props) {
  return (
    <Suspense fallback={<CleanBlueLoader label="Memuat artikel" />}>
      <ArticleShell params={params} />
    </Suspense>
  );
}

/** Shell sadar-template: memilih loader sesuai template sebelum konten streaming. */
async function ArticleShell({ params }: Pick<Props, 'params'>) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  let useCleanBlue = false;
  try {
    const site = await resolveNetworkSite({ articleSlug: slug }, `/articles/${slug}`);
    useCleanBlue = normalizeTemplateId(site.settings.colors.templateId) === 'clean-blue';
  } catch {
    useCleanBlue = false;
  }
  if (useCleanBlue) {
    return <ArticleContent params={params} />;
  }
  return (
    <Suspense fallback={<ListingSkeleton label="Memuat artikel" />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}
