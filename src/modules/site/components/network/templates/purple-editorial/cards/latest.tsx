import Image from 'next/image';
import Link from 'next/link';

import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/purple-editorial/lib/format';
import { badgeStyle } from '@/modules/site/components/network/templates/purple-editorial/theme';
import { SectionHeading } from '@/modules/site/components/network/templates/purple-editorial/ui/section-heading';

export function PurpleEditorialQuotePanel({ siteName, quote }: { readonly siteName: string; readonly quote: string }) {
  return (
    <aside
      aria-label="Perspektif redaksi"
      className="relative flex min-h-80 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#ec4899] p-7 text-white shadow-sm"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
      <div className="relative">
        <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
          Perspektif
        </p>
        <blockquote className="m-0 mt-3 font-sans text-2xl font-extrabold leading-snug tracking-tight">
          &ldquo;{quote}&rdquo;
        </blockquote>
      </div>
      <div className="relative mt-6">
        <span aria-hidden="true" className="block h-0.5 w-10 rounded-full bg-white/70" />
        <p className="m-0 mt-3 font-sans text-sm font-bold">{siteName}</p>
        <p className="m-0 mt-0.5 font-sans text-xs leading-relaxed text-white/80">
          Karena setiap berita punya makna.
        </p>
      </div>
    </aside>
  );
}

export function PurpleEditorialLatest({
  articles,
  siteName,
  quote,
  heading = 'Berita Terbaru',
  description = 'Kabar terkini yang baru diterbitkan',
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly NetworkArticle[];
  readonly siteName: string;
  readonly quote: string;
  readonly heading?: string;
  readonly description?: string;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-label={heading}>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading description={description}>{heading}</SectionHeading>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#7c3aed] hover:underline"
          >
            {linkLabel}
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="m-0 list-none divide-y divide-slate-200/70 p-0">
          {articles.map((article, index) => {
            const src = articleImage(article);
            const badge = badgeStyle(index);
            return (
              <li key={article.id} className="m-0 flex gap-4 p-0 py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/${article.slug}`}
                  aria-label={article.title}
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
                    {article.categoryName === null ? null : (
                      <span className="inline-block rounded-md px-2 py-0.5 font-bold" style={badge}>
                        {article.categoryName}
                      </span>
                    )}
                    <span className="tabular-nums text-slate-500">
                      {formatDate(article.publishedAt, 'medium')} · {readingMinutes(article)} mnt baca
                    </span>
                  </p>
                  <h3 className="m-0 mt-1.5 line-clamp-2 font-sans text-[15px] font-bold leading-snug text-slate-900">
                    <Link href={`/${article.slug}`} className="hover:text-[#7c3aed]">
                      {article.title}
                    </Link>
                  </h3>
                </div>
              </li>
            );
          })}
        </ul>
        <PurpleEditorialQuotePanel siteName={siteName} quote={quote} />
      </div>
    </section>
  );
}
