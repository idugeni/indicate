import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { articleImage, formatFullViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import { SectionHeading } from '@/modules/site/components/network/templates/green-minimal/ui/section-heading';

export function GreenMinimalLatest({
  articles,
  heading = 'Berita Terbaru',
  description = 'Kabar terkini yang baru diterbitkan',
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
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#1d7a38] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <ul className="m-0 mt-2 list-none divide-y divide-slate-200/70 p-0">
        {articles.map((article) => {
          const src = articleImage(article);
          return (
            <li key={article.id} className="m-0 grid gap-4 p-0 py-5 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-center">
              <Link
                href={article.href}
                aria-label={article.title}
                aria-hidden="true"
                tabIndex={-1}
                className="block overflow-hidden rounded-xl shadow-sm"
              >
                <Image
                  unoptimized={!isLocalImageSrc(src)}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover"
                  width={440}
                  height={275}
                  sizes="(max-width: 640px) 100vw, 220px"
                />
              </Link>
              <div className="min-w-0">
                <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[11px] font-bold uppercase tracking-wider">
                  <span className="max-w-[16rem] truncate normal-case tracking-normal text-slate-800">{article.attribution}</span>
                  {article.categoryName === null ? null : (
                    <span className="text-[#1d7a38]">{article.categoryName}</span>
                  )}
                  <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal text-slate-500">
                    <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatDate(article.publishedAt, 'short')}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal text-slate-500">
                    <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {readingMinutes(article)} mnt baca
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium normal-case tracking-normal text-slate-500">
                    <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatFullViews(article.viewCount)} pembaca
                  </span>
                  <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1 font-medium normal-case tracking-normal text-slate-500" iconClassName="h-3 w-3 opacity-70" />
                </p>
                <h3 className="m-0 mt-1.5 line-clamp-2 font-sans text-lg font-bold leading-snug text-[#10231a]">
                  <Link href={article.href} className="hover:text-[#1d7a38]">
                    {article.title}
                  </Link>
                </h3>
                <p className="m-0 mt-1.5 line-clamp-2 font-sans text-sm leading-relaxed text-[#4d6356]">
                  {article.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
