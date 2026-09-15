import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, authorDisplayName, badgeStyle, formatCompactViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/clean-blue/shared';

export function CleanBluePicks({
  articles,
  description,
  heading = 'Berita Pilihan',
  linkHref = '/articles',
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly NetworkArticle[];
  readonly description: string;
  readonly heading?: string;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-label={heading}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
            {heading}
          </h2>
          <p className="m-0 mt-1 font-sans text-sm text-slate-500">
            {description}
          </p>
        </div>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#1f6feb] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-3">
        {articles.map((article, index) => {
          const src = articleImage(article);
          const reading = readingMinutes(article);
          const badge = badgeStyle(index);
          return (
            <Card key={article.id} className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60">
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
                  <Link href={`/${article.slug}`} className="hover:text-[#1f6feb]">
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
                <span className="font-sans text-xs tabular-nums text-slate-500">
                  {formatDate(article.publishedAt, 'medium')} · {reading} mnt baca · {formatCompactViews(article.viewCount)} dibaca
                </span>
                <Link
                  href={`/${article.slug}`}
                  aria-label={`Baca: ${article.title}`}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e8f0fe] text-[#1f6feb] transition-colors hover:bg-[#1f6feb] hover:text-white"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
