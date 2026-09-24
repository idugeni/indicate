import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/green-minimal/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/green-minimal/ui/author-avatar';
import { articleImage, readingMinutes } from '@/modules/site/components/network/templates/green-minimal/lib/format';

export function GreenMinimalHero({ article }: { readonly article: ArticleListItem }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;
  const location = article.publisherCity;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="min-w-0">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-[var(--tpl-primary,#1d7a38)]">
            {article.categoryName}
            <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-[var(--tpl-primary,#1d7a38)]" />
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-[var(--tpl-ink,#10231a)] sm:text-4xl">
          <Link href={`/${article.slug}`} className="hover:text-[var(--tpl-primary,#1d7a38)]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-[var(--tpl-muted,#4d6356)]">
          {article.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-4">
          <Link
            href={`/${article.slug}`}
            className="group inline-flex flex-none items-center gap-2 rounded-full bg-[var(--tpl-primary,#1d7a38)] py-2 pl-5 pr-2 font-sans text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--tpl-primary-dark,#145c2a)]"
            aria-label={`Baca selengkapnya: ${article.title}`}
          >
            Baca Selengkapnya
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <AuthorAvatar name={publisherName} avatarUrl={article.publisherLogoUrl} size="md" />
            <div className="grid min-w-0 gap-1">
              <p className="m-0 truncate font-sans text-sm font-bold text-[var(--tpl-ink,#10231a)]">
                {publisherName}
              </p>
              <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
            </div>
          </div>
        </div>
      </div>

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
        {location === null || location === '' ? null : (
          <p className="m-0 absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-sans text-xs font-semibold text-[var(--tpl-ink,#10231a)] backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-[var(--tpl-primary,#1d7a38)]" aria-hidden="true" />
            {location}
          </p>
        )}
      </div>
    </section>
  );
}
