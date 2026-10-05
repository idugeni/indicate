import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/clean-blue/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/ui/author-avatar';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { articleImage, readingMinutes } from '@/modules/site/components/network/ui/format';
import { CleanBlueHeroActions } from '@/modules/site/components/network/templates/clean-blue/cards/hero-actions';

export function CleanBlueHero({ article }: { readonly article: ArticleListItem }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="relative min-w-0">
        <Link
          href={article.href}
          aria-label={article.title}
          aria-hidden="true"
          tabIndex={-1}
          className="relative block overflow-hidden rounded-2xl shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <Image
            unoptimized
            src={src}
            alt=""
            priority
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 750}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </Link>
        {article.publisherCity === null || article.publisherCity === '' ? null : (
          <p className="m-0 absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-sans text-xs font-semibold text-slate-900 backdrop-blur">
            <MapPin className="h-3.5 w-3.5 flex-none text-[#1a5fd0]" aria-hidden="true" />
            <span className="min-w-0 truncate">{article.publisherCity}</span>
          </p>
        )}
      </div>

      <div className="min-w-0">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-[var(--tpl-primary,#1a5fd0)]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[var(--tpl-primary,#1a5fd0)]" />
            {article.categoryName}
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
          <Link href={article.href} className="hover:text-[var(--tpl-primary,#1a5fd0)]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-slate-600">
          {article.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <div className="flex min-w-0 items-center gap-3">
            <AuthorAvatar skin={CLEAN_BLUE.authorAvatar} name={publisherName} avatarUrl={article.publisherLogoUrl} size="md" />
            <div className="grid min-w-0 gap-1">
              <p className="m-0 truncate font-sans text-sm font-bold text-slate-900">
                {publisherName}
              </p>
              <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} articleId={article.id} href={article.href} dateVariant="long" />
            </div>
          </div>
          <CleanBlueHeroActions slug={article.slug} title={article.title} href={article.href} />
        </div>
      </div>
    </section>
  );
}
