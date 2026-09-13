import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  MapPin,
  PenLine,
  Radio,
  Rss,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { BackToTop } from '@/modules/site/components/layout/back-to-top';
import { ShareBox } from '@/modules/site/components/network/share-box';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { MINISTRY_FALLBACK_LOGO_URL } from '@/ui/site/marketing-content';
import { NETWORK_COLOR_PRESETS as NETWORK_COLOR_FALLBACK } from '@/ui/themes';
import { getColorPresets } from '@/modules/content/site-content';

const TIME_ZONE_ID = 'Asia/Jakarta';

/**
 * Satu-satunya daftar layout tenant yang diakui (lih. docs/DESIGN.md §17).
 * Brand baru tinggal dipetakan via `site_settings.colors.templateId` —
 * tidak ada cabang per-hostname, tidak ada CSS per-domain di berkas ini.
 */
const TEMPLATE_IDS = [
  'portal-news',
  'broadsheet-classic',
  'columnist-opinion',
  'compact-stream',
  'editorial-magazine',
  'geo-radar',
  'minimal-press',
  'modern-tech',
  'multimedia-visual',
  'tabloid-express',
] as const;

type TemplateId = (typeof TEMPLATE_IDS)[number];

function normalizeTemplateId(raw: unknown): TemplateId {
  if (typeof raw === 'string' && (TEMPLATE_IDS as readonly string[]).includes(raw)) {
    return raw as TemplateId;
  }
  return 'portal-news';
}

function getReadingTime(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Tampilan ringkas id-ID: 999, 1,2 rb, 3,4 jt. */
export function formatCompactViews(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(Math.floor(value));
}

function formatDate(isoString: string, dateStyle: 'medium' | 'full' = 'medium'): string {
  try {
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle,
      timeZone: TIME_ZONE_ID,
    }).format(parsedDate);
  } catch {
    return isoString;
  }
}

function formatTime(isoString: string): string {
  try {
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: TIME_ZONE_ID,
    }).format(parsedDate);
  } catch {
    return isoString;
  }
}

type CardVariant = 'standard' | 'row' | 'timeline' | 'visual' | 'flash';

function CategoryMeta({ article, readingTime }: { readonly article: NetworkArticle; readonly readingTime: number }) {
  return (
    <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
      <span className="text-[var(--site-accent)]">{article.categoryName ?? 'Berita Utama'}</span>
      <span aria-hidden="true" className="text-hairline-strong">·</span>
      <span className="flex items-center gap-1 normal-case tracking-normal text-paper-faint">
        <Clock className="h-3 w-3" aria-hidden="true" />
        <span>{readingTime} mnt baca</span>
      </span>
    </p>
  );
}

export function ArticleCard({
  article,
  featured = false,
  variant = 'standard',
}: {
  readonly article: NetworkArticle;
  readonly featured?: boolean;
  readonly variant?: CardVariant;
}) {
  const readingTime = getReadingTime(article.body || article.description || '');
  const viewLabel = formatCompactViews(article.viewCount);

  if (variant === 'timeline') {
    return (
      <article className="timeline-item group grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <div className="flex flex-col items-center" aria-hidden="true">
          <span className="timeline-dot mt-1.5 h-2 w-2 flex-none rounded-full bg-[var(--site-accent)]" />
          <span className="w-px flex-1 bg-hairline" />
        </div>
        <div className="min-w-0 pb-5">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
            <time dateTime={article.publishedAt}>{formatTime(article.publishedAt)} WIB</time>
            <span aria-hidden="true">·</span>
            <span className="uppercase tracking-wider text-[var(--site-accent)]">{article.categoryName ?? 'Kilat'}</span>
          </p>
          <h3 className="m-0 mt-1 font-sans text-[15px] font-semibold leading-snug text-paper">
            <Link
              href={`/articles/${article.slug}`}
              className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-accent)]"
            >
              {article.title}
            </Link>
          </h3>
          <p className="m-0 mt-1 line-clamp-2 font-sans text-[13px] leading-relaxed text-paper-dim">
            {article.description}
          </p>
        </div>
      </article>
    );
  }

  if (variant === 'row') {
    return (
      <article className="row-card group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 border-b border-hairline py-5">
        <Avatar className="h-11 w-11 flex-none rounded border border-hairline">
          <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-bold text-[var(--site-accent)]">
            {(article.authorName ?? article.attribution).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-paper-faint">
            <span className="uppercase tracking-wider text-[var(--site-accent)]">{article.categoryName ?? 'Opini'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-paper-dim">{article.authorName ?? article.attribution}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt} className="tabular-nums">{formatDate(article.publishedAt, 'medium')}</time>
          </p>
          <h3 className="m-0 mt-1.5 font-serif text-xl font-bold leading-snug tracking-tight text-paper">
            <Link
              href={`/articles/${article.slug}`}
              className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-accent)]"
            >
              {article.title}
            </Link>
          </h3>
          <p className="m-0 mt-1.5 line-clamp-2 font-sans text-sm leading-relaxed text-paper-dim">
            {article.description}
          </p>
        </div>
      </article>
    );
  }

  if (variant === 'visual') {
    return (
      <article className="network-card visual-card group flex flex-col">
        {article.imageUrl ? (
          <div className="media-frame aspect-[4/3] overflow-hidden border-b border-hairline bg-bg-raised-2">
            <Image
              unoptimized
              src={article.thumbnailUrl ?? article.imageUrl}
              alt={article.title}
              loading="lazy"
              className="h-full w-full object-cover"
              width={article.imageWidth ?? 1200}
              height={article.imageHeight ?? 900}
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-4">
          <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
            {article.viewCount > 0 ? <span> · {viewLabel} tontonan</span> : null}
          </p>
          <h3 className="m-0 mt-1.5 font-sans text-[15px] font-semibold leading-snug text-paper">
            <Link
              href={`/articles/${article.slug}`}
              className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-accent)]"
            >
              {article.title}
            </Link>
          </h3>
        </div>
      </article>
    );
  }

  if (variant === 'flash') {
    return (
      <article className="network-card flash-card group flex min-w-0 flex-col">
        <div className="flex flex-1 flex-col p-4">
          <p className="m-0 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-[var(--site-primary)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              <Zap className="h-3 w-3" aria-hidden="true" />
              {article.categoryName ?? 'Kilat'}
            </span>
            <time dateTime={article.publishedAt} className="font-mono text-[11px] tabular-nums text-paper-faint">
              {formatTime(article.publishedAt)}
            </time>
          </p>
          <h3 className="m-0 mt-2 font-sans text-base font-bold leading-snug tracking-tight text-paper">
            <Link
              href={`/articles/${article.slug}`}
              className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-accent)]"
            >
              {article.title}
            </Link>
          </h3>
          <p className="m-0 mt-1.5 line-clamp-2 font-sans text-[13px] leading-relaxed text-paper-dim">
            {article.description}
          </p>
        </div>
      </article>
    );
  }

  if (featured) {
    return (
      <article className="network-card group col-span-full">
        <div className={`grid items-start gap-6 p-5 sm:p-6 ${article.imageUrl ? 'md:grid-cols-2' : ''}`}>
          {article.imageUrl ? (
            <div className="media-frame aspect-video overflow-hidden rounded-md bg-bg-raised-2">
              <Image
                unoptimized
                src={article.imageUrl}
                alt={article.title}
                priority
                className="h-full w-full object-cover"
                width={article.imageWidth ?? 1200}
                height={article.imageHeight ?? 675}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : null}

          <div>
            <CategoryMeta article={article} readingTime={readingTime} />
            {article.viewCount > 0 ? (
              <p className="m-0 mt-1.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-paper-faint">
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>{viewLabel} dibaca</span>
              </p>
            ) : null}

            <h2 className="m-0 mt-3 font-serif text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
              <Link
                href={`/articles/${article.slug}`}
                className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-accent)]"
              >
                {article.title}
              </Link>
            </h2>

            <p className="m-0 mt-3 line-clamp-3 font-sans text-sm leading-relaxed text-paper-dim">
              {article.description}
            </p>

            <p className="m-0 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline pt-3 font-mono text-[11px] text-paper-faint">
              <span className="font-medium text-paper-dim">{article.attribution}</span>
              <time dateTime={article.publishedAt} className="flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                <span>{formatDate(article.publishedAt, 'medium')}</span>
              </time>
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="network-card group flex flex-col">
      {article.imageUrl ? (
        <div className="media-frame aspect-video overflow-hidden border-b border-hairline bg-bg-raised-2">
          <Image
            unoptimized
            src={article.thumbnailUrl ?? article.imageUrl}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 675}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-5">
        <p className="m-0 flex items-center justify-between gap-2 font-mono text-[11px]">
          <span className="uppercase tracking-wider text-[var(--site-accent)]">
            {article.categoryName ?? 'Warta Terkini'}
          </span>
          <span className="flex items-center gap-1 tabular-nums text-paper-faint">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{readingTime} mnt</span>
          </span>
        </p>
        {article.viewCount > 0 ? (
          <p className="m-0 mt-1.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-paper-faint">
            <Eye className="h-3 w-3" aria-hidden="true" />
            <span>{viewLabel} dibaca</span>
          </p>
        ) : null}

        <h2 className="m-0 mt-2 font-serif text-lg font-bold leading-snug tracking-tight text-paper">
          <Link
            href={`/articles/${article.slug}`}
            className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--site-accent)]"
          >
            {article.title}
          </Link>
        </h2>

        <p className="m-0 mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-paper-dim">
          {article.description}
        </p>

        <p className="m-0 mt-4 flex items-center justify-between gap-2 border-t border-hairline pt-3 font-mono text-[11px] text-paper-faint">
          <span className="truncate pr-2">{article.attribution}</span>
          <time dateTime={article.publishedAt} className="flex-none tabular-nums">
            {formatDate(article.publishedAt, 'medium')}
          </time>
        </p>
      </div>
    </article>
  );
}

function EmptyListing({ title }: { readonly title: string }) {
  return (
    <div
      className="rounded border border-dashed border-hairline-strong p-8 text-center sm:p-12"
      role="status"
    >
      <h2 className="m-0 font-serif text-xl font-bold text-paper">
        Belum ada laporan terbit
      </h2>
      <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-paper-dim">
        Konten editorial untuk {title} sedang dalam antrean pemrosesan sinyal atau validasi redaksi.
      </p>
    </div>
  );
}

function PopularAside({ articles }: { readonly articles: readonly NetworkArticle[] }) {
  const popular = [...articles].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
  if (popular.length === 0) return null;
  return (
    <aside className="listing-aside space-y-5 rounded border border-hairline bg-bg-raised p-5" aria-label="Terpopuler">
      <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
        Terpopuler
      </h2>
      <ol className="m-0 list-none space-y-4 p-0">
        {popular.map((item, index) => (
          <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="font-mono text-xs font-bold tabular-nums text-[var(--site-accent)]" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <Link
                href={`/articles/${item.slug}`}
                className="block truncate font-sans text-sm font-medium text-paper hover:text-[var(--site-accent)]"
              >
                {item.title}
              </Link>
              <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
                {formatCompactViews(item.viewCount)} dibaca
              </p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function ChannelAside({ site }: { readonly site: NetworkSiteData }) {
  return (
    <aside className="listing-aside space-y-5 rounded border border-hairline bg-bg-raised p-5" aria-label="Tentang kanal">
      <div>
        <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
          Profil kanal
        </h2>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
          {site.settings.description}
        </p>
      </div>
      <Link
        href="/rss.xml"
        className="inline-flex w-full items-center justify-center gap-2 border border-hairline bg-transparent px-3 py-2 font-mono text-xs font-medium text-paper transition-colors duration-180 hover:border-[var(--site-accent)]"
      >
        <Rss className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Saluran RSS portal</span>
      </Link>
    </aside>
  );
}

export async function NetworkTemplate({
  site,
  children,
}: {
  readonly site: NetworkSiteData;
  readonly children: ReactNode;
}) {
  const presetId = site.settings.colors.presetId ?? 'emerald-forest';
  const presets = await getColorPresets();
  const matchedPreset = (presets.length > 0 ? presets : NETWORK_COLOR_FALLBACK).find((p) => p.id === presetId);

  const primary = site.settings.colors.primary ?? matchedPreset?.primary ?? '#0b5d4b';
  const accent = site.settings.colors.accent ?? matchedPreset?.accent ?? '#e9a23b';
  const headerBg = site.settings.colors.headerBg ?? matchedPreset?.headerBg ?? '#0e1320';
  const templateId = normalizeTemplateId(site.settings.colors.templateId);

  const siteInitial = (site.settings.name || 'P').trim().slice(0, 1).toUpperCase();

  const templateStyle: CSSProperties = {
    '--site-primary': primary,
    '--site-accent': accent,
    '--site-header-bg': headerBg,
  } as CSSProperties;

  const centeredMasthead = templateId === 'broadsheet-classic';

  return (
      <div
        className="network-shell min-h-screen bg-bg text-paper antialiased"
        data-template={templateId}
        style={templateStyle}
      >
        <a className="fixed left-4 top-[-5rem] z-50 rounded border border-hairline-strong bg-bg-raised-2 px-4 py-3 text-paper transition-[top] duration-180 focus:top-4" href="#main-content">
          Lewati ke konten
        </a>

        {site.context.regionId === null ? (
          <div className="flex items-center justify-between border-b border-hairline px-6 py-1.5 font-mono text-[11px] text-paper-dim">
            <span className="truncate text-paper-faint">
              Kanal distribusi resmi · Jaringan sindikasi INDICATE
            </span>
            <span className="hidden flex-none items-center gap-1.5 text-signal md:flex">
              <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
              <span>Tersinkron</span>
            </span>
          </div>
        ) : null}

        <header className="template-header sticky top-0 z-30 border-b border-hairline bg-bg-raised">
          <Container className={`flex items-center gap-6 py-3.5 ${centeredMasthead ? 'template-header--centered flex-col text-center' : 'justify-between'}`}>
            <div className="network-brand flex items-center gap-3">
              {site.settings.logoUrl ? (
                <Image
                  unoptimized
                  src={site.settings.logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 rounded border border-hairline object-contain"
                  width={32}
                  height={32}
                />
              ) : (
                <Avatar className="h-8 w-8 rounded border border-hairline">
                  <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-bold text-[var(--site-accent)]">
                    {siteInitial}
                  </AvatarFallback>
                </Avatar>
              )}

              <Link href="/" aria-label={`${site.settings.name} beranda`} className="no-underline">
                <strong className="block font-sans text-base font-bold tracking-tight text-paper">
                  {site.settings.name}
                </strong>
              </Link>
            </div>

            <nav aria-label="Navigasi utama" className="flex items-center gap-1">
              {site.settings.navigation.map((item) => (
                <Link
                  href={item.path}
                  key={`${item.path}:${item.label}`}
                  className="rounded px-2.5 py-1.5 font-sans text-xs font-medium text-paper-dim transition-colors duration-180 hover:bg-bg-raised-2 hover:text-paper"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/search"
                className="ml-2 inline-flex items-center gap-1.5 rounded border border-hairline bg-bg px-2.5 py-1.5 font-sans text-xs font-medium text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cari</span>
              </Link>
            </nav>
          </Container>
        </header>

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>

        <footer className="mt-16 border-t border-hairline bg-bg-raised py-12">
          <Container className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
              <div className="space-y-1">
                <strong className="block font-sans text-sm font-semibold tracking-tight text-paper">
                  {site.settings.name}
                </strong>
                <p className="m-0 max-w-lg font-sans text-xs leading-relaxed text-paper-dim">
                  {site.settings.description}
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs text-paper-dim">
                {Object.entries(site.settings.socialLinks).map(([name, href]) => (
                  <a
                    href={href}
                    key={name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1 py-1 transition-colors duration-180 hover:text-[var(--site-accent)]"
                  >
                    {name}
                    <span className="sr-only"> (tautan eksternal, membuka di tab baru)</span>
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-paper-faint">
              <small>© 2026 {site.settings.name} · Didukung Arsitektur Sindikasi INDICATE</small>
              <Link
                href="/rss.xml"
                className="flex items-center gap-1 transition-colors duration-180 hover:text-[var(--site-accent)]"
              >
                <Rss className="h-3 w-3 text-[var(--site-accent)]" aria-hidden="true" />
                <span>Umpan RSS Sindikasi</span>
              </Link>
            </div>
          </Container>
        </footer>
        <BackToTop />
      </div>
  );
}

function PortalNewsListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const featuredArticle = site.articles[0];
  const regularArticles = site.articles.slice(1);

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-12">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Warta & laporan berkala</p>
          <h1 className="m-0 mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        <div className="listing-grid grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_16rem]">
          <section className="space-y-10" aria-label={title}>
            {site.articles.length === 0 ? (
              <EmptyListing title={title} />
            ) : (
              <>
                {featuredArticle ? <ArticleCard article={featuredArticle} featured /> : null}
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
                  {regularArticles.map((article) => (
                    <ArticleCard article={article} key={article.id} />
                  ))}
                </div>
              </>
            )}
          </section>

          <ChannelAside site={site} />
        </div>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function StatusLine({ count, title }: { readonly count: number; readonly title: string }) {
  return (
    <p className="sr-only" role="status">
      {count === 0
        ? `Tidak ada artikel pada ${title}.`
        : `Menampilkan ${count} artikel pada ${title}.`}
    </p>
  );
}

function BroadsheetListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [lead, ...rest] = site.articles;
  const today = formatDate(new Date().toISOString(), 'full');

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b-4 border-double border-hairline-strong py-10 text-center md:py-12" aria-label="Masthead edisi">
        <Container>
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-paper-faint">
            Edisi {today} · {site.articles.length} laporan
          </p>
          <h1 className="m-0 mx-auto mt-3 max-w-3xl font-serif text-4xl font-black leading-none tracking-tight text-paper sm:text-5xl">
            {title}
          </h1>
          <p className="m-0 mx-auto mt-3 max-w-xl font-serif text-sm italic leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : (
          <div className="broadsheet-grid grid items-start gap-0 md:grid-cols-3">
            <section className="md:col-span-2 md:border-r md:border-hairline md:pr-8" aria-label={title}>
              {lead ? <ArticleCard article={lead} featured /> : null}
              <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2">
                {rest.map((article) => (
                  <ArticleCard article={article} key={article.id} />
                ))}
              </div>
            </section>
            <div className="mt-8 md:mt-0 md:pl-8">
              <PopularAside articles={site.articles} />
            </div>
          </div>
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function ColumnistListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-14">
        <Container className="max-w-3xl">
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Opini & esai redaksi</p>
          <h1 className="m-0 mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-5xl">
            {title}
          </h1>
          <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="max-w-3xl py-8">
        <StatusLine count={site.articles.length} title={title} />
        <section aria-label={title}>
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <div className="border-t border-hairline">
              {site.articles.map((article) => (
                <ArticleCard article={article} key={article.id} variant="row" />
              ))}
            </div>
          )}
        </section>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function CompactStreamListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const latest = site.articles[0];

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-6 md:py-8" aria-label="Status liputan langsung">
        <Container className="max-w-3xl">
          <p className="m-0 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--site-accent)]">
            <span className="live-dot h-2 w-2 flex-none rounded-full bg-[var(--signal,#5FCBB0)]" aria-hidden="true" />
            Liputan langsung
          </p>
          <h1 className="m-0 mt-2 font-sans text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
            {title}
          </h1>
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">
            {latest ? `Pembaruan terakhir ${formatTime(latest.publishedAt)} WIB · ` : null}
            {site.articles.length} pembaruan · {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="max-w-3xl py-6">
        <StatusLine count={site.articles.length} title={title} />
        <section aria-label={title}>
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <div>
              {site.articles.map((article) => (
                <ArticleCard article={article} key={article.id} variant="timeline" />
              ))}
            </div>
          )}
        </section>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function EditorialMagazineListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [cover, second, ...rest] = site.articles;

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-14" aria-label="Sampul edisi">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Majalah · {formatDate(new Date().toISOString(), 'medium')}</p>
          {cover?.imageUrl ? (
            <div className="media-frame mt-5 aspect-[21/9] overflow-hidden rounded bg-bg-raised-2">
              <Image
                unoptimized
                src={cover.imageUrl}
                alt={cover.title}
                priority
                className="h-full w-full object-cover"
                width={cover.imageWidth ?? 1600}
                height={cover.imageHeight ?? 686}
                sizes="100vw"
              />
            </div>
          ) : null}
          <h1 className="m-0 mt-6 max-w-4xl font-serif text-4xl font-black leading-[1.02] tracking-tight text-paper sm:text-6xl">
            {cover?.title ?? title}
          </h1>
          <p className="m-0 mt-4 max-w-2xl font-serif text-lg italic leading-relaxed text-paper-dim">
            {cover?.description ?? description ?? site.settings.description}
          </p>
          {cover ? (
            <p className="m-0 mt-4">
              <Link
                href={`/articles/${cover.slug}`}
                className="inline-flex items-center gap-1.5 rounded bg-[var(--site-primary)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Baca laporan sampul
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </Container>
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : (
          <div className="listing-grid grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="grid gap-x-6 gap-y-10 sm:grid-cols-2" aria-label={title}>
              {second ? <ArticleCard article={second} key={second.id} /> : null}
              {rest.map((article) => (
                <ArticleCard article={article} key={article.id} />
              ))}
            </section>
            <aside className="listing-aside space-y-5 rounded border border-hairline bg-bg-raised p-5" aria-label="Suara redaksi">
              <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                Suara redaksi
              </h2>
              <div className="space-y-4">
                {site.articles.slice(0, 4).map((item) => (
                  <div key={item.id} className="border-b border-hairline pb-4 last:border-0 last:pb-0">
                    <p className="m-0 font-serif text-base italic leading-snug text-paper">
                      <Link href={`/articles/${item.slug}`} className="hover:text-[var(--site-accent)]">
                        {item.title}
                      </Link>
                    </p>
                    <p className="m-0 mt-1 font-sans text-xs text-paper-faint">
                      {item.authorName ?? item.attribution} · {formatDate(item.publishedAt, 'medium')}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function GeoRadarListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const groups = new Map<string, NetworkArticle[]>();
  for (const article of site.articles) {
    const key = article.categoryName ?? 'Warta wilayah';
    const bucket = groups.get(key);
    if (bucket) bucket.push(article);
    else groups.set(key, [article]);
  }
  const groupEntries = [...groups.entries()].slice(0, 6);

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-12" aria-label="Radar wilayah">
        <Container>
          <p className="m-0 flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Radar wilayah
          </p>
          <h1 className="m-0 mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-hairline bg-hairline sm:grid-cols-3" role="list" aria-label="Kanal wilayah terpantau">
            {groupEntries.map(([name, items]) => (
              <div key={name} role="listitem" className="flex items-center gap-2.5 bg-bg-raised p-3">
                <span className="h-2 w-2 flex-none rounded-full bg-[var(--signal,#5FCBB0)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-[13px] font-semibold text-paper">{name}</p>
                  <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">{items.length} laporan</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="space-y-10 py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : (
          groupEntries.map(([name, items]) => (
            <section key={name} aria-label={`Wilayah ${name}`}>
              <h2 className="m-0 flex items-center gap-2 border-b border-hairline pb-2 font-mono text-xs font-bold uppercase tracking-wider text-paper">
                <MapPin className="h-3.5 w-3.5 text-[var(--site-accent)]" aria-hidden="true" />
                {name}
                <span className="font-normal tabular-nums text-paper-faint">· {items.length}</span>
              </h2>
              <div className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {items.slice(0, 6).map((article) => (
                  <ArticleCard article={article} key={article.id} />
                ))}
              </div>
            </section>
          ))
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function MinimalPressListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-8 md:py-10">
        <Container className="max-w-3xl">
          <p className="m-0 flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Siaran pers resmi
          </p>
          <h1 className="m-0 mt-2 font-sans text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
            {title}
          </h1>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="max-w-3xl py-6">
        <StatusLine count={site.articles.length} title={title} />
        <section aria-label={title}>
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <div className="border-t border-hairline">
              {site.articles.map((article) => (
                <article key={article.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-hairline py-4">
                  <div className="w-24 flex-none">
                    <p className="m-0 font-mono text-[11px] tabular-nums leading-relaxed text-paper-faint">
                      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                    </p>
                    <p className="m-0 mt-1 font-mono text-[11px] tabular-nums text-paper-faint">
                      {getReadingTime(article.body || article.description || '')} mnt
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="m-0">
                      <span className="inline-block rounded-sm border border-hairline bg-bg-raised-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                        {article.categoryName ?? 'Siaran pers'}
                      </span>
                    </p>
                    <h2 className="m-0 mt-1.5 font-sans text-base font-semibold leading-snug text-paper">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline"
                      >
                        {article.title}
                      </Link>
                    </h2>
                    <p className="m-0 mt-1 line-clamp-2 font-sans text-[13px] leading-relaxed text-paper-dim">
                      {article.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function ModernTechListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, sideA, sideB, ...rest] = site.articles;

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-8 md:py-10" aria-label="Sorotan teknologi">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Grid teknologi · {site.articles.length} artikel</p>
          <h1 className="sr-only">{title}</h1>
          {site.articles.length === 0 ? (
            <div className="mt-4"><EmptyListing title={title} /></div>
          ) : (
            <div className="bento-grid mt-5 grid items-stretch gap-4 lg:grid-cols-12">
              {hero ? (
                <article className="network-card bento-hero group grid overflow-hidden sm:grid-cols-2 lg:col-span-7">
                  {hero.imageUrl ? (
                    <div className="media-frame min-h-52 overflow-hidden bg-bg-raised-2">
                      <Image
                        unoptimized
                        src={hero.imageUrl}
                        alt={hero.title}
                        priority
                        className="h-full w-full object-cover"
                        width={hero.imageWidth ?? 1200}
                        height={hero.imageHeight ?? 675}
                        sizes="(max-width: 1024px) 100vw, 55vw"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-col justify-center p-6">
                    <p className="m-0">
                      <span className="inline-block bg-[var(--site-primary)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                        {hero.categoryName ?? 'Sorotan'}
                      </span>
                    </p>
                    <h2 className="m-0 mt-3 font-sans text-2xl font-bold leading-tight tracking-tight text-paper">
                      <Link href={`/articles/${hero.slug}`} className="hover:text-[var(--site-accent)]">
                        {hero.title}
                      </Link>
                    </h2>
                    <p className="m-0 mt-2 line-clamp-3 font-sans text-sm leading-relaxed text-paper-dim">
                      {hero.description}
                    </p>
                  </div>
                </article>
              ) : null}
              <div className="grid gap-4 lg:col-span-5">
                {sideA ? <ArticleCard article={sideA} key={sideA.id} variant="flash" /> : null}
                {sideB ? <ArticleCard article={sideB} key={sideB.id} variant="flash" /> : null}
              </div>
            </div>
          )}
          <p className="m-0 mt-4 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      {rest.length > 0 ? (
        <Container className="py-8">
          <StatusLine count={site.articles.length} title={title} />
          <section className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${title} — arsip`}>
            {rest.map((article) => (
              <ArticleCard article={article} key={article.id} />
            ))}
          </section>
        </Container>
      ) : null}

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function MultimediaVisualListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const gallery = site.articles.filter((a) => a.imageUrl !== null).slice(0, 8);
  const rest = site.articles.filter((a) => !gallery.some((g) => g.id === a.id));

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-8 md:py-10" aria-label="Galeri visual">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Galeri & dokumenter visual</p>
          <h1 className="m-0 mt-2 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
        {gallery.length > 0 ? (
          <div className="gallery-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2" role="list" aria-label="Sorotan foto">
            {gallery.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                role="listitem"
                className="group w-[78vw] max-w-md flex-none snap-start sm:w-[46vw] lg:w-[30vw]"
              >
                <span className="media-frame block aspect-video overflow-hidden rounded bg-bg-raised-2">
                  <Image
                    unoptimized
                    src={article.imageUrl!}
                    alt={article.title}
                    loading={gallery.indexOf(article) < 2 ? undefined : 'lazy'}
                    priority={gallery.indexOf(article) < 2}
                    className="h-full w-full object-cover"
                    width={article.imageWidth ?? 1200}
                    height={article.imageHeight ?? 675}
                    sizes="(max-width: 640px) 78vw, 30vw"
                  />
                </span>
                <span className="mt-2 block truncate font-sans text-sm font-semibold text-paper group-hover:text-[var(--site-accent)]">
                  {article.title}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-paper-faint">
                  {formatDate(article.publishedAt, 'medium')} · {formatCompactViews(article.viewCount)} tontonan
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : rest.length > 0 ? (
          <section className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${title} — arsip`}>
            {rest.map((article) => (
              <ArticleCard article={article} key={article.id} variant="visual" />
            ))}
          </section>
        ) : null}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

function TabloidExpressListing({ site, title, description, path, indexable }: { readonly site: NetworkSiteData; readonly title: string; readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined }) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [headline, ...rest] = site.articles;
  const ticker = site.articles.slice(0, 6);

  return (
    <NetworkTemplate site={site}>
      <section className="tabloid-banner border-b border-hairline bg-[var(--site-primary)] py-10 md:py-14" aria-label="Headline kilat">
        <Container>
          <p className="m-0 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/85">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Kilat · {formatDate(new Date().toISOString(), 'medium')}
          </p>
          <h1 className="m-0 mt-3 max-w-4xl font-sans text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            {headline?.title ?? title}
          </h1>
          <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-relaxed text-white/85">
            {headline?.description ?? description ?? site.settings.description}
          </p>
          {headline ? (
            <p className="m-0 mt-5">
              <Link
                href={`/articles/${headline.slug}`}
                className="inline-flex items-center gap-1.5 rounded bg-white px-4 py-2.5 font-sans text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Baca kilat
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </Container>
      </section>

      {ticker.length > 1 ? (
        <div className="border-b border-hairline bg-bg-raised" aria-label="Kabar kilat berikutnya">
          <Container className="no-scrollbar flex gap-6 overflow-x-auto py-2.5">
            {ticker.slice(1).map((item) => (
              <Link
                key={item.id}
                href={`/articles/${item.slug}`}
                className="flex flex-none items-center gap-2 font-mono text-xs text-paper-dim hover:text-paper"
              >
                <Zap className="h-3 w-3 flex-none text-[var(--site-accent)]" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.title}</span>
              </Link>
            ))}
          </Container>
        </div>
      ) : null}

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {rest.length === 0 && !headline ? (
          <EmptyListing title={title} />
        ) : (
          <section className="flash-rail no-scrollbar grid auto-cols-[minmax(16rem,20rem)] grid-flow-col gap-4 overflow-x-auto pb-2 lg:grid-flow-row lg:grid-cols-3 lg:auto-cols-auto lg:overflow-visible" aria-label={title}>
            {rest.map((article) => (
              <ArticleCard article={article} key={article.id} variant="flash" />
            ))}
          </section>
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

export function ListingPage({
  site,
  title,
  description,
  path = '/',
  indexable = true,
}: {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined; readonly path?: string | undefined; readonly indexable?: boolean | undefined;
}) {
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

      {templateId === 'multimedia-visual' && article.imageUrl ? (
        <div className="border-b border-hairline bg-black">
          <Container className="py-6">
            <ArticleBreadcrumb article={article} />
            <div className="media-frame mt-4 aspect-video overflow-hidden rounded bg-bg-raised-2">
              <Image
                unoptimized
                src={article.imageUrl}
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
        {templateId !== 'tabloid-express' && !(templateId === 'multimedia-visual' && article.imageUrl) ? (
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

        {templateId !== 'multimedia-visual' && article.imageUrl ? (
          <div className="aspect-video overflow-hidden border border-hairline bg-bg-raised-2">
            <Image
              unoptimized
              src={article.imageUrl}
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
