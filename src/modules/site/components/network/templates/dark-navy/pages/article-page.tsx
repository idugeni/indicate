import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Calendar, ChevronRight, Eye, Flag } from 'lucide-react';

import { buildSeoDocument, resolveArticleCanonical } from '@/modules/site/seo';
import { resolveContactChannels, resolvePublisherChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';
import { ArticleRichBodyView } from '@/modules/site/components/article-rich-body';
import { ArticleGallery } from '@/modules/site/components/article-gallery';
import { ArticleAudioPlayer, ArticleModeBadge, ArticleVideoPlayer, LiveblogTimeline, SponsoredDisclosure } from '@/modules/site/components/article-mode-blocks';
import { youtubeThumbnailFallbackUrl } from '@/modules/site/article-type';
import { EditorialImage } from '@/modules/site/components/editorial-image';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { AuthorAvatar } from '@/modules/site/components/network/ui/author-avatar';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { ShareButtons } from '@/modules/site/components/network/cards/share-buttons';
import { ArticlePrintButton } from '@/modules/site/components/network/ui/article-print-button';
import { ArticlePrintFooter, ArticlePrintMasthead } from '@/modules/site/components/network/ui/article-print-sheet';
import { ViewBeacon } from '@/modules/site/components/network/cards/view-beacon';
import { AdSlot } from '@/modules/ads/ad-slot';
import { CommentThread } from '@/modules/site/components/network/disqus/comment-thread';
import type { ArticleListItem, NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyPicks } from '@/modules/site/components/network/templates/dark-navy/cards/picks';
import { articleImage, authorDisplayName, formatDate, formatFullViews, readingMinutes } from '@/modules/site/components/network/ui/format';
import { selectArticleSidebar } from '@/modules/site/components/network/ui/article-sidebar-data';
import { ArticleSidebarBacaJuga, ArticleSidebarIkutiKami, ArticleSidebarKanal, ArticleSidebarNewsletter, ArticleSidebarShare, ArticleSidebarTerbaru, ArticleSidebarTerpopuler, ArticleSidebarTopik } from '@/modules/site/components/network/ui/article-sidebar';

export function DarkNavyArticle({
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
  const canonical = resolveArticleCanonical(site, `/${article.slug}`, article);
  const publisherChannels = resolvePublisherChannels(article.publisherSocials);
  const sidebar = selectArticleSidebar(site.articles, article.id, related);
  const followChannels = resolveContactChannels(site.settings.socialLinks);

  return (
    <DarkNavyShell site={site} path={`/${article.slug}`}>
      <ViewBeacon
        organizationId={site.context.organizationId}
        siteId={site.context.siteId}
        articleSiteId={article.articleSiteId}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-12">
        <div className="grid items-start gap-8 print:block lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <ArticlePrintMasthead
            siteName={site.settings.name}
            byline={bylineName}
            dateLabel={formatDate(article.publishedAt, 'long')}
            canonical={canonical}
          />
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-[#9aa9c4]">
            <Link href="/" className="transition-colors hover:text-[#2f7bff]">
              Beranda
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            {article.categorySlug ? (
              <>
                <Link href={`/categories/${article.categorySlug}`} className="transition-colors hover:text-[#2f7bff]">
                  {article.categoryName}
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </>
            ) : null}
            <span className="min-w-0 flex-1 truncate text-[#eaf0fb]" aria-current="page">{article.title}</span>
          </nav>

          <header>
          {article.categoryName === null ? null : (
            <p className="m-0 mt-6 flex items-center gap-2 font-sans text-sm font-semibold text-[#2f7bff]">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#2f7bff]" />
              {article.categoryName}
            </p>
          )}
          <h1 className="m-0 mt-3 block w-full font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-[#eaf0fb] sm:text-4xl">
            {article.title}
          </h1>
          <p className="m-0 mt-4 block w-full border-l-[3px] border-[#2f7bff] pl-4 font-sans text-[19px] font-medium leading-[1.7] text-[#9aa9c4]">
            {article.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#0e1a33] p-4 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:px-5">
            <p className="m-0 flex min-w-0 items-center gap-3">
              <AuthorAvatar skin={DARK_NAVY.authorAvatar} name={bylineName} avatarUrl={article.publisherLogoUrl} size="md" />
              <span className="min-w-0">
                <span className="block truncate font-sans text-sm font-bold text-[#eaf0fb]">
                  {bylineName}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-xs tabular-nums text-[#9aa9c4]">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" aria-hidden="true" />
                    <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'long')}</time>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{reading} menit baca</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" aria-hidden="true" />
                    {formatFullViews(article.viewCount)} pembaca
                  </span>
                </span>
              </span>
            </p>
            <span className="flex flex-wrap items-center gap-2">
              <ShareButtons skin={DARK_NAVY.shareButtons} article={article} canonical={canonical} />
              <ArticlePrintButton title={article.title} />
            </span>
          </div>
          </header>

          <aside aria-label="Catatan editorial" className="mt-6 border-l-[3px] border-[#2f7bff] pl-4">
            <p className="m-0 font-sans text-[13px] leading-relaxed text-[#9aa9c4]">
              Artikel ini merupakan konten yang dibuat oleh pengguna. Seluruh isi, informasi, dan opini yang terdapat di dalamnya menjadi tanggung jawab {authorDisplayName(article)} dan tidak mewakili pandangan resmi redaksi {site.settings.name}.
            </p>
          </aside>

          <EditorialImage
            src={featuredSrc}
            thumbSrc={article.thumbnailUrl}
            alt={article.title}
            caption={article.title}
            captionClassName="sr-only"
            fallbackSrc={youtubeThumbnailFallbackUrl(article.type === 'video' ? article.videoUrl : null)}
            width={article.imageWidth}
            height={article.imageHeight}
            focalX={article.imageFocalX}
            focalY={article.imageFocalY}
            eager
            figureClassName="m-0 mt-6 overflow-hidden rounded-2xl shadow-sm"
          />
          <AdSlot site={site} slot="in-content" />
          {article.type === 'standard' ? null : (
            <p className="m-0 mt-4 flex items-center gap-2">
              <ArticleModeBadge type={article.type} />
            </p>
          )}
          {article.type === 'video' ? (
            <ArticleVideoPlayer videoUrl={article.videoUrl} durationSeconds={article.durationSeconds} title={article.title} />
          ) : null}
          {article.type === 'audio' ? (
            <ArticleAudioPlayer audioUrl={article.audioUrl} durationSeconds={article.durationSeconds} title={article.title} />
          ) : null}

          <div className="mt-8 space-y-6">
            <ArticleRichBodyView
              body={article.body}
              bodyJson={article.bodyJson}
              paragraphClassName="text-justify font-sans text-[17px] leading-[1.85] text-[#eaf0fb]"
              listClassName="space-y-2 pl-6 font-sans text-[17px] leading-[1.85] text-[#eaf0fb] [list-style:disc]"
            />
          </div>
          <ArticleGallery images={article.gallery} title={article.title} />
          <LiveblogTimeline updates={article.updates} />
          <SponsoredDisclosure isSponsored={article.isSponsored} attribution={article.attribution} />
          <AdSlot site={site} slot="content-middle" />

          {article.tags.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-2" aria-label="Topik artikel">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-[#0e1a33] px-3 py-1.5 font-sans text-xs font-medium text-[#9aa9c4] ring-1 ring-[#1b2c4f] transition-colors hover:text-[#2f7bff]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
          <AdSlot site={site} slot="content-bottom" />

          <footer className="mt-8 rounded-2xl bg-[#0e1a33] p-5 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-6">
            <div className="flex items-center gap-4">
              {article.publisherLogoUrl ? (
                <Image
                  unoptimized
                  src={article.publisherLogoUrl}
                  alt={`Logo ${article.attribution}`}
                  width={56}
                  height={56}
                  className="h-14 w-14 flex-none rounded-xl border border-[#1b2c4f] object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-[#2f7bff]/10 font-sans text-xl font-bold text-[#2f7bff]"
                >
                  {article.attribution.trim().slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="m-0 flex min-w-0 items-center gap-1.5 truncate font-sans text-base font-bold text-[#eaf0fb]">
                  <span className="truncate">{article.attribution}</span>
                  {article.publisherVerified ? (
                    <BadgeCheck className="h-4 w-4 flex-none text-[#2f7bff]" aria-label="Penerbit terverifikasi" />
                  ) : null}
                </p>
                <p className="m-0 mt-0.5 truncate font-sans text-xs text-[#9aa9c4]">
                  Penerbit
                  {article.officialInstitution ? ` · ${article.officialInstitution}` : ''}
                  {article.publisherCity ? ` · ${article.publisherCity}` : ''}
                </p>
              </div>
            </div>
            {article.publisherBio ? (
              <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-[#9aa9c4]">
                {article.publisherBio}
              </p>
            ) : null}
            {publisherChannels.length > 0 ? (
              <p className="m-0 mt-4 flex flex-wrap items-center gap-2">
                {publisherChannels.map((channel) => {
                  const Icon = channelIcon(channel.key);
                  return (
                    <TemplateTooltip key={channel.key} label={channel.label}>
                      <a
                        href={channel.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${article.attribution} di ${channel.label}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#9aa9c4] ring-1 ring-[#1b2c4f] transition-colors hover:text-[#2f7bff]"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </TemplateTooltip>
                  );
                })}
              </p>
            ) : null}
            <dl className="m-0 mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-[#14294f] ring-1 ring-[#1b2c4f]">
              <div className="bg-[#0e1a33] px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-[#5f6f8c]">Terbit</dt>
                <dd className="m-0 mt-0.5 font-sans text-xs font-bold tabular-nums text-[#eaf0fb]">
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'short')}</time>
                </dd>
              </div>
              <div className="bg-[#0e1a33] px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-[#5f6f8c]">Baca</dt>
                <dd className="m-0 mt-0.5 font-sans text-xs font-bold tabular-nums text-[#eaf0fb]">{reading} menit</dd>
              </div>
              <div className="bg-[#0e1a33] px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-[#5f6f8c]">Dibaca</dt>
                <dd className="m-0 mt-0.5 inline-flex items-center justify-center gap-1 font-sans text-xs font-bold tabular-nums text-[#eaf0fb]">
                  <Eye className="h-3 w-3 text-[#5f6f8c]" aria-hidden="true" />
                  {formatFullViews(article.viewCount)}
                </dd>
              </div>
            </dl>
          </footer>

          <ArticlePrintFooter siteName={site.settings.name} canonical={canonical} />

          </article>
        <aside aria-label="Sidebar artikel" className="grid min-w-0 gap-6 print:hidden lg:sticky lg:top-20">
          <ArticleSidebarShare skin={DARK_NAVY.shareButtons} article={article} canonical={canonical} />
          <ArticleSidebarBacaJuga articles={sidebar.bacaJuga} />
          <AdSlot site={site} slot="sidebar-top" />
          <ArticleSidebarTerpopuler articles={sidebar.terpopuler} />
          <ArticleSidebarTerbaru articles={sidebar.terbaru} />
          <ArticleSidebarTopik topics={sidebar.topics} />
          <ArticleSidebarKanal channels={sidebar.channels} />
          <ArticleSidebarNewsletter />
          <ArticleSidebarIkutiKami channels={followChannels} />
          <AdSlot site={site} slot="sidebar-bottom" />
        </aside>
        </div>

          {site.settings.commentsEnabled ? (
            <CommentThread
              siteId={site.context.siteId}
              articleId={article.id}
              url={canonical}
              title={article.title}
              locale={site.settings.locale}
            />
          ) : null}

          {related.length > 0 ? (
            <div className="mt-10">
              <DarkNavyPicks
                articles={related.slice(0, 3)}
                heading="Artikel terkait"
                description="Bacaan lain untuk Anda"
                linkHref={null}
              />
            </div>
          ) : null}

          {newer !== null || older !== null ? (
            <nav aria-label="Navigasi artikel" className="mt-10 grid grid-cols-1 gap-3 border-t border-[#1b2c4f] pt-6 sm:grid-cols-2 sm:gap-4">
              <div className={`min-w-0 ${newer !== null && older === null ? 'col-span-2' : ''}`}>
                {newer !== null ? (
                  <Link
                    href={newer.href}
                    className="group flex h-full items-start gap-3 rounded-2xl bg-[#0e1a33] p-4 shadow-sm ring-1 ring-[#1b2c4f]/60 transition-all hover:shadow-md hover:ring-[#2f7bff]/50 sm:p-5"
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
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#14294f] text-[#2f7bff] transition-colors group-hover:bg-[#2f7bff] group-hover:text-white">
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-[#5f6f8c]">
                        Lebih baru
                      </span>
                      <span className="mt-1 block font-sans text-sm font-semibold leading-snug text-[#eaf0fb] group-hover:text-[#2f7bff]">
                        {newer.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
              <div className={`min-w-0 ${older !== null && newer === null ? 'col-span-2' : ''}`}>
                {older !== null ? (
                  <Link
                    href={older.href}
                    className="group flex h-full flex-row-reverse items-start gap-3 rounded-2xl bg-[#0e1a33] p-4 text-right shadow-sm ring-1 ring-[#1b2c4f]/60 transition-all hover:shadow-md hover:ring-[#2f7bff]/50 sm:p-5"
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
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#14294f] text-[#2f7bff] transition-colors group-hover:bg-[#2f7bff] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-sans text-[11px] font-bold uppercase tracking-wider text-[#5f6f8c]">
                        Lebih lama
                      </span>
                      <span className="mt-1 block font-sans text-sm font-semibold leading-snug text-[#eaf0fb] group-hover:text-[#2f7bff]">
                        {older.title}
                      </span>
                    </span>
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}

          <aside aria-label="Laporkan konten" className="mt-8 flex flex-col gap-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 sm:flex-row sm:items-center sm:p-5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#2f7bff]/10 text-[#2f7bff]">
              <Flag className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-bold text-[#eaf0fb]">Menemukan pelanggaran?</span>
              <span className="mt-0.5 block font-sans text-sm leading-relaxed text-[#9aa9c4]">
                Laporkan konten — ditinjau redaksi paling lambat 1x24 jam.
              </span>
            </span>
            <Link
              href={`/report?artikel=${encodeURIComponent(article.slug)}`}
              className="inline-flex flex-none items-center justify-center rounded-xl px-4 py-2.5 font-sans text-sm font-bold text-[#2f7bff] ring-1 ring-[#2f7bff]/30 transition-colors hover:bg-[#2f7bff] hover:text-white"
            >
              Laporkan konten
            </Link>
          </aside>
        </div>
      <JsonLd schemas={seo.jsonLd} />
    </DarkNavyShell>
  );
}
