import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  MapPin,
  PenLine,
  Radio,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { ShareBox } from '@/modules/site/components/network/share-box';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { ARTICLE_FALLBACK_IMAGE_URL, MINISTRY_FALLBACK_LOGO_URL } from '@/ui/site/marketing-content';
import {
  ArticleCard,
  CategoryMeta,
  ChannelAside,
  EmptyListing,
  PopularAside,
  StatusLine,
  formatCompactViews,
  formatDate,
  formatTime,
  getReadingTime,
  isLocalImageSrc,
  normalizeTemplateId,
  type CardVariant,
  type ListingProps,
} from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';
import { PortalNewsListing } from '@/modules/site/components/network/templates/portal-news';
import { BroadsheetListing } from '@/modules/site/components/network/templates/broadsheet-classic';
import { ColumnistListing } from '@/modules/site/components/network/templates/columnist-opinion';
import { CompactStreamListing } from '@/modules/site/components/network/templates/compact-stream';
import { EditorialMagazineListing } from '@/modules/site/components/network/templates/editorial-magazine';
import { GeoRadarListing } from '@/modules/site/components/network/templates/geo-radar';
import { MinimalPressListing } from '@/modules/site/components/network/templates/minimal-press';
import { ModernTechListing } from '@/modules/site/components/network/templates/modern-tech';
import { MultimediaVisualListing } from '@/modules/site/components/network/templates/multimedia-visual';
import { TabloidExpressListing } from '@/modules/site/components/network/templates/tabloid-express';
import { CleanBlueListing } from '@/modules/site/components/network/templates/clean-blue/index';

// Sinkronisasi: API publik berkas ini tidak berubah — halaman cukup mengimpor
// dari sini seperti sebelumnya. Setiap layout tinggal di
// `templates/<template-id>.tsx` dan didispatch oleh `ListingPage`.
export {
  ArticleCard,
  CategoryMeta,
  ChannelAside,
  EmptyListing,
  PopularAside,
  StatusLine,
  formatCompactViews,
  formatDate,
  formatTime,
  getReadingTime,
  isLocalImageSrc,
  normalizeTemplateId,
  NetworkTemplate,
  PortalNewsListing,
  BroadsheetListing,
  ColumnistListing,
  CompactStreamListing,
  EditorialMagazineListing,
  GeoRadarListing,
  MinimalPressListing,
  ModernTechListing,
  MultimediaVisualListing,
  TabloidExpressListing,
  CleanBlueListing,
};
export { TEMPLATE_IDS, type ListingProps, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';
export type { CardVariant };

export function ListingPage({
  site,
  title,
  description,
  path = '/',
  indexable = true,
}: ListingProps) {
  const templateId = normalizeTemplateId(site.settings.colors.templateId);
  const shared = { site, title, description, path, indexable } as const;

  switch (templateId) {
    case 'broadsheet-classic':
      return <BroadsheetListing {...shared} />;
    case 'columnist-opinion':
      return <ColumnistListing {...shared} />;
    case 'compact-stream':
      return <CompactStreamListing {...shared} />;
    case 'editorial-magazine':
      return <EditorialMagazineListing {...shared} />;
    case 'geo-radar':
      return <GeoRadarListing {...shared} />;
    case 'minimal-press':
      return <MinimalPressListing {...shared} />;
    case 'modern-tech':
      return <ModernTechListing {...shared} />;
    case 'multimedia-visual':
      return <MultimediaVisualListing {...shared} />;
    case 'tabloid-express':
      return <TabloidExpressListing {...shared} />;
    case 'clean-blue':
      return <CleanBlueListing {...shared} />;
    case 'portal-news':
    default:
      return <PortalNewsListing {...shared} />;
  }
}

export function ArticlePage({
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
  const templateId = normalizeTemplateId(site.settings.colors.templateId);
  const readingTime = getReadingTime(article.body || '');
  const heroImageSrc = article.imageUrl ?? ARTICLE_FALLBACK_IMAGE_URL;
  const heroUnoptimized = !isLocalImageSrc(heroImageSrc);
  const paragraphs = article.body.split(/\n{2,}/u).map((p) => p.trim()).filter(Boolean);

  const bodyClass =
    templateId === 'columnist-opinion'
      ? 'article-body article-body--serif space-y-6 border-b border-hairline pb-12 font-serif text-[1.05rem] leading-[1.9] text-paper'
      : templateId === 'broadsheet-classic'
        ? 'article-body article-body--dropcap space-y-6 border-b border-hairline pb-12 font-serif text-base leading-[1.85] text-paper sm:text-lg'
        : 'article-body space-y-6 border-b border-hairline pb-12 font-serif text-base leading-[1.85] text-paper sm:text-lg';

  const relatedVariant: CardVariant =
    templateId === 'compact-stream' ? 'timeline'
    : templateId === 'multimedia-visual' ? 'visual'
    : templateId === 'tabloid-express' ? 'flash'
    : templateId === 'columnist-opinion' || templateId === 'minimal-press' ? 'row'
    : 'standard';

  return (
    <NetworkTemplate site={site}>
      {templateId === 'tabloid-express' ? (
        <div className="border-b border-hairline bg-[var(--site-primary)] py-8 md:py-10">
          <Container>
            <ArticleBreadcrumb article={article} light />
            <p className="m-0 mt-4 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-white/85">
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              {article.categoryName ?? 'Kilat'} · {readingTime} mnt baca
            </p>
            <h1 className="m-0 mt-2 max-w-4xl font-sans text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
              {article.title}
            </h1>
          </Container>
        </div>
      ) : null}

      {templateId === 'multimedia-visual' ? (
        <div className="border-b border-hairline bg-black">
          <Container className="py-6">
            <ArticleBreadcrumb article={article} />
            <div className="media-frame mt-4 aspect-video overflow-hidden rounded bg-bg-raised-2">
              <Image
                unoptimized={heroUnoptimized}
                src={heroImageSrc}
                alt={article.title}
                priority
                className="h-full w-full object-cover"
                width={article.imageWidth ?? 1600}
                height={article.imageHeight ?? 900}
                sizes="100vw"
              />
            </div>
            <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">
              {article.title} · {formatDate(article.publishedAt, 'medium')}
            </p>
          </Container>
        </div>
      ) : null}

      <article className={`mx-auto w-full max-w-3xl space-y-8 px-6 py-10 md:py-14 ${templateId === 'minimal-press' ? 'article-doc' : ''}`}>
        {templateId !== 'tabloid-express' && templateId !== 'multimedia-visual' ? (
          <ArticleBreadcrumb article={article} />
        ) : null}

        {templateId !== 'tabloid-express' ? (
          <header className="space-y-4">
            {templateId === 'minimal-press' ? (
              <div className="overflow-hidden rounded border border-hairline">
                <p className="m-0 flex items-center gap-1.5 border-b border-hairline bg-bg-raised px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--site-accent)]">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  Dokumen resmi
                </p>
                <dl className="m-0 grid gap-px bg-hairline sm:grid-cols-3">
                  <div className="bg-bg px-4 py-3">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Kategori</dt>
                    <dd className="m-0 mt-1 font-sans text-sm font-semibold text-paper">{article.categoryName ?? 'Siaran pers'}</dd>
                  </div>
                  <div className="bg-bg px-4 py-3">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Terbit</dt>
                    <dd className="m-0 mt-1 font-sans text-sm font-semibold text-paper">
                      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'full')}</time>
                    </dd>
                  </div>
                  <div className="bg-bg px-4 py-3">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Dibaca</dt>
                    <dd className="m-0 mt-1 font-sans text-sm font-semibold tabular-nums text-paper">{formatCompactViews(article.viewCount)} kali</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {templateId === 'compact-stream' ? (
              <p className="m-0 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--site-accent)]">
                <span className="live-dot h-2 w-2 flex-none rounded-full bg-[var(--signal,#5FCBB0)]" aria-hidden="true" />
                Liputan langsung · diperbarui {formatTime(article.updatedAt)} WIB
              </p>
            ) : null}

            {templateId === 'geo-radar' ? (
              <p className="m-0 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--site-accent)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {article.categoryName ?? 'Wilayah'} · radar kewilayahan
              </p>
            ) : null}

            {templateId === 'columnist-opinion' ? (
              <div className="flex items-center gap-3 border-y border-hairline py-4">
                <Avatar className="h-12 w-12 flex-none rounded border border-hairline">
                  <AvatarFallback className="bg-bg-raised-2 font-mono text-sm font-semibold text-[var(--site-accent)]">
                    {(article.authorName ?? article.attribution).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-sm font-bold text-paper">
                    {article.authorName ?? article.attribution}
                  </p>
                  <p className="m-0 font-sans text-xs text-paper-faint">
                    Kolumnis · {formatDate(article.publishedAt, 'medium')} · {readingTime} mnt baca
                  </p>
                </div>
              </div>
            ) : null}

            {templateId !== 'columnist-opinion' && templateId !== 'minimal-press' && templateId !== 'multimedia-visual' ? (
              <CategoryMeta article={article} readingTime={readingTime} />
            ) : null}

            {templateId !== 'multimedia-visual' ? (
              <h1 className={`m-0 font-bold leading-tight tracking-tight text-balance text-paper ${templateId === 'editorial-magazine' ? 'font-serif text-4xl sm:text-5xl' : templateId === 'modern-tech' ? 'font-sans text-3xl sm:text-4xl' : 'font-serif text-3xl sm:text-4xl'}`}>
                {article.title}
              </h1>
            ) : (
              <h1 className="m-0 font-sans text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
                {article.title}
              </h1>
            )}

            {templateId === 'editorial-magazine' ? (
              <p className="m-0 font-serif text-lg italic leading-relaxed text-paper-dim">
                {article.description}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-hairline py-3">
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-xs">
                <span className="font-semibold text-paper">{article.attribution}</span>
                {article.publisherVerified ? (
                  <span className="inline-flex items-center gap-1 text-signal">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Terverifikasi</span>
                  </span>
                ) : null}
                {article.independent ? (
                  <span className="inline-flex items-center gap-1 text-[var(--site-accent)]">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Media independen</span>
                  </span>
                ) : null}
              </p>

              <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-paper-faint">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'full')}</time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  <span>{formatCompactViews(article.viewCount)} dibaca</span>
                </span>
                {article.updatedAt !== article.publishedAt ? (
                  <span className="inline-flex items-center gap-1.5">
                    <PenLine className="h-3 w-3" aria-hidden="true" />
                    <span>Diperbarui <time dateTime={article.updatedAt}>{formatDate(article.updatedAt, 'medium')}</time></span>
                  </span>
                ) : null}
              </p>
            </div>
          </header>
        ) : (
          <ArticleMetaStrip article={article} />
        )}

        {templateId !== 'multimedia-visual' ? (
          <div className="aspect-video overflow-hidden border border-hairline bg-bg-raised-2">
            <Image
              unoptimized={heroUnoptimized}
              src={heroImageSrc}
              alt={article.title}
              priority
              className="h-full w-full object-cover"
              width={article.imageWidth ?? 1200}
              height={article.imageHeight ?? 675}
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        ) : null}

        {templateId === 'columnist-opinion' ? (
          <p className="m-0 border-l-2 border-[var(--site-accent)] pl-4 font-serif text-lg italic leading-relaxed text-paper">
            {article.description}
          </p>
        ) : null}

        {article.tags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Topik artikel">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded border border-hairline bg-bg-raised px-2.5 py-1 font-mono text-[11px] text-paper-dim transition-colors duration-180 hover:border-[var(--site-accent)] hover:text-paper"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}

        <div className={bodyClass}>
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 16)}`} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 flex-none border border-hairline">
              {article.publisherName === null ? null : (
                <AvatarImage
                  src={article.publisherLogoUrl ?? MINISTRY_FALLBACK_LOGO_URL}
                  alt={`Logo ${article.attribution}`}
                />
              )}
              <AvatarFallback className="bg-bg-raised-2 font-mono text-sm font-semibold text-[var(--site-accent)]">
                {(article.authorName ?? article.attribution).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="m-0 truncate font-sans text-sm font-semibold text-paper">
                {article.authorName ?? article.attribution}
              </p>
              <p className="m-0 font-sans text-xs text-paper-faint">Penulis redaksi</p>
            </div>
          </div>
          {article.officialInstitution ? (
            <p className="m-0 inline-flex items-center gap-1.5 rounded border border-hairline bg-bg-raised px-3 py-2 font-sans text-xs text-paper-dim sm:justify-self-end">
              <ShieldCheck className="h-3.5 w-3.5 flex-none text-signal" aria-hidden="true" />
              <span>{article.officialInstitution}</span>
            </p>
          ) : null}
        </div>

        <ShareBox title={article.title} />

        {templateId === 'compact-stream' && related.length > 0 ? (
          <section aria-label="Pembaruan terkait" className="rounded border border-hairline bg-bg-raised p-5">
            <h2 className="m-0 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--site-accent)]">
              <Radio className="h-3.5 w-3.5" aria-hidden="true" />
              Pembaruan terkait
            </h2>
            <div className="mt-4">
              {related.map((item) => (
                <ArticleCard article={item} key={item.id} variant="timeline" />
              ))}
            </div>
          </section>
        ) : null}

        {templateId !== 'compact-stream' && related.length > 0 ? (
          <section aria-label="Artikel terkait" className="border-t border-hairline pt-8">
            <h2 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
              {templateId === 'columnist-opinion' ? 'Esai lain penulis' : 'Artikel terkait'}
            </h2>
            {relatedVariant === 'row' ? (
              <div className="mt-2 border-t border-hairline">
                {related.map((item) => (
                  <ArticleCard article={item} key={item.id} variant="row" />
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2">
                {related.map((item) => (
                  <ArticleCard article={item} key={item.id} variant={relatedVariant} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {newer !== null || older !== null ? (
          <nav aria-label="Navigasi artikel" className="grid gap-3 border-t border-hairline pt-8 sm:grid-cols-2">
            <div className="min-w-0">
              {newer !== null ? (
                <Link href={`/articles/${newer.slug}`} className="group block">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">← Lebih baru</span>
                  <span className="mt-1 block truncate font-sans text-sm font-medium text-paper group-hover:text-[var(--site-accent)]">
                    {newer.title}
                  </span>
                </Link>
              ) : null}
            </div>
            <div className="min-w-0 sm:text-right">
              {older !== null ? (
                <Link href={`/articles/${older.slug}`} className="group block">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">Lebih lama →</span>
                  <span className="mt-1 block truncate font-sans text-sm font-medium text-paper group-hover:text-[var(--site-accent)]">
                    {older.title}
                  </span>
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}

        <p className="m-0 font-sans text-xs leading-relaxed text-paper-faint">
          Menemukan pelanggaran pada artikel ini?{' '}
          <Link href={`/report?artikel=${encodeURIComponent(article.slug)}`} className="underline transition-colors duration-180 hover:text-paper">
            Laporkan konten
          </Link>{' '}
          — ditinjau paling lambat 1x24 jam.
        </p>

        <JsonLd schemas={seo.jsonLd} />
      </article>
    </NetworkTemplate>
  );
}

function ArticleBreadcrumb({ article, light = false }: { readonly article: NetworkArticle; readonly light?: boolean }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex flex-wrap items-center gap-1.5 font-mono text-xs ${light ? 'text-white/75' : 'text-paper-faint'}`}
    >
      <Link href="/" className={`transition-colors duration-180 ${light ? 'hover:text-white' : 'hover:text-[var(--site-accent)]'}`}>
        Beranda
      </Link>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      {article.categorySlug ? (
        <>
          <Link
            href={`/categories/${article.categorySlug}`}
            className={`transition-colors duration-180 ${light ? 'hover:text-white' : 'hover:text-[var(--site-accent)]'}`}
          >
            {article.categoryName}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </>
      ) : null}
      <span className={`max-w-xs truncate ${light ? 'text-white' : 'text-paper'}`} aria-current="page">{article.title}</span>
    </nav>
  );
}

function ArticleMetaStrip({ article }: { readonly article: NetworkArticle }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums text-paper-faint">
      <span className="font-medium text-paper-dim">{article.attribution}</span>
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'full')}</time>
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3 w-3" aria-hidden="true" />
        <span>{formatCompactViews(article.viewCount)} dibaca</span>
      </span>
      {article.publisherVerified ? (
        <span className="inline-flex items-center gap-1 text-signal">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Terverifikasi</span>
        </span>
      ) : null}
    </p>
  );
}
