import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Calendar, ChevronRight, Eye, Flag } from 'lucide-react';

import { buildSeoDocument } from '@/modules/site/seo';
import { parseArticleBody } from '@/modules/site/article-markup';
import { ArticleBodyView } from '@/modules/site/components/article-body-view';
import { CleanBlueJsonLd } from '@/modules/site/components/network/templates/clean-blue/seo/json-ld';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueShareButtons } from '@/modules/site/components/network/templates/clean-blue/cards/share-buttons';
import { CleanBlueViewBeacon } from '@/modules/site/components/network/templates/clean-blue/cards/view-beacon';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/cards/picks';
import { articleImage, authorDisplayName, formatDate, formatFullViews, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/clean-blue/lib/format';

export function CleanBlueArticle({
  site,
  article,
  related = [],
  newer = null,
  older = null,
}: {
  readonly site: NetworkSiteData;
  readonly article: NetworkArticle;
  readonly related?: readonly NetworkArticle[];
  readonly newer?: NetworkArticle | null;
  readonly older?: NetworkArticle | null;
}) {
  const seo = buildSeoDocument(site, { path: `/${article.slug}`, article });
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const authorName = authorDisplayName(article);
  const authorInitial = authorName.trim().slice(0, 1).toUpperCase();
  const canonical = `https://${site.context.normalizedHostname}/${article.slug}`;
  const blocks = parseArticleBody(article.body);
  const gallery = article.gallery.map((image, position) => ({ url: image.url, alt: `${article.title} (gambar ${position + 1})` }));

  return (
    <CleanBlueShell site={site} path={`/${article.slug}`}>
      <CleanBlueViewBeacon
        organizationId={site.context.organizationId}
        siteId={site.context.siteId}
        articleSiteId={article.articleSiteId}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-slate-600">
            <Link href="/" className="transition-colors hover:text-[#1a5fd0]">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {article.categorySlug ? (
              <>
                <Link href={`/categories/${article.categorySlug}`} className="transition-colors hover:text-[#1a5fd0]">
                  {article.categoryName}
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </>
            ) : null}
            <span className="max-w-xs truncate text-slate-900" aria-current="page">{article.title}</span>
          </nav>

          <p className="m-0 mt-6 flex items-center gap-2 font-sans text-sm font-semibold text-[#1a5fd0]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1a5fd0]" />
            {article.categoryName ?? 'Berita Utama'}
          </p>
          <h1 className="m-0 mt-3 block w-full font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <p className="m-0 mt-4 font-sans text-[17px] leading-relaxed text-slate-600">
            {article.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4">
            <p className="m-0 flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#1a5fd0]/10 font-sans text-base font-bold text-[#1a5fd0]">
                {authorInitial}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-sans text-sm font-bold text-slate-900">
                  {authorName}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs tabular-nums text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{reading} menit baca</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    {formatFullViews(article.viewCount)}
                  </span>
                </span>
              </span>
            </p>
            <CleanBlueShareButtons article={article} canonical={canonical} />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl shadow-sm">
            <Image
              unoptimized={!isLocalImageSrc(src)}
              src={src}
              alt={article.title}
              priority
              className="aspect-video w-full object-cover"
              width={article.imageWidth ?? 1200}
              height={article.imageHeight ?? 675}
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>

          <div className="mt-8 space-y-6">
            <ArticleBodyView
              blocks={blocks}
              images={gallery}
              paragraphClassName="m-0 text-justify font-sans text-[17px] leading-[1.85] text-slate-800"
              listClassName="m-0 space-y-2 pl-6 font-sans text-[17px] leading-[1.85] text-slate-800 [list-style:disc]"
              renderFigure={(image) => (
                <figure className="m-0 overflow-hidden rounded-2xl shadow-sm">
                  <Image
                    unoptimized={!isLocalImageSrc(image.url)}
                    src={image.url}
                    alt={image.alt}
                    className="aspect-video w-full object-cover"
                    width={1200}
                    height={675}
                    sizes="(max-width: 768px) 100vw, 768px"
                  />
                </figure>
              )}
            />
          </div>

          {article.tags.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-2" aria-label="Topik artikel">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white px-3 py-1.5 font-sans text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
            <div className="flex items-center gap-4">
              {article.authorAvatarUrl ? (
                <Image
                  unoptimized={!isLocalImageSrc(article.authorAvatarUrl)}
                  src={article.authorAvatarUrl}
                  alt={authorName}
                  width={56}
                  height={56}
                  className="h-14 w-14 flex-none rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[#1a5fd0]/10 font-sans text-xl font-bold text-[#1a5fd0]">
                  {authorInitial}
                </span>
              )}
              <div className="min-w-0">
                <p className="m-0 truncate font-sans text-base font-bold text-slate-900">
                  {authorName}
                </p>
                <p className="m-0 mt-0.5 font-sans text-xs font-medium uppercase tracking-wider text-[#1a5fd0]">
                  Penulis redaksi
                </p>
              </div>
            </div>
            {article.authorBio ? (
              <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-slate-600">
                {article.authorBio}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
              <Image
                unoptimized
                src={article.publisherLogoUrl ?? site.settings.logoUrl}
                alt={`Logo ${article.publisherName ?? article.attribution}`}
                width={40}
                height={40}
                className="h-10 w-10 flex-none rounded-lg border border-slate-200 object-cover"
              />
              <div className="min-w-0">
                <p className="m-0 flex min-w-0 items-center gap-1.5 truncate font-sans text-sm font-bold text-slate-900">
                  <span className="truncate">{article.publisherName ?? article.attribution}</span>
                  {article.publisherVerified ? (
                    <BadgeCheck className="h-4 w-4 flex-none text-[#1a5fd0]" aria-label="Penerbit terverifikasi" />
                  ) : null}
                </p>
                <p className="m-0 mt-0.5 truncate font-sans text-xs text-slate-600">
                  Penerbit
                  {article.officialInstitution ? ` · ${article.officialInstitution}` : ''}
                  {article.publisherCity ? ` · ${article.publisherCity}` : ''}
                </p>
              </div>
            </div>
            <dl className="m-0 mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
              <div className="bg-white px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-slate-400">Terbit</dt>
                <dd className="m-0 mt-0.5 font-sans text-xs font-bold tabular-nums text-slate-800">
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                </dd>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-slate-400">Baca</dt>
                <dd className="m-0 mt-0.5 font-sans text-xs font-bold tabular-nums text-slate-800">{reading} menit</dd>
              </div>
              <div className="bg-white px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-slate-400">Dibaca</dt>
                <dd className="m-0 mt-0.5 inline-flex items-center justify-center gap-1 font-sans text-xs font-bold tabular-nums text-slate-800">
                  <Eye className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  {formatFullViews(article.viewCount)}
                </dd>
              </div>
            </dl>
          </div>

          {related.length > 0 ? (
            <div className="mt-10">
              <CleanBluePicks
                articles={related.slice(0, 3)}
                heading="Artikel terkait"
                description="Bacaan lain untuk Anda"
                linkHref={null}
              />
            </div>
          ) : null}

          {newer !== null || older !== null ? (
            <nav aria-label="Navigasi artikel" className="mt-10 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
              <div className="min-w-0">
                {newer !== null ? (
                  <Link href={`/${newer.slug}`} className="group flex items-center gap-2">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition-colors group-hover:text-[#1a5fd0]">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] uppercase tracking-wider text-slate-400">Lebih baru</span>
                      <span className="block truncate font-sans text-sm font-semibold text-slate-900 group-hover:text-[#1a5fd0]">
                        {newer.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
              <div className="min-w-0 sm:text-right">
                {older !== null ? (
                  <Link href={`/${older.slug}`} className="group flex items-center gap-2 sm:flex-row-reverse sm:text-right">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition-colors group-hover:text-[#1a5fd0]">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] uppercase tracking-wider text-slate-400">Lebih lama</span>
                      <span className="block truncate font-sans text-sm font-semibold text-slate-900 group-hover:text-[#1a5fd0]">
                        {older.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}

          <p className="m-0 mt-8 flex items-center gap-1.5 font-sans text-xs text-slate-600">
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Menemukan pelanggaran?{' '}
              <Link href={`/report?artikel=${encodeURIComponent(article.slug)}`} className="font-semibold text-[#1a5fd0] hover:underline">
                Laporkan konten
              </Link>
            </span>
          </p>
        </div>
      <CleanBlueJsonLd schemas={seo.jsonLd} />
    </CleanBlueShell>
  );
}
