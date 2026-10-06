import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { articleImage, formatFullViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import { badgeStyle } from '@/modules/site/components/network/templates/warm-editorial/theme';
import { SectionHeading } from '@/modules/site/components/network/templates/warm-editorial/ui/section-heading';

export function WarmEditorialQuotePanel({ siteName, quote }: { readonly siteName: string; readonly quote: string }) {
  return (
    <aside
      aria-label="Perspektif redaksi"
      className="relative flex min-h-80 min-w-0 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--tpl-primary-soft,#fae7d7)] via-[#f3c9a5] to-[var(--tpl-primary-dark,#8a3c1d)] p-7 shadow-sm lg:sticky lg:top-20"
    >
      <div className="relative">
        <p className="m-0 flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--tpl-primary-dark,#8a3c1d)]">
          Perspektif
          <span aria-hidden="true" className="h-0.5 w-8 rounded-full bg-[var(--tpl-primary-dark,#8a3c1d)]" />
        </p>
        <blockquote className="m-0 mt-3 font-serif text-2xl font-bold leading-snug tracking-tight text-[var(--tpl-ink,#231208)]">
          &ldquo;{quote}&rdquo;
        </blockquote>
      </div>
      <div className="relative mt-6">
        <span aria-hidden="true" className="block h-0.5 w-10 rounded-full bg-[var(--tpl-primary-dark,#8a3c1d)]" />
        <p className="m-0 mt-3 font-serif text-base font-bold text-white">{siteName}</p>
        <p className="m-0 mt-0.5 font-sans text-xs leading-relaxed text-white/85">
          Karena setiap cerita punya makna.
        </p>
      </div>
    </aside>
  );
}

export function WarmEditorialLatest({
  articles,
  siteName,
  quote,
  heading = 'Berita Terbaru',
  description = 'Kabar terkini yang baru diterbitkan',
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly ArticleListItem[];
  readonly siteName: string;
  readonly quote: string;
  readonly heading?: string;
  readonly description?: string;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading description={description}>{heading}</SectionHeading>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[var(--tpl-primary,#b4532a)] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="m-0 list-none divide-y divide-slate-200/70 p-0">
          {articles.map((article, index) => {
            const src = articleImage(article);
            const badge = badgeStyle(index);
            return (
              <li key={article.id} className="m-0 flex gap-4 p-0 py-4 first:pt-0 last:pb-0">
                <Link
                  href={article.href}
                  aria-label={article.title}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="block h-20 w-28 flex-none overflow-hidden rounded-xl shadow-sm"
                >
                  <Image
                    unoptimized={!isLocalImageSrc(src)}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                    width={224}
                    height={160}
                    sizes="112px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px]">
                    <span className="max-w-[16rem] truncate font-bold text-slate-800">{article.attribution}</span>
                    {article.categoryName === null ? null : (
                      <span className="inline-block rounded-md px-2 py-0.5 font-bold" style={badge}>
                        {article.categoryName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                      <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {formatDate(article.publishedAt, 'short')}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                      <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {readingMinutes(article)} mnt baca
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                      <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {formatFullViews(article.viewCount)} pembaca
                    </span>
                    <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1 tabular-nums text-slate-500" iconClassName="h-3 w-3 opacity-70" />
                  </p>
                  <h3 className="m-0 mt-1.5 line-clamp-2 font-serif text-[17px] font-bold leading-snug text-slate-900">
                    <Link href={article.href} className="hover:text-[var(--tpl-primary,#b4532a)]">
                      {article.title}
                    </Link>
                  </h3>
                </div>
              </li>
            );
          })}
        </ul>
        <WarmEditorialQuotePanel siteName={siteName} quote={quote} />
      </div>
    </section>
  );
}
