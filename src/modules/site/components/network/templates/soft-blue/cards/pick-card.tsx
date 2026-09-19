import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/soft-blue/lib/format';
import { badgeStyle } from '@/modules/site/components/network/templates/soft-blue/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/soft-blue/ui/article-meta';

export function SoftBluePickCard({ article, index }: { readonly article: NetworkArticle; readonly index: number }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const badge = badgeStyle(index);
  return (
    <article className="flex h-full gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60">
      <Link
        href={`/${article.slug}`}
        aria-label={article.title}
        className="relative block w-32 flex-none self-stretch overflow-hidden rounded-xl sm:w-44"
      >
        <Image
          unoptimized={!isLocalImageSrc(src)}
          src={src}
          alt=""
          loading="lazy"
          fill
          className="object-cover"
          sizes="(max-width: 640px) 128px, 176px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        {article.categoryName === null ? null : (
          <span
            className="inline-flex w-fit items-center rounded-md px-2 py-0.5 font-sans text-[11px] font-bold"
            style={badge}
          >
            {article.categoryName}
          </span>
        )}
        <h3 className="m-0 mt-2 line-clamp-3 font-sans text-[15px] font-bold leading-snug tracking-tight text-slate-900">
          <Link href={`/${article.slug}`} className="hover:text-[#2563eb]">
            {article.title}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
          <Link
            href={`/${article.slug}`}
            aria-label={`Baca: ${article.title}`}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#dbeafe] text-[#2563eb] transition-colors hover:bg-[#2563eb] hover:text-white"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
