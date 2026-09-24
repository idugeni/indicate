import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/purple-editorial/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/purple-editorial/ui/author-avatar';
import { articleImage, readingMinutes } from '@/modules/site/components/network/templates/purple-editorial/lib/format';
import { PurpleEditorialHeroActions } from '@/modules/site/components/network/templates/purple-editorial/cards/hero-actions';

export function PurpleEditorialHero({ article }: { readonly article: ArticleListItem }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="relative min-w-0">
        <Link
          href={`/${article.slug}`}
          aria-label={article.title}
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
          <p className="m-0 absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-[#0e1b33]/70 px-3 py-1.5 font-sans text-xs font-semibold text-white backdrop-blur">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {article.publisherCity}
          </p>
        )}
      </div>

      <div className="min-w-0">
        {article.categoryName === null ? null : (
          <p className="m-0">
            <span className="inline-block rounded-md bg-[var(--tpl-primary-soft,#ede9fe)] px-3 py-1 font-sans text-xs font-bold text-[var(--tpl-primary,#7c3aed)]">
              {article.categoryName}
            </span>
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-[var(--tpl-ink,#1c1440)] sm:text-4xl">
          <Link href={`/${article.slug}`} className="hover:text-[var(--tpl-primary,#7c3aed)]">
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
          <div className="flex flex-none items-center gap-2">
            <PurpleEditorialHeroActions slug={article.slug} title={article.title} />
            <Link
              href={`/${article.slug}`}
              aria-label={`Baca: ${article.title}`}
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary-soft,#ede9fe)] text-[var(--tpl-primary,#7c3aed)] transition-colors hover:bg-[var(--tpl-primary,#7c3aed)] hover:text-white"
            >
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
