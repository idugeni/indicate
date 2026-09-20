import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { RedEditorialPickCard } from '@/modules/site/components/network/templates/red-editorial/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/red-editorial/ui/section-heading';
import { articleImage, formatCompactViews, isLocalImageSrc } from '@/modules/site/components/network/templates/red-editorial/lib/format';

const GRID_SIZE = 4;
const POPULAR_SIZE = 5;

export function RedEditorialPicks({
  articles,
  description,
  heading = 'Berita Terbaru',
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly ArticleListItem[];
  readonly description: string;
  readonly heading?: string;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  const grid = articles.slice(0, GRID_SIZE);
  const popular = [...articles].sort((a, b) => b.viewCount - a.viewCount).slice(0, POPULAR_SIZE);
  return (
    <section aria-label={heading}>
      <div className="flex items-end justify-between gap-4 border-b border-[#ecd3d3] pb-3">
        <SectionHeading description={description}>{heading}</SectionHeading>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 pb-1 text-sm font-semibold text-[#230d0d] transition-colors hover:text-[#b91c1c]"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4 text-[#b91c1c]" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          {grid.map((article, index) => (
            <RedEditorialPickCard key={article.id} article={article} index={index} />
          ))}
        </div>

        <aside aria-label="Paling banyak dibaca" className="min-w-0 space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#ecd3d3]/70">
            <p className="m-0 flex items-center gap-2 text-sm font-bold text-[#230d0d]">
              <TrendingUp className="h-4 w-4 text-[#b91c1c]" aria-hidden="true" />
              Paling Banyak Dibaca
            </p>
            <ol className="m-0 mt-4 list-none space-y-4 p-0">
              {popular.map((article, position) => {
                const thumb = articleImage(article);
                return (
                  <li
                    key={article.id}
                    className="m-0 flex items-start gap-3 border-b border-[#f6e8e8] p-0 pb-4 last:border-b-0 last:pb-0"
                  >
                    <span aria-hidden="true" className="w-7 flex-none font-serif text-xl font-bold tabular-nums text-[#b91c1c]">
                      {String(position + 1).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link
                        href={`/${article.slug}`}
                        className="line-clamp-2 block text-sm font-bold leading-snug text-[#230d0d] transition-colors hover:text-[#b91c1c]"
                      >
                        {article.title}
                      </Link>
                      <span className="mt-1 block text-[11px] tabular-nums text-[#ac9393]">
                        {formatCompactViews(article.viewCount)} pembaca
                      </span>
                    </span>
                    <Image
                      unoptimized={!isLocalImageSrc(thumb)}
                      src={thumb}
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
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5f0f0f] via-[#7f1d1d] to-[#b91c1c] p-6 text-white shadow-sm">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/10" />
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              Perspektif
            </p>
            <blockquote className="m-0 mt-3 font-serif text-2xl font-bold leading-snug">
              “Indonesia Lebih Maju dengan Kolaborasi Semua Pihak.”
            </blockquote>
            <p className="m-0 mt-4 border-t border-white/20 pt-3 text-xs leading-relaxed text-white/75">
              <span className="block font-bold text-white">Redaksi</span>
              Karena setiap cerita punya dampak.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
