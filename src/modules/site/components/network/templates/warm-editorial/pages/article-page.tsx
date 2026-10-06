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
import { WarmEditorialShell } from '@/modules/site/components/network/templates/warm-editorial/chrome/shell';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';
import { ArticlePrintFooter, ArticlePrintMasthead } from '@/modules/site/components/network/ui/article-print-sheet';
import { ViewBeacon } from '@/modules/site/components/network/cards/view-beacon';
import { AdSlot } from '@/modules/ads/ad-slot';
import { CommentThread } from '@/modules/site/components/network/disqus/comment-thread';
import type { ArticleListItem, NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { articleImage, formatDate, formatFullViews, readingMinutes } from '@/modules/site/components/network/ui/format';
import { selectArticleSidebar } from '@/modules/site/components/network/ui/article-sidebar-data';
import { ArticleRail } from '@/modules/site/components/network/ui/article-rail';

export function WarmEditorialArticle({
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
    <WarmEditorialShell site={site} path={`/${article.slug}`}>
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
            variant="overlay"
            article={article}
            siteName={site.settings.name}
            bylineName={bylineName}
            reading={reading}
            canonical={canonical}
            skin={{
              accent: WARM_EDITORIAL.primary,
              tone: 'light',
              card: WARM_EDITORIAL.card,
              ring: WARM_EDITORIAL.ring,
              ink: WARM_EDITORIAL.ink,
              muted: WARM_EDITORIAL.muted,
              authorAvatar: WARM_EDITORIAL.authorAvatar,
              shareButtons: WARM_EDITORIAL.shareButtons,
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
              paragraphClassName="text-justify font-sans text-[17px] leading-[1.75] text-slate-800"
              listClassName="space-y-2 pl-6 font-sans text-[17px] leading-[1.75] text-slate-800 [list-style:disc]"
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
                  className="rounded-full bg-white px-3 py-1.5 font-sans text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#b4532a)]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
          <AdSlot site={site} slot="content-bottom" />

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
                  className="flex h-14 w-14 flex-none items-center justify-center rounded-xl bg-[var(--tpl-primary,#b4532a)]/10 font-sans text-xl font-bold text-[var(--tpl-primary,#b4532a)]"
                >
                  {article.attribution.trim().slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="m-0 flex min-w-0 items-center gap-1.5 truncate font-sans text-base font-bold text-slate-900">
                  <span className="truncate">{article.attribution}</span>
                  {article.publisherVerified ? (
                    <BadgeCheck className="h-4 w-4 flex-none text-[var(--tpl-primary,#b4532a)]" aria-label="Penerbit terverifikasi" />
                  ) : null}
                </p>
                <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-sans text-xs text-slate-600">
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
              <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-slate-600">
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
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#b4532a)]"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </TemplateTooltip>
                  );
                })}
              </p>
            ) : null}
            <dl className="m-0 mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
              <div className="bg-white px-3 py-2.5 text-center">
                <dt className="font-sans text-[10px] uppercase tracking-wider text-slate-400">Terbit</dt>
                <dd className="m-0 mt-0.5 font-sans text-xs font-bold tabular-nums text-slate-800">
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'short')}</time>
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
                variant="numbered"
                articles={related.slice(0, 3)}
                pool={site.articles}
                heading="Artikel terkait"
                description="Bacaan lain untuk Anda"
                skin={{
                  accent: WARM_EDITORIAL.primary,
                  tone: 'light',
                  card: WARM_EDITORIAL.card,
                  ring: WARM_EDITORIAL.ring,
                  ink: WARM_EDITORIAL.ink,
                  muted: WARM_EDITORIAL.muted,
                  authorAvatar: WARM_EDITORIAL.authorAvatar,
                }}
              />
            </div>
          ) : null}

          {newer !== null || older !== null ? (
            <nav aria-label="Navigasi artikel" className="mt-10 grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 sm:mt-12 sm:grid-cols-2 sm:gap-5 sm:pt-8 md:gap-6">
              <div className={`min-w-0 ${newer !== null && older === null ? 'col-span-2' : ''}`}>
                {newer !== null ? (
                  <Link
                    href={newer.href}
                    className="group relative block min-h-48 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-[var(--tpl-primary,#b4532a)]/50 sm:min-h-56"
                  >
                    <Image
                      unoptimized
                      src={articleImage(newer)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-all duration-300 ease-out group-hover:brightness-[1.06] group-hover:saturate-[1.05] motion-reduce:transition-none"
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-90 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none" />
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
                    className="group relative block min-h-48 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-all hover:shadow-md hover:ring-[var(--tpl-primary,#b4532a)]/50 sm:min-h-56"
                  >
                    <Image
                      unoptimized
                      src={articleImage(older)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover transition-all duration-300 ease-out group-hover:brightness-[1.06] group-hover:saturate-[1.05] motion-reduce:transition-none"
                    />
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-90 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none" />
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

          <aside aria-label="Laporkan konten" className="mt-8 flex flex-col gap-4 rounded-2xl bg-[var(--tpl-primary,#b4532a)]/5 p-4 ring-1 ring-[var(--tpl-primary,#b4532a)]/15 sm:flex-row sm:items-center sm:p-5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[var(--tpl-primary,#b4532a)]/10 text-[var(--tpl-primary,#b4532a)]">
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
              className="inline-flex flex-none items-center justify-center rounded-xl px-4 py-2.5 font-sans text-sm font-bold text-[var(--tpl-primary,#b4532a)] ring-1 ring-[var(--tpl-primary,#b4532a)]/30 transition-colors hover:bg-[var(--tpl-primary,#b4532a)] hover:text-white"
            >
              Laporkan konten
            </Link>
          </aside>
        </div>
      <JsonLd schemas={seo.jsonLd} />
    </WarmEditorialShell>
  );
}
