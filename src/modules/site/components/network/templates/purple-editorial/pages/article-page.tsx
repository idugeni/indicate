import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Calendar, ChevronRight, Eye, Flag } from 'lucide-react';

import { buildSeoDocument } from '@/modules/site/seo';
import { parseArticleBody } from '@/modules/site/article-markup';
import { resolvePublisherChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { ArticleBodyView } from '@/modules/site/components/article-body-view';
import { PurpleEditorialJsonLd } from '@/modules/site/components/network/templates/purple-editorial/seo/json-ld';
import { PurpleEditorialShell } from '@/modules/site/components/network/templates/purple-editorial/chrome/shell';
import { PurpleEditorialShareButtons } from '@/modules/site/components/network/templates/purple-editorial/cards/share-buttons';
import { PurpleEditorialViewBeacon } from '@/modules/site/components/network/templates/purple-editorial/cards/view-beacon';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { PurpleEditorialPicks } from '@/modules/site/components/network/templates/purple-editorial/cards/picks';
import { articleImage, formatDate, formatFullViews, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/purple-editorial/lib/format';
import { VIEW_COUNT_FRESHNESS_NOTE } from '@/modules/site/pageview-contract';

export function PurpleEditorialArticle({
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
  const bylineName = article.attribution;
  const bylineInitial = bylineName.trim().slice(0, 1).toUpperCase();
  const canonical = `https://${site.context.normalizedHostname}/${article.slug}`;
  const blocks = parseArticleBody(article.body);
  const publisherChannels = resolvePublisherChannels(article.publisherSocials);
  const gallery = article.gallery.map((image, position) => ({ url: image.url, alt: `${article.title} (gambar ${position + 1})` }));

  return (
    <PurpleEditorialShell site={site} path={`/${article.slug}`}>
      <PurpleEditorialViewBeacon
        organizationId={site.context.organizationId}
        siteId={site.context.siteId}
        articleSiteId={article.articleSiteId}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-slate-600">
            <Link href="/" className="transition-colors hover:text-[#7c3aed]">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {article.categorySlug ? (
              <>
                <Link href={`/categories/${article.categorySlug}`} className="transition-colors hover:text-[#7c3aed]">
                  {article.categoryName}
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </>
            ) : null}
            <span className="max-w-xs truncate text-slate-900" aria-current="page">{article.title}</span>
          </nav>

          {article.categoryName === null ? null : (
            <p className="m-0 mt-6 flex items-center gap-2 font-sans text-sm font-semibold text-[#7c3aed]">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#7c3aed]" />
              {article.categoryName}
            </p>
          )}
          <h1 className="m-0 mt-3 block w-full font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <p className="m-0 mt-4 block w-full border-l-[3px] border-[#7c3aed] pl-4 font-sans text-[19px] font-medium leading-[1.7] text-slate-700">
            {article.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:px-5">
            <p className="m-0 flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#7c3aed]/10 font-sans text-base font-bold text-[#7c3aed]">
                {bylineInitial}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-sans text-sm font-bold text-slate-900">
                  {bylineName}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs tabular-nums text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{reading} menit baca</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1" title={VIEW_COUNT_FRESHNESS_NOTE}>
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    {formatFullViews(article.viewCount)}
                  </span>
                </span>
              </span>
            </p>
            <PurpleEditorialShareButtons article={article} canonical={canonical} />
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
              paragraphClassName="text-justify font-sans text-[17px] leading-[1.85] text-slate-800"
              listClassName="space-y-2 pl-6 font-sans text-[17px] leading-[1.85] text-slate-800 [list-style:disc]"
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
                  className="rounded-full bg-white px-3 py-1.5 font-sans text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#7c3aed]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
            <div className="flex items-center gap-4">
              {article.publisherLogoUrl ? (
                <Image
                  unoptimized
                  src={article.publisherLogoUrl}
                  alt={`Logo ${article.attribution}`}
                  width={56}
                  height={56}
                  className="h-14 w-14 flex-none rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-[#7c3aed]/10 font-sans text-xl font-bold text-[#7c3aed]"
                >
                  {article.attribution.trim().slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="m-0 flex min-w-0 items-center gap-1.5 truncate font-sans text-base font-bold text-slate-900">
                  <span className="truncate">{article.attribution}</span>
                  {article.publisherVerified ? (
                    <BadgeCheck className="h-4 w-4 flex-none text-[#7c3aed]" aria-label="Penerbit terverifikasi" />
                  ) : null}
                </p>
                <p className="m-0 mt-0.5 truncate font-sans text-xs text-slate-600">
                  Penerbit
                  {article.officialInstitution ? ` · ${article.officialInstitution}` : ''}
                  {article.publisherCity ? ` · ${article.publisherCity}` : ''}
                </p>
              </div>
            </div>
            {article.publisherBio ? (
              <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-slate-600">
                {article.publisherBio}
              </p>
            ) : null}
            {publisherChannels.length > 0 ? (
              <p className="m-0 mt-4 flex flex-wrap items-center gap-2">
                {publisherChannels.map((channel) => {
                  const Icon = channelIcon(channel.key);
                  return (
                    <a
                      key={channel.key}
                      href={channel.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${article.attribution} di ${channel.label}`}
                      title={channel.label}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#7c3aed]"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  );
                })}
              </p>
            ) : null}
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
                <dd className="m-0 mt-0.5 inline-flex items-center justify-center gap-1 font-sans text-xs font-bold tabular-nums text-slate-800" title={VIEW_COUNT_FRESHNESS_NOTE}>
                  <Eye className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  {formatFullViews(article.viewCount)}
                </dd>
              </div>
            </dl>
          </div>

          {related.length > 0 ? (
            <div className="mt-10">
              <PurpleEditorialPicks
                articles={related.slice(0, 3)}
                heading="Artikel terkait"
                description="Bacaan lain untuk Anda"
                linkHref={null}
              />
            </div>
          ) : null}

          {newer !== null || older !== null ? (
            <nav aria-label="Navigasi artikel" className="mt-10 grid grid-cols-2 gap-3 border-t border-slate-200 pt-6 sm:gap-4">
              <div className={`min-w-0 ${newer !== null && older === null ? 'col-span-2' : ''}`}>
                {newer !== null ? (
                  <Link
                    href={`/${newer.slug}`}
                    className="group flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-[#7c3aed]/50 sm:p-5"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#ede9fe] text-[#7c3aed] transition-colors group-hover:bg-[#7c3aed] group-hover:text-white">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lebih baru
                      </span>
                      <span className="mt-1 block font-sans text-sm font-semibold leading-snug text-slate-900 group-hover:text-[#7c3aed]">
                        {newer.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
              <div className={`min-w-0 ${older !== null && newer === null ? 'col-span-2' : ''}`}>
                {older !== null ? (
                  <Link
                    href={`/${older.slug}`}
                    className="group flex h-full flex-row-reverse items-start gap-3 rounded-2xl bg-white p-4 text-right shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-[#7c3aed]/50 sm:p-5"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#ede9fe] text-[#7c3aed] transition-colors group-hover:bg-[#7c3aed] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lebih lama
                      </span>
                      <span className="mt-1 block font-sans text-sm font-semibold leading-snug text-slate-900 group-hover:text-[#7c3aed]">
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
              <Link href={`/report?artikel=${encodeURIComponent(article.slug)}`} className="font-semibold text-[#7c3aed] hover:underline">
                Laporkan konten
              </Link>
            </span>
          </p>
        </div>
      <PurpleEditorialJsonLd schemas={seo.jsonLd} />
    </PurpleEditorialShell>
  );
}
