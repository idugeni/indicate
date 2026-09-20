import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/orange-modern/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/orange-modern/ui/author-avatar';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/orange-modern/lib/format';

export function OrangeModernHero({ article }: { readonly article: ArticleListItem }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;
  const location = article.publisherCity;

  return (
    <section className="relative grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="relative min-w-0">
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
        {article.categoryName === null ? null : (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--tpl-primary,#ea580c)] px-3 py-1 font-sans text-xs font-bold text-white shadow-md">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {article.categoryName}
          </span>
        )}
        {location === null || location === '' ? null : (
          <p className="m-0 absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-sans text-xs font-semibold text-slate-900 backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-[var(--tpl-primary,#ea580c)]" aria-hidden="true" />
            {location}
          </p>
        )}
      </div>

      <div className="min-w-0">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-[var(--tpl-primary,#ea580c)]">
            <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-[var(--tpl-primary,#ea580c)]" />
            {article.categoryName}
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
          <Link href={`/${article.slug}`} className="hover:text-[var(--tpl-primary,#ea580c)]">
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
          <Link
            href={`/${article.slug}`}
            aria-label={`Baca: ${article.title}`}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary,#ea580c)] text-white shadow-sm transition-colors hover:bg-[var(--tpl-primary-dark,#c2410c)]"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>

    </section>
  );
}
