import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { articleImage, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/green-minimal/lib/format';
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
    <section aria-label={heading}>
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
                href={`/${article.slug}`}
                aria-label={article.title}
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
                  {article.categoryName === null ? null : (
                    <span className="text-[#1d7a38]">{article.categoryName}</span>
                  )}
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-medium normal-case tracking-normal text-slate-500">
                    {formatDate(article.publishedAt, 'medium')} · {readingMinutes(article)} mnt baca
                  </span>
                </p>
                <h3 className="m-0 mt-1.5 line-clamp-2 font-sans text-lg font-bold leading-snug text-[#10231a]">
                  <Link href={`/${article.slug}`} className="hover:text-[#1d7a38]">
                    {article.title}
                  </Link>
                </h3>
                <p className="m-0 mt-1.5 line-clamp-2 font-sans text-sm leading-relaxed text-[#4d6356]">
                  {article.description}
                </p>
              </div>
              <Link
                href={`/${article.slug}`}
                aria-label={`Baca: ${article.title}`}
                className="hidden h-10 w-10 flex-none items-center justify-center rounded-full bg-[#1d7a38]/10 text-[#1d7a38] transition-colors hover:bg-[#1d7a38] hover:text-white sm:flex"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
