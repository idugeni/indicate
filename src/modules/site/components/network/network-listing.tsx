import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Rss,
  Search,
  ShieldCheck,
} from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { NETWORK_COLOR_PRESETS as NETWORK_COLOR_FALLBACK } from '@/ui/themes';
import { getColorPresets } from '@/modules/content/site-content';

const TIME_ZONE_ID = 'Asia/Jakarta';

function getReadingTime(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
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

export function ArticleCard({
  article,
  featured = false,
}: {
  readonly article: NetworkArticle;
  readonly featured?: boolean;
}) {
  const readingTime = getReadingTime(article.body || article.description || '');

  if (featured) {
    return (
      <article className="network-card group col-span-full">
        <div className="grid items-start gap-6 p-5 sm:p-6 md:grid-cols-2">
          <div className="media-frame aspect-video overflow-hidden rounded-md bg-bg-raised-2">
            {article.imageUrl ? (
              <Image
                src={article.imageUrl}
                alt={article.title}
                priority
                className="h-full w-full object-cover"
                width={article.imageWidth ?? 1200}
                height={article.imageHeight ?? 675}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-xs tracking-wider text-paper-faint">
                Naskah unggulan redaksi
              </div>
            )}
          </div>

          <div>
            <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
              <span className="text-brass">{article.categoryName ?? 'Berita Utama'}</span>
              <span aria-hidden="true" className="text-hairline-strong">·</span>
              <span className="flex items-center gap-1 normal-case tracking-normal text-paper-faint">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>{readingTime} mnt baca</span>
              </span>
            </p>

            <h2 className="m-0 mt-3 font-serif text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
              <Link
                href={`/articles/${article.slug}`}
                className="rounded-sm decoration-brass decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
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
      <div className="media-frame aspect-video overflow-hidden border-b border-hairline bg-bg-raised-2">
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 675}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[11px] tracking-wider text-paper-faint">
            {article.categoryName ?? 'Warta'}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="m-0 flex items-center justify-between gap-2 font-mono text-[11px]">
          <span className="uppercase tracking-wider text-brass">
            {article.categoryName ?? 'Warta Terkini'}
          </span>
          <span className="flex items-center gap-1 tabular-nums text-paper-faint">
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{readingTime} mnt</span>
          </span>
        </p>

        <h2 className="m-0 mt-2 font-serif text-lg font-bold leading-snug tracking-tight text-paper">
          <Link
            href={`/articles/${article.slug}`}
            className="rounded-sm decoration-brass decoration-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
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
  const templateId = site.settings.colors.templateId ?? 'portal-news';

  const siteInitial = (site.settings.name || 'P').trim().slice(0, 1).toUpperCase();

  const templateStyle: CSSProperties = {
    '--site-primary': primary,
    '--site-accent': accent,
    '--site-header-bg': headerBg,
  } as CSSProperties;

  return (
      <div
        className="network-shell min-h-screen bg-bg text-paper antialiased"
        data-template={templateId}
        style={templateStyle}
      >
        <a className="fixed left-4 top-[-5rem] z-50 rounded border border-hairline-strong bg-bg-raised-2 px-4 py-3 text-paper transition-[top] duration-180 focus:top-4" href="#main-content">
          Lewati ke konten
        </a>

        <div className="flex items-center justify-between border-b border-hairline px-6 py-1.5 font-mono text-[11px] text-paper-dim">
          <span className="truncate text-paper-faint">
            Kanal distribusi resmi · Jaringan sindikasi INDICATE
          </span>
          <span className="hidden flex-none items-center gap-1.5 text-signal md:flex">
            <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
            <span>Tersinkron</span>
          </span>
        </div>

        <header className="sticky top-0 z-30 border-b border-hairline bg-bg-raised">
          <Container className="flex items-center justify-between gap-6 py-3.5">
            <div className="network-brand flex items-center gap-3">
              {site.settings.logoUrl ? (
                <Image
                  src={site.settings.logoUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 rounded border border-hairline object-contain"
                  width={32}
                  height={32}
                />
              ) : (
                <Avatar className="h-8 w-8 rounded border border-hairline">
                  <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-bold text-brass">
                    {siteInitial}
                  </AvatarFallback>
                </Avatar>
              )}

              <Link href="/" aria-label={`${site.settings.name} beranda`} className="no-underline">
                <strong className="block font-sans text-base font-bold tracking-tight text-paper">
                  {site.settings.name}
                </strong>
                <small className="block max-w-md truncate font-sans text-xs text-paper-faint">
                  {site.settings.description}
                </small>
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
                    className="px-1 py-1 transition-colors duration-180 hover:text-brass-soft"
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
                className="flex items-center gap-1 transition-colors duration-180 hover:text-brass-soft"
              >
                <Rss className="h-3 w-3 text-brass" aria-hidden="true" />
                <span>Umpan RSS Sindikasi</span>
              </Link>
            </div>
          </Container>
        </footer>
      </div>
  );
}

export function ListingPage({
  site,
  title,
  description,
}: {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string;
}) {
  const seo = buildSeoDocument(site, { path: '/' });
  const featuredArticle = site.articles[0];
  const regularArticles = site.articles.slice(1);

  return (
    <NetworkTemplate site={site}>
      <section className="border-b border-hairline py-10 md:py-12">
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
        <p className="sr-only" role="status">
          {site.articles.length === 0
            ? `Tidak ada artikel pada ${title}.`
            : `Menampilkan ${site.articles.length} artikel pada ${title}.`}
        </p>
        <div className="grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_16rem]">
          <section className="space-y-10" aria-label={title}>
            {site.articles.length === 0 ? (
              <div
                className="rounded-lg border border-dashed border-hairline-strong p-8 text-center sm:p-12"
                role="status"
              >
                <h2 className="m-0 font-serif text-xl font-bold text-paper">
                  Belum ada laporan terbit
                </h2>
                <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-paper-dim">
                  Konten editorial untuk kanal ini sedang dalam antrean pemrosesan sinyal atau validasi redaksi.
                </p>
              </div>
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

          <aside className="space-y-5 border-t-2 border-[var(--site-accent)] pt-5" aria-label="Tentang kanal">
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
        </div>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}

export function ArticlePage({
  site,
  article,
}: {
  readonly site: NetworkSiteData;
  readonly article: NetworkArticle;
}) {
  const seo = buildSeoDocument(site, { path: `/articles/${article.slug}`, article });
  const readingTime = getReadingTime(article.body || '');
  const paragraphs = article.body.split(/\n{2,}/u).map((p) => p.trim()).filter(Boolean);

  return (
    <NetworkTemplate site={site}>
      <article className="mx-auto w-full max-w-3xl space-y-8 px-6 py-10 md:py-14">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 font-mono text-xs text-paper-faint"
        >
          <Link href="/" className="transition-colors duration-180 hover:text-brass-soft">
            Beranda
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          {article.categorySlug ? (
            <>
              <Link
                href={`/categories/${article.categorySlug}`}
                className="transition-colors duration-180 hover:text-brass-soft"
              >
                {article.categoryName}
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </>
          ) : null}
          <span className="max-w-xs truncate text-paper" aria-current="page">{article.title}</span>
        </nav>

        <header className="space-y-4">
          <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="text-brass">{article.categoryName ?? 'Berita Utama'}</span>
            <span aria-hidden="true" className="text-hairline-strong">·</span>
            <span className="flex items-center gap-1 normal-case tracking-normal text-paper-faint">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>{readingTime} mnt baca</span>
            </span>
          </p>

          <h1 className="m-0 font-serif text-3xl font-bold leading-tight tracking-tight text-balance text-paper sm:text-4xl">
            {article.title}
          </h1>

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
                <span className="inline-flex items-center gap-1 text-brass">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Media independen</span>
                </span>
              ) : null}
            </p>

            <p className="m-0 flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-paper-faint">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'full')}</time>
            </p>
          </div>
        </header>

        {article.imageUrl ? (
          <div className="aspect-video overflow-hidden border border-hairline bg-bg-raised-2">
            <Image
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

        <div className="article-body space-y-6 border-b border-hairline pb-12 font-serif text-base leading-[1.85] text-paper sm:text-lg">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 16)}`} className="m-0">
              {paragraph}
            </p>
          ))}
        </div>

        <JsonLd schemas={seo.jsonLd} />
      </article>
    </NetworkTemplate>
  );
}