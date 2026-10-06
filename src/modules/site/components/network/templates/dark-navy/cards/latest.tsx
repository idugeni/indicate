import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { articleImage, formatFullViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import { badgeStyle } from '@/modules/site/components/network/templates/dark-navy/theme';
import { SectionHeading } from '@/modules/site/components/network/templates/dark-navy/ui/section-heading';

export function DarkNavyLatest({
  articles,
  heading = 'Berita Terbaru',
  description = 'Informasi terkini dari berbagai daerah dan dunia.',
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly ArticleListItem[];
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
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[var(--tpl-primary,#2f7bff)] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <ul className="m-0 mt-2 list-none divide-y divide-[var(--tpl-ring,#1b2c4f)] p-0">
        {articles.map((article, index) => {
          const src = articleImage(article);
          const badge = badgeStyle(index);
          return (
            <li key={article.id} className="m-0 flex gap-4 p-0 py-5">
              <Link
                href={article.href}
                aria-label={article.title}
                aria-hidden="true"
                tabIndex={-1}
                className="block h-24 w-36 flex-none overflow-hidden rounded-xl shadow-sm sm:h-28 sm:w-48"
              >
                <Image
                  unoptimized={!isLocalImageSrc(src)}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  width={384}
                  height={224}
                  sizes="(max-width: 640px) 144px, 192px"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px]">
                  <span className="max-w-[16rem] truncate font-bold text-[var(--tpl-ink,#eaf0fb)]/80">{article.attribution}</span>
                  {article.categoryName === null ? null : (
                    <span className="inline-block rounded-md px-2 py-0.5 font-bold" style={badge}>
                      {article.categoryName}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 tabular-nums text-[#8fa1bd]">
                    <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatDate(article.publishedAt, 'short')}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-[#8fa1bd]">
                    <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {readingMinutes(article)} mnt baca
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums text-[#8fa1bd]">
                    <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatFullViews(article.viewCount)} pembaca
                  </span>
                  <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1 tabular-nums text-[#8fa1bd]" iconClassName="h-3 w-3 opacity-70" />
                </p>
                <h3 className="m-0 mt-1.5 line-clamp-2 font-sans text-base font-bold leading-snug text-[var(--tpl-ink,#eaf0fb)] sm:text-lg">
                  <Link href={article.href} className="hover:text-[var(--tpl-primary,#2f7bff)]">
                    {article.title}
                  </Link>
                </h3>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
