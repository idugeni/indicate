import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { SectionHeading } from '@/modules/site/components/network/templates/glassy-blue/ui/section-heading';
import { articleImage, formatFullViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import { badgeStyle } from '@/modules/site/components/network/templates/glassy-blue/theme';

/**
 * Seksi Berita Terbaru gaya contoh: list thumb kiri plus kartu Perspektif kanan.
 *
 * @param articles - Daftar artikel terbaru (thumb kecil).
 * @param spotlight - Artikel sorotan untuk kartu Perspektif kanan.
 * @param heading - Judul seksi.
 * @param description - Deskripsi di bawah judul.
 * @param linkHref - Tautan Lihat Semua.
 * @param linkLabel - Label tautan Lihat Semua.
 * @returns Grid Berita Terbaru plus Perspektif.
 */
export function GlassyBlueLatestNews({
  articles,
  spotlight,
  heading = 'Berita Terbaru',
  description,
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly ArticleListItem[];
  readonly spotlight: ArticleListItem | null;
  readonly heading?: string;
  readonly description?: string | undefined;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0 && spotlight === null) return null;
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading description={description}>{heading}</SectionHeading>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[var(--tpl-primary,#1f7cff)] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <ul className="m-0 list-none space-y-3 p-0">
          {articles.map((article, index) => {
            const src = articleImage(article);
            const badge = badgeStyle(index);
            return (
              <li key={article.id} className="m-0 p-0">
                <Link
                  href={article.href}
                  className="group flex gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 transition-shadow duration-200 hover:shadow-md hover:shadow-[var(--tpl-primary,#1f7cff)]/10"
                >
                  <span className="relative block h-20 w-28 flex-none overflow-hidden rounded-xl sm:h-24 sm:w-36">
                    <Image
                      unoptimized={!isLocalImageSrc(src)}
                      src={src}
                      alt=""
                      loading="lazy"
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </span>
                  <span className="grid min-w-0 content-center gap-1.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px]">
                      <span className="max-w-[16rem] truncate font-bold text-slate-800">{article.attribution}</span>
                      {article.categoryName === null ? null : (
                        <span className="rounded-md px-1.5 py-0.5 font-bold" style={badge}>
                          {article.categoryName}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                        <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                        {formatDate(article.publishedAt, 'short')}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                        <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                        {readingMinutes(article)} menit baca
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
                        <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                        {formatFullViews(article.viewCount)} pembaca
                      </span>
                      <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1 tabular-nums text-slate-500" iconClassName="h-3 w-3 opacity-70" />
                    </span>
                    <h3 className="line-clamp-2 font-sans text-[15px] font-bold leading-snug text-slate-900 group-hover:text-[var(--tpl-primary,#1f7cff)] sm:text-base">
                      {article.title}
                    </h3>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {spotlight === null ? null : (
          <article className="relative min-h-80 overflow-hidden rounded-2xl bg-[var(--tpl-primary,#1f7cff)] shadow-lg shadow-[var(--tpl-primary,#1f7cff)]/25 ring-1 ring-white/40">
            <Image
              unoptimized={!isLocalImageSrc(articleImage(spotlight))}
              src={articleImage(spotlight)}
              alt=""
              aria-hidden="true"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 340px"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-[var(--tpl-primary,#1f7cff)]/45 to-[var(--tpl-primary,#1f7cff)]/15" />
            <div className="relative flex min-h-80 flex-col justify-end gap-2.5 p-6">
              <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                Perspektif
              </p>
              <h3 className="m-0 font-sans text-2xl font-extrabold leading-tight tracking-tight text-white">
                <span className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-white/80">
                  {spotlight.attribution}
                </span>
                <Link href={spotlight.href} className="hover:underline">
                  {spotlight.title}
                </Link>
              </h3>
              <p className="m-0 line-clamp-3 font-sans text-sm leading-relaxed text-white/85">
                {spotlight.description}
              </p>
              <p className="m-0 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-xs tabular-nums text-white/75">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                  {formatDate(spotlight.publishedAt, 'long')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                  {readingMinutes(spotlight)} menit baca
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                  {formatFullViews(spotlight.viewCount)} pembaca
                </span>
                <CommentCountSlot articleId={spotlight.id} href={spotlight.href} className="inline-flex items-center gap-1" iconClassName="h-3 w-3 opacity-70" />
              </p>
              <p className="m-0 mt-1">
                <Link
                  href={spotlight.href}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-sans text-[13px] font-bold text-slate-900 shadow-md transition-colors hover:text-[var(--tpl-primary,#1f7cff)]"
                >
                  Baca Selengkapnya
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </p>
              <p aria-hidden="true" className="m-0 mt-2 flex items-center gap-1.5">
                <span className="h-1 w-6 rounded-full bg-white" />
                <span className="h-1 w-1.5 rounded-full bg-white/50" />
                <span className="h-1 w-1.5 rounded-full bg-white/50" />
              </p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
