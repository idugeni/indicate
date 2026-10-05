import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Eye, Flag, MapPin, Newspaper } from 'lucide-react';

import { buildSeoDocument, resolveArticleCanonical } from '@/modules/site/seo';
import { resolveContactChannels, resolvePublisherChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';
import { ArticleHero } from '@/modules/site/components/network/ui/article-hero';
import { RelatedArticles } from '@/modules/site/components/network/ui/related-articles';
import { ArticleRichBodyView } from '@/modules/site/components/article-rich-body';
import { ArticleGallery } from '@/modules/site/components/article-gallery';
import { ArticleAudioPlayer, ArticleModeBadge, ArticleVideoPlayer, LiveblogTimeline, SponsoredDisclosure } from '@/modules/site/components/article-mode-blocks';
import { JsonLd } from '@/modules/site/components/network/seo/json-ld';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { ArticlePrintFooter, ArticlePrintMasthead } from '@/modules/site/components/network/ui/article-print-sheet';
import { ViewBeacon } from '@/modules/site/components/network/cards/view-beacon';
import { AdSlot } from '@/modules/ads/ad-slot';
import { CommentThread } from '@/modules/site/components/network/disqus/comment-thread';
import type { ArticleListItem, NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { articleImage, formatDate, formatFullViews, readingMinutes } from '@/modules/site/components/network/ui/format';
import { selectArticleSidebar } from '@/modules/site/components/network/ui/article-sidebar-data';
import { ArticleRail } from '@/modules/site/components/network/ui/article-rail';

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
          <ArticleHero
            variant="split"
            article={article}
            siteName={site.settings.name}
            bylineName={bylineName}
            reading={reading}
            canonical={canonical}
            skin={{
              accent: DARK_NAVY.primary,
              tone: 'dark',
              card: DARK_NAVY.card,
              ring: DARK_NAVY.ring,
              ink: DARK_NAVY.ink,
              muted: DARK_NAVY.muted,
              authorAvatar: DARK_NAVY.authorAvatar,
              shareButtons: DARK_NAVY.shareButtons,
            }}
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

          <div className="mt-8 space-y-7">
            <ArticleRichBodyView
              body={article.body}
              bodyJson={article.bodyJson}
              paragraphClassName="text-justify font-sans text-[17px] leading-[1.75] text-[#eaf0fb]"
              listClassName="space-y-2 pl-6 font-sans text-[17px] leading-[1.75] text-[#eaf0fb] [list-style:disc]"
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
                <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-sans text-xs text-[#9aa9c4]">
                  <span className="inline-flex items-center gap-1">
                    <Newspaper className="h-3 w-3 opacity-70" aria-hidden="true" />
                    Penerbit
                  </span>
                  {article.officialInstitution ? (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {article.officialInstitution}
                    </span>
                  ) : null}
                  {article.publisherCity ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {article.publisherCity}
                    </span>
                  ) : null}
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
        <ArticleRail variant="minimal" site={site} sidebar={sidebar} followChannels={followChannels} />
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
              <RelatedArticles
                variant="overlay"
                articles={related.slice(0, 3)}
                pool={site.articles}
                heading="Artikel terkait"
                description="Bacaan lain untuk Anda"
                skin={{
                  accent: DARK_NAVY.primary,
                  tone: 'dark',
                  card: DARK_NAVY.card,
                  ring: DARK_NAVY.ring,
                  ink: DARK_NAVY.ink,
                  muted: DARK_NAVY.muted,
                  authorAvatar: DARK_NAVY.authorAvatar,
                }}
              />
            </div>
          ) : null}

          {newer !== null || older !== null ? (
            <nav aria-label="Navigasi artikel" className="mt-10 grid grid-cols-1 gap-4 border-t border-[#1b2c4f] pt-6 sm:mt-12 sm:grid-cols-2 sm:gap-5 sm:pt-8 md:gap-6">
              <div className={`min-w-0 ${newer !== null && older === null ? 'col-span-2' : ''}`}>
                {newer !== null ? (
                  <Link
                    href={newer.href}
                    className="group relative block min-h-48 overflow-hidden rounded-2xl bg-[#0e1a33] shadow-sm ring-1 ring-[#1b2c4f]/60 transition-all hover:shadow-md hover:ring-[#2f7bff]/50 sm:min-h-56"
                  >
                    <Image
                      unoptimized
                      src={articleImage(newer)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Lebih baru
                    </span>
                    <span className="absolute inset-x-0 bottom-0 block p-4 sm:p-5">
                      <span className="line-clamp-2 block font-sans text-base font-bold leading-snug text-white sm:text-lg">
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
                    className="group relative block min-h-48 overflow-hidden rounded-2xl bg-[#0e1a33] shadow-sm ring-1 ring-[#1b2c4f]/60 transition-all hover:shadow-md hover:ring-[#2f7bff]/50 sm:min-h-56"
                  >
                    <Image
                      unoptimized
                      src={articleImage(older)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                      Lebih lama
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 block p-4 text-right sm:p-5">
                      <span className="line-clamp-2 block font-sans text-base font-bold leading-snug text-white sm:text-lg">
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
