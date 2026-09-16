import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, authorDisplayName, badgeStyle, formatCompactViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/clean-blue/shared';

export function CleanBluePickCard({ article, index }: { readonly article: NetworkArticle; readonly index: number }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const badge = badgeStyle(index);
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60">
      <div className="px-3 pt-3">
        <div className="overflow-hidden rounded-xl">
          <Image
            unoptimized={!isLocalImageSrc(src)}
            src={src}
            alt={article.title}
            loading="lazy"
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 800}
            height={article.imageHeight ?? 500}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      </div>
      <CardHeader className="flex-1 px-5">
        <p className="m-0 -mt-9 mb-3">
          <span
            className="inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold"
            style={badge}
          >
            {article.categoryName ?? 'Berita'}
          </span>
        </p>
        <CardTitle className="line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900">
          <Link href={`/${article.slug}`} className="hover:text-[#1a5fd0]">
            {article.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 font-sans text-sm leading-relaxed text-slate-600">
          {article.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <p className="m-0 truncate font-sans text-xs font-bold text-slate-800">
          {authorDisplayName(article)}
        </p>
      </CardContent>
      <CardFooter className="mt-auto justify-between border-t border-slate-100 bg-white px-5">
        <span className="font-sans text-xs tabular-nums text-slate-600">
          {formatDate(article.publishedAt, 'medium')} · {reading} mnt baca · {formatCompactViews(article.viewCount)} dibaca
        </span>
        <Link
          href={`/${article.slug}`}
          aria-label={`Baca: ${article.title}`}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a5fd0] transition-colors hover:bg-[#1a5fd0] hover:text-white"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
