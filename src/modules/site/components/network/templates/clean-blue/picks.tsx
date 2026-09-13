import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, badgeStyle, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/clean-blue/shared';
import { formatDate } from '@/modules/site/components/network/templates/listing-shared';

export function CleanBluePicks({
  articles,
  description,
}: {
  readonly articles: readonly NetworkArticle[];
  readonly description: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-label="Berita pilihan">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
            Berita Pilihan
          </h2>
          <p className="m-0 mt-1 font-sans text-sm text-slate-500">
            {description}
          </p>
        </div>
        <Link
          href="/articles"
          className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#1f6feb] hover:underline"
        >
          Lihat Semua
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        {articles.map((article, index) => {
          const src = articleImage(article);
          const reading = readingMinutes(article);
          const badge = badgeStyle(index);
          return (
            <article key={article.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
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
              <div className="flex flex-1 flex-col px-5 pb-5">
                <p className="m-0 -mt-9 mb-3">
                  <span
                    className="inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold"
                    style={badge}
                  >
                    {article.categoryName ?? 'Berita'}
                  </span>
                </p>
                <h3 className="m-0 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900">
                  <Link href={`/articles/${article.slug}`} className="hover:text-[#1f6feb]">
                    {article.title}
                  </Link>
                </h3>
                <p className="m-0 mt-2 line-clamp-3 font-sans text-sm leading-relaxed text-slate-600">
                  {article.description}
                </p>
                <p className="m-0 mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="font-sans text-xs tabular-nums text-slate-500">
                    {formatDate(article.publishedAt, 'medium')} · {reading} menit baca
                  </span>
                  <Link
                    href={`/articles/${article.slug}`}
                    aria-label={`Baca: ${article.title}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e8f0fe] text-[#1f6feb] transition-colors hover:bg-[#1f6feb] hover:text-white"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
