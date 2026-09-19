import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/warm-editorial/ui/article-meta';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/warm-editorial/lib/format';
import { WarmEditorialHeroActions } from '@/modules/site/components/network/templates/warm-editorial/cards/hero-actions';

export function WarmEditorialHero({ article }: { readonly article: NetworkArticle }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const location = article.publisherCity;

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="min-w-0 order-1">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2.5 font-sans text-xs font-bold uppercase tracking-[0.18em] text-[#b4532a]">
            {article.categoryName}
            <span aria-hidden="true" className="h-px w-10 bg-[#b4532a]/60" />
          </p>
        )}
        <h1 className="m-0 mt-3 font-serif text-4xl font-bold leading-[1.12] tracking-tight text-[#231208] sm:text-5xl">
          <Link href={`/${article.slug}`} className="hover:text-[#b4532a]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-4 max-w-xl font-sans text-[15px] leading-relaxed text-[#6f5a4c]">
          {article.description}
        </p>
        <div className="mt-4">
          <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${article.slug}`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#b4532a] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#8a3c1d]"
          >
            Baca Selengkapnya
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <WarmEditorialHeroActions slug={article.slug} title={article.title} />
        </div>
      </div>

      <Link
        href={`/${article.slug}`}
        aria-label={article.title}
        className="relative order-2 block overflow-hidden rounded-2xl shadow-sm transition-shadow duration-200 hover:shadow-md"
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
        {location === null || location === '' ? null : (
          <span className="absolute right-4 top-4 inline-flex max-w-[80%] items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 font-sans text-xs font-semibold text-[#231208] shadow-sm backdrop-blur">
            <MapPin className="h-3.5 w-3.5 flex-none text-[#b4532a]" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </span>
        )}
      </Link>
    </section>
  );
}
