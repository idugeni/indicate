import Image from 'next/image';
import Link from 'next/link';

import { buildSeoDocument } from '@/modules/site/seo';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/json-ld';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/shell';
import { CleanBluePagination } from '@/modules/site/components/network/templates/clean-blue/pagination';
import type { NetworkSiteData } from '@/modules/delivery/models';
import {
  CleanBlueContainer,
  CleanBlueEmpty,
  CleanBlueStatusLine,
  articleImage,
  authorDisplayName,
  badgeStyle,
  formatCompactViews,
  formatDate,
  isLocalImageSrc,
  readingMinutes,
} from '@/modules/site/components/network/templates/clean-blue/shared';

const PER_PAGE = 8;

/**
 * Indeks /articles: BERBEDA dari homepage — tanpa hero/ticker/newsletter,
 * melainkan daftar vertikal (gambar kiri, teks kanan) + pagination.
 */
export function CleanBlueArchive({
  site,
  title,
  description,
  path = '/articles',
  page = 1,
  basePath = '/articles',
}: {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly page?: number | undefined;
  readonly basePath?: string | undefined;
}) {
  const seo = buildSeoDocument(site, { path });
  const totalPages = Math.max(1, Math.ceil(site.articles.length / PER_PAGE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const items = site.articles.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <CleanBlueShell site={site} path={path}>
      <CleanBlueContainer className="space-y-6 py-6 md:py-8">
        <CleanBlueStatusLine count={site.articles.length} title={title} />
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
            {title}
          </h1>
          <p className="m-0 mt-1 font-sans text-sm tabular-nums text-slate-500">
            {description ?? `${site.articles.length} artikel`} · Halaman {safePage} dari {totalPages}
          </p>
        </div>
        {items.length === 0 ? (
          <CleanBlueEmpty title={title} />
        ) : (
          <div className="space-y-4">
            {items.map((article, index) => {
              const src = articleImage(article);
              const reading = readingMinutes(article);
              const badge = badgeStyle(index);
              return (
                <article
                  key={article.id}
                  className="flex gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/60 sm:gap-5 sm:p-4"
                >
                  <Link
                    href={`/${article.slug}`}
                    aria-label={article.title}
                    className="w-32 flex-none self-start overflow-hidden rounded-xl sm:w-60"
                  >
                    <Image
                      unoptimized={!isLocalImageSrc(src)}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover"
                      width={article.imageWidth ?? 480}
                      height={article.imageHeight ?? 300}
                      sizes="(max-width: 640px) 33vw, 240px"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="m-0">
                      <span
                        className="inline-block rounded-lg px-2 py-0.5 font-sans text-[11px] font-bold"
                        style={badge}
                      >
                        {article.categoryName ?? 'Berita'}
                      </span>
                    </p>
                    <h2 className="m-0 mt-1.5 line-clamp-2 font-sans text-base font-bold leading-snug tracking-tight text-slate-900 sm:text-lg">
                      <Link href={`/${article.slug}`} className="hover:text-[#1f6feb]">
                        {article.title}
                      </Link>
                    </h2>
                    <p className="m-0 mt-1 line-clamp-2 hidden font-sans text-sm leading-relaxed text-slate-600 sm:block">
                      {article.description}
                    </p>
                    <p className="m-0 mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-2 font-sans text-xs tabular-nums text-slate-500">
                      <span className="font-bold text-slate-700">{authorDisplayName(article)}</span>
                      <span aria-hidden="true">·</span>
                      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                      <span aria-hidden="true">·</span>
                      <span>{reading} mnt baca</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatCompactViews(article.viewCount)} dibaca</span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <CleanBluePagination page={safePage} totalPages={totalPages} basePath={basePath} />
      </CleanBlueContainer>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
