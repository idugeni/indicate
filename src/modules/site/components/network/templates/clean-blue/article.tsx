import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Eye, Flag } from 'lucide-react';

import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { BackToTop } from '@/modules/site/components/layout/back-to-top';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { getReadingTime } from '@/modules/site/components/network/templates/listing-shared';
import { CleanBlueHeader } from '@/modules/site/components/network/templates/clean-blue/site-header';
import { CleanBlueFooter } from '@/modules/site/components/network/templates/clean-blue/site-footer';
import { CleanBluePicks } from '@/modules/site/components/network/templates/clean-blue/picks';
import { articleImage, isLocalImageSrc } from '@/modules/site/components/network/templates/clean-blue/shared';
import { formatDate } from '@/modules/site/components/network/templates/listing-shared';

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
  const seo = buildSeoDocument(site, { path: `/articles/${article.slug}`, article });
  const src = articleImage(article);
  const reading = getReadingTime(article.body || '');
  const authorName = article.authorName ?? article.attribution;
  const authorInitial = authorName.trim().slice(0, 1).toUpperCase();
  const canonical = `https://${site.context.normalizedHostname}/articles/${article.slug}`;
  const paragraphs = article.body.split(/\n{2,}/u).map((p) => p.trim()).filter(Boolean);
  const shareText = encodeURIComponent(`${article.title} ${canonical}`);

  return (
    <div className="min-h-screen bg-[#f5f8fd] font-sans text-slate-900 antialiased" data-template="clean-blue">
      <a
        href="#main-content"
        className="fixed left-4 top-[-5rem] z-50 rounded-lg bg-slate-900 px-4 py-3 font-sans text-sm text-white transition-[top] duration-180 focus:top-4"
      >
        Lewati ke konten
      </a>

      <CleanBlueHeader site={site} path={`/articles/${article.slug}`} />

      <main id="main-content" tabIndex={-1}>
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 md:py-12">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-slate-500">
            <Link href="/" className="transition-colors hover:text-[#1f6feb]">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {article.categorySlug ? (
              <>
                <Link href={`/categories/${article.categorySlug}`} className="transition-colors hover:text-[#1f6feb]">
                  {article.categoryName}
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </>
            ) : null}
            <span className="max-w-xs truncate text-slate-900" aria-current="page">{article.title}</span>
          </nav>

          <p className="m-0 mt-6 flex items-center gap-2 font-sans text-sm font-semibold text-[#1f6feb]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
            {article.categoryName ?? 'Berita Utama'}
          </p>
          <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-balance text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <p className="m-0 mt-4 font-sans text-[17px] leading-relaxed text-slate-600">
            {article.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4">
            <p className="m-0 flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#1f6feb]/10 font-sans text-base font-bold text-[#1f6feb]">
                {authorInitial}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-sans text-sm font-bold text-slate-900">
                  {authorName}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs tabular-nums text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{reading} menit baca</span>
                  {article.viewCount > 0 ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        {article.viewCount} dibaca
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
            </p>
            <p className="m-0 flex flex-none items-center gap-2">
              <a
                href={`https://wa.me/?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full bg-[#1f6feb] px-4 font-sans text-xs font-bold text-white transition-colors hover:bg-[#1a5fd0]"
              >
                Bagikan
              </a>
              <a
                href={`https://x.com/intent/post?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full px-3 font-sans text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
              >
                X
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full px-3 font-sans text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
              >
                Facebook
              </a>
            </p>
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

          <div className="mt-8 space-y-5">
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 16)}`} className="m-0 font-sans text-[17px] leading-[1.85] text-slate-800">
                {paragraph}
              </p>
            ))}
          </div>

          {article.tags.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-2" aria-label="Topik artikel">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white px-3 py-1.5 font-sans text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#1f6feb]/10 font-sans text-lg font-bold text-[#1f6feb]">
              {authorInitial}
            </span>
            <div className="min-w-0">
              <p className="m-0 truncate font-sans text-sm font-bold text-slate-900">
                {authorName}
              </p>
              <p className="m-0 font-sans text-xs text-slate-500">Penulis redaksi</p>
            </div>
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
                  <Link href={`/articles/${newer.slug}`} className="group flex items-center gap-2">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors group-hover:text-[#1f6feb]">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] uppercase tracking-wider text-slate-400">Lebih baru</span>
                      <span className="block truncate font-sans text-sm font-semibold text-slate-900 group-hover:text-[#1f6feb]">
                        {newer.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
              <div className="min-w-0 sm:text-right">
                {older !== null ? (
                  <Link href={`/articles/${older.slug}`} className="group flex items-center gap-2 sm:flex-row-reverse sm:text-right">
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors group-hover:text-[#1f6feb]">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] uppercase tracking-wider text-slate-400">Lebih lama</span>
                      <span className="block truncate font-sans text-sm font-semibold text-slate-900 group-hover:text-[#1f6feb]">
                        {older.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}

          <p className="m-0 mt-8 flex items-center gap-1.5 font-sans text-xs text-slate-500">
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              Menemukan pelanggaran?{' '}
              <Link href={`/report?artikel=${encodeURIComponent(article.slug)}`} className="font-semibold text-[#1f6feb] hover:underline">
                Laporkan konten
              </Link>
            </span>
          </p>
        </div>
      </main>

      <CleanBlueFooter site={site} />
      <BackToTop />
      <JsonLd schemas={seo.jsonLd} />
    </div>
  );
}
