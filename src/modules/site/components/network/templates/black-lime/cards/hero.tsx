import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/black-lime/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/black-lime/ui/author-avatar';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/black-lime/lib/format';

export function BlackLimeHero({ article }: { readonly article: NetworkArticle }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;
  const words = article.title.split(' ');
  const lead = words.length > 2 ? words.slice(0, -2).join(' ') : article.title;
  const accent = words.length > 2 ? words.slice(-2).join(' ') : null;
  const location = article.publisherCity;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="min-w-0">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-[#c5f82a]">
            {article.categoryName}
            <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-[#c5f82a]" />
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-100 sm:text-5xl">
          <Link href={`/${article.slug}`} className="hover:text-[#c5f82a]">
            {lead}
            {accent === null ? null : (
              <>
                {' '}
                <span className="text-[#c5f82a]">{accent}</span>
              </>
            )}
          </Link>
        </h1>
        <p className="m-0 mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-slate-400">
          {article.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-4">
          <Link
            href={`/${article.slug}`}
            className="group inline-flex flex-none items-center gap-3 font-sans text-sm font-bold text-slate-100"
            aria-label={`Baca selengkapnya: ${article.title}`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c5f82a] text-[#0a0c07] transition-colors group-hover:bg-[#9ecb14]">
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </span>
            Baca Selengkapnya
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <AuthorAvatar name={publisherName} avatarUrl={article.publisherLogoUrl} size="md" />
            <div className="grid min-w-0 gap-1">
              <p className="m-0 truncate font-sans text-sm font-bold text-slate-100">
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
        {location === null || location === '' ? null : (
          <p className="m-0 absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-[#0a0c07]/70 px-3 py-1.5 font-sans text-xs font-semibold text-slate-100 backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-[#c5f82a]" aria-hidden="true" />
            {location}
          </p>
        )}
        <Link
          href={`/${article.slug}`}
          aria-label={`Buka: ${article.title}`}
          className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#c5f82a] text-[#0a0c07] shadow-md transition-colors hover:bg-[#9ecb14]"
        >
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
