import Image from 'next/image';
import Link from 'next/link';

import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/soft-blue/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/soft-blue/ui/author-avatar';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/soft-blue/lib/format';
import { SoftBlueHeroActions } from '@/modules/site/components/network/templates/soft-blue/cards/hero-actions';

export function SoftBlueHero({ article }: { readonly article: ArticleListItem }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;

  return (
    <section aria-label="Sorotan utama" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
      <Link
        href={`/${article.slug}`}
        aria-label={article.title}
        className="relative block overflow-hidden rounded-2xl shadow-sm transition-shadow duration-200 hover:shadow-md"
      >
        <Image
          unoptimized={!isLocalImageSrc(src)}
          src={src}
          alt=""
          priority
          className="aspect-[16/10] w-full object-cover"
          width={article.imageWidth ?? 1200}
          height={article.imageHeight ?? 750}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </Link>

      <div className="min-w-0">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-[#2563eb]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#2563eb]" />
            {article.categoryName}
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-[#0e1b33] sm:text-4xl">
          <Link href={`/${article.slug}`} className="hover:text-[#2563eb]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-slate-600">
          {article.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <div className="flex min-w-0 items-center gap-3">
            <AuthorAvatar name={publisherName} avatarUrl={article.publisherLogoUrl} size="md" />
            <div className="grid min-w-0 gap-1">
              <p className="m-0 truncate font-sans text-sm font-bold text-slate-900">
                {publisherName}
              </p>
              <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
            </div>
          </div>
          <SoftBlueHeroActions slug={article.slug} title={article.title} />
        </div>
      </div>
      </div>
    </section>
  );
}
