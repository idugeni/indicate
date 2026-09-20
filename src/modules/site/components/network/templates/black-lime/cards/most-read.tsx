import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { articleImage, formatCompactViews, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/black-lime/lib/format';

export function BlackLimeQuotePanel({ siteName, quote }: { readonly siteName: string; readonly quote: string }) {
  return (
    <aside
      aria-label="Perspektif redaksi"
      className="relative flex min-h-80 flex-col justify-between overflow-hidden rounded-2xl bg-[#131711] p-7 shadow-sm ring-1 ring-[#242b1f]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#c5f82a]/10 blur-2xl"
      />
      <div className="relative">
        <p className="m-0 flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#c5f82a]">
          Perspektif
          <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-[#c5f82a]" />
        </p>
        <blockquote className="m-0 mt-3 font-sans text-2xl font-extrabold leading-snug tracking-tight text-slate-100">
          &ldquo;{quote}&rdquo;
        </blockquote>
      </div>
      <div className="relative mt-6">
        <span aria-hidden="true" className="block h-0.5 w-10 rounded-full bg-[#c5f82a]" />
        <p className="m-0 mt-3 font-sans text-sm font-bold text-slate-100">{siteName}</p>
        <p className="m-0 mt-0.5 font-sans text-xs leading-relaxed text-slate-400">
          Karena setiap berita punya makna.
        </p>
      </div>
    </aside>
  );
}

export function BlackLimeMostRead({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  const items = articles.slice(0, 5);
  if (items.length === 0) return null;
  return (
    <aside
      aria-label="Paling banyak dibaca"
      className="rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f] sm:p-6"
    >
      <p className="m-0 flex items-center gap-2 font-sans text-base font-extrabold tracking-tight text-slate-100">
        <TrendingUp className="h-4 w-4 text-[#c5f82a]" aria-hidden="true" />
        Paling Banyak Dibaca
      </p>
      <ol className="m-0 mt-2 list-none p-0">
        {items.map((article, position) => {
          const src = articleImage(article);
          return (
            <li
              key={article.id}
              className="m-0 flex items-center gap-3 border-t border-[#242b1f] p-0 py-3.5 first:border-t-0"
            >
              <span
                aria-hidden="true"
                className={`w-8 flex-none font-sans text-xl font-extrabold tabular-nums ${
                  position === 0 ? 'text-[#c5f82a]' : 'text-slate-500'
                }`}
              >
                {String(position + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="m-0 line-clamp-2 font-sans text-sm font-bold leading-snug text-slate-100">
                  <Link href={`/${article.slug}`} className="hover:text-[#c5f82a]">
                    {article.title}
                  </Link>
                </h3>
                <p className="m-0 mt-1 font-sans text-xs tabular-nums text-slate-500">
                  {formatCompactViews(article.viewCount)} pembaca · {readingMinutes(article)} mnt baca
                </p>
              </div>
              <Image
                unoptimized={!isLocalImageSrc(src)}
                src={src}
                alt=""
                loading="lazy"
                className="h-14 w-14 flex-none rounded-xl object-cover"
                width={112}
                height={112}
                sizes="56px"
              />
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
