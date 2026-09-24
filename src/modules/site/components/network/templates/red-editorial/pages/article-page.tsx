import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Calendar, ChevronRight, Eye, Flag } from 'lucide-react';

import { buildSeoDocument } from '@/modules/site/seo';
import { resolvePublisherChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { ArticleRichBodyView } from '@/modules/site/components/article-rich-body';
import { ArticleGallery } from '@/modules/site/components/article-gallery';
import { EditorialImage } from '@/modules/site/components/editorial-image';
import { RedEditorialJsonLd } from '@/modules/site/components/network/templates/red-editorial/seo/json-ld';
import { RedEditorialShell } from '@/modules/site/components/network/templates/red-editorial/chrome/shell';
import { AuthorAvatar } from '@/modules/site/components/network/templates/red-editorial/ui/author-avatar';
import { RedEditorialShareButtons } from '@/modules/site/components/network/templates/red-editorial/cards/share-buttons';
import { RedEditorialViewBeacon } from '@/modules/site/components/network/templates/red-editorial/cards/view-beacon';
import type { ArticleListItem, NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { RedEditorialPicks } from '@/modules/site/components/network/templates/red-editorial/cards/picks';
import { articleImage, authorDisplayName, formatDate, formatFullViews, readingMinutes } from '@/modules/site/components/network/templates/red-editorial/lib/format';

export function RedEditorialArticle({
  site,
  article,
  related = [],
  newer = null,
  older = null,
}: {
  readonly site: NetworkSiteData;
  readonly article: NetworkArticle;
  readonly related?: readonly ArticleListItem[];
  readonly newer?: ArticleListItem | null;
  readonly older?: ArticleListItem | null;
}) {
  const seo = buildSeoDocument(site, { path: `/${article.slug}`, article });
  const featuredSrc = article.imageUrl ?? article.thumbnailUrl ?? '/assets/article-fallback.webp';
  const reading = readingMinutes(article);
  const bylineName = article.attribution;
  const canonical = `https://${site.context.normalizedHostname}/${article.slug}`;
  const publisherChannels = resolvePublisherChannels(article.publisherSocials);

  return (
    <RedEditorialShell site={site} path={`/${article.slug}`}>
      <RedEditorialViewBeacon
        organizationId={site.context.organizationId}
        siteId={site.context.siteId}
        articleSiteId={article.articleSiteId}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <article>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-slate-600">
            <Link href="/" className="transition-colors hover:text-[#b91c1c]">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {article.categorySlug ? (
              <>
                <Link href={`/categories/${article.categorySlug}`} className="transition-colors hover:text-[#b91c1c]">
                  {article.categoryName}
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-slate-900" aria-current="page">{article.title}</span>
          </nav>

          <header>
          {article.categoryName === null ? null : (
            <p className="m-0 mt-6 flex items-center gap-2 font-sans text-sm font-semibold text-[#b91c1c]">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#b91c1c]" />
              {article.categoryName}
            </p>
          )}
          <h1 className="m-0 mt-3 block w-full font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <p className="m-0 mt-4 block w-full border-l-[3px] border-[#b91c1c] pl-4 font-sans text-[19px] font-medium leading-[1.7] text-slate-700">
            {article.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 sm:px-5">
            <p className="m-0 flex min-w-0 items-center gap-3">
              <AuthorAvatar name={bylineName} avatarUrl={article.publisherLogoUrl} size="md" />
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
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    {formatFullViews(article.viewCount)}
                  </span>
                </span>
              </span>
            </p>
            <RedEditorialShareButtons article={article} canonical={canonical} />
          </div>
          </header>

          <aside aria-label="Catatan editorial" className="mt-6 border-l-[3px] border-[#b91c1c] pl-4">
            <p className="m-0 font-sans text-[13px] leading-relaxed text-slate-500">
              Artikel ini merupakan konten yang dibuat oleh pengguna. Seluruh isi, informasi, dan opini yang terdapat di dalamnya menjadi tanggung jawab {authorDisplayName(article)} dan tidak mewakili pandangan resmi redaksi {site.settings.name}.
            </p>
          </aside>

          <EditorialImage
            src={featuredSrc}
            thumbSrc={article.thumbnailUrl}
            alt={article.title}
            caption={article.title}
            captionClassName="sr-only"
            width={article.imageWidth}
            height={article.imageHeight}
            focalX={article.imageFocalX}
            focalY={article.imageFocalY}
            eager
            figureClassName="m-0 mt-6 overflow-hidden rounded-2xl shadow-sm"
          />

          <div className="mt-8 space-y-6">
            <ArticleRichBodyView
              body={article.body}
              bodyJson={article.bodyJson}
              paragraphClassName="text-justify font-sans text-[17px] leading-[1.85] text-slate-800"
              listClassName="space-y-2 pl-6 font-sans text-[17px] leading-[1.85] text-slate-800 [list-style:disc]"
            />
          </div>
          <ArticleGallery images={article.gallery} title={article.title} />

          {article.tags.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-2" aria-label="Topik artikel">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white px-3 py-1.5 font-sans text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#b91c1c]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <footer className="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-6">
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
                  className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-[#b91c1c]/10 font-sans text-xl font-bold text-[#b91c1c]"
                >
                  {article.attribution.trim().slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="m-0 flex min-w-0 items-center gap-1.5 truncate font-sans text-base font-bold text-slate-900">
                  <span className="truncate">{article.attribution}</span>
                  {article.publisherVerified ? (
                    <BadgeCheck className="h-4 w-4 flex-none text-[#b91c1c]" aria-label="Penerbit terverifikasi" />
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
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#b91c1c]"
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
                <dd className="m-0 mt-0.5 inline-flex items-center justify-center gap-1 font-sans text-xs font-bold tabular-nums text-slate-800">
                  <Eye className="h-3 w-3 text-slate-400" aria-hidden="true" />
                  {formatFullViews(article.viewCount)}
                </dd>
              </div>
            </dl>
          </footer>

          </article>

          {related.length > 0 ? (
            <div className="mt-10">
              <RedEditorialPicks
                articles={related.slice(0, 3)}
                heading="Artikel terkait"
                description="Bacaan lain untuk Anda"
                linkHref={null}
              />
            </div>
          ) : null}

          {newer !== null || older !== null ? (
            <nav aria-label="Navigasi artikel" className="mt-10 grid grid-cols-1 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2 sm:gap-4">
              <div className={`min-w-0 ${newer !== null && older === null ? 'col-span-2' : ''}`}>
                {newer !== null ? (
                  <Link
                    href={`/${newer.slug}`}
                    className="group flex h-full items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-[#b91c1c]/50 sm:p-5"
                  >
                    <Image
                      unoptimized
                      src={articleImage(newer)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      width={112}
                      height={112}
                      className="h-14 w-14 flex-none rounded-xl object-cover"
                    />
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#fbe3e3] text-[#b91c1c] transition-colors group-hover:bg-[#b91c1c] group-hover:text-white">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lebih baru
                      </span>
                      <span className="mt-1 block font-sans text-sm font-semibold leading-snug text-slate-900 group-hover:text-[#b91c1c]">
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
                    className="group flex h-full flex-row-reverse items-start gap-3 rounded-2xl bg-white p-4 text-right shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-[#b91c1c]/50 sm:p-5"
                  >
                    <Image
                      unoptimized
                      src={articleImage(older)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      width={112}
                      height={112}
                      className="h-14 w-14 flex-none rounded-xl object-cover"
                    />
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#fbe3e3] text-[#b91c1c] transition-colors group-hover:bg-[#b91c1c] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Lebih lama
                      </span>
                      <span className="mt-1 block font-sans text-sm font-semibold leading-snug text-slate-900 group-hover:text-[#b91c1c]">
                        {older.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}

          <aside aria-label="Laporkan konten" className="mt-8 flex flex-col gap-4 rounded-2xl bg-[#b91c1c]/5 p-4 ring-1 ring-[#b91c1c]/15 sm:flex-row sm:items-center sm:p-5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#b91c1c]/10 text-[#b91c1c]">
              <Flag className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-bold text-slate-900">Menemukan pelanggaran?</span>
              <span className="mt-0.5 block font-sans text-sm leading-relaxed text-slate-600">
                Laporkan konten — ditinjau redaksi paling lambat 1x24 jam.
              </span>
            </span>
            <Link
              href={`/report?artikel=${encodeURIComponent(article.slug)}`}
              className="inline-flex flex-none items-center justify-center rounded-xl px-4 py-2.5 font-sans text-sm font-bold text-[#b91c1c] ring-1 ring-[#b91c1c]/30 transition-colors hover:bg-[#b91c1c] hover:text-white"
            >
              Laporkan konten
            </Link>
          </aside>
        </div>
      <RedEditorialJsonLd schemas={seo.jsonLd} />
    </RedEditorialShell>
  );
}
