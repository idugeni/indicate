import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, Eye, Rss, Zap } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { ARTICLE_FALLBACK_IMAGE_URL } from '@/ui/site/marketing-content';

export const TIME_ZONE_ID = 'Asia/Jakarta';

/**
 * Satu-satunya layout tenant yang diakui: Clean Blue Editorial.
 * Semua domain dipaksa sinkron ke template ini —
 * tidak ada cabang per-hostname, tidak ada CSS per-domain.
 */
export const TEMPLATE_IDS = [
  'clean-blue',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function normalizeTemplateId(raw: unknown): TemplateId {
  if (typeof raw === 'string' && (TEMPLATE_IDS as readonly string[]).includes(raw)) {
    return raw as TemplateId;
  }
  return 'clean-blue';
}

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
  /** Pagination (dipakai clean-blue; pola lain mengabaikan). */
  readonly page?: number | undefined;
  readonly basePath?: string | undefined;
}

/** ?page= → bilangan halaman ≥1 (default 1). */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, 1000) : 1;
}

export function getReadingTime(text: string): number {
  const words = text.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Tampilan ringkas id-ID: 999, 1,2 rb, 3,4 jt. */
export function formatCompactViews(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(Math.floor(value));
}

export function formatDate(isoString: string, dateStyle: 'medium' | 'full' = 'medium'): string {
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

export function formatTime(isoString: string): string {
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

export type CardVariant = 'standard' | 'row' | 'timeline' | 'visual' | 'flash';

/**
 * Aset lokal (`/brand/*`, `/assets/*`) stabil dan same-origin → lewat optimizer
 * Next (AVIF/WebP + resize). URL media tenant me-redirect 307 ke URL R2
 * bertanda tangan → tetap `unoptimized` agar tidak bergantung pada rantai
 * redirect yang kedaluwarsa.
 */
export function isLocalImageSrc(src: string): boolean {
  return src.startsWith('/');
}

export function CategoryMeta({ article, readingTime }: { readonly article: NetworkArticle; readonly readingTime: number }) {
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
  // Fallback visual bila berita tidak punya gambar utama.
  const imageSrc = article.imageUrl ?? ARTICLE_FALLBACK_IMAGE_URL;
  const thumbSrc = article.thumbnailUrl ?? imageSrc;

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
              href={`/${article.slug}`}
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
            {(article.authorDisplayName ?? article.authorName ?? article.attribution).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-paper-faint">
            <span className="uppercase tracking-wider text-[var(--site-accent)]">{article.categoryName ?? 'Opini'}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-paper-dim">{article.authorDisplayName ?? article.authorName ?? article.attribution}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={article.publishedAt} className="tabular-nums">{formatDate(article.publishedAt, 'medium')}</time>
          </p>
          <h3 className="m-0 mt-1.5 font-serif text-xl font-bold leading-snug tracking-tight text-paper">
            <Link
              href={`/${article.slug}`}
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
        <div className="media-frame aspect-[4/3] overflow-hidden border-b border-hairline bg-bg-raised-2">
          <Image
            unoptimized={!isLocalImageSrc(thumbSrc)}
            src={thumbSrc}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 900}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
            {article.viewCount > 0 ? <span> · {viewLabel} tontonan</span> : null}
          </p>
          <h3 className="m-0 mt-1.5 font-sans text-[15px] font-semibold leading-snug text-paper">
            <Link
              href={`/${article.slug}`}
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
              href={`/${article.slug}`}
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
        <div className="grid items-start gap-6 p-5 sm:p-6 md:grid-cols-2">
          <div className="media-frame aspect-video overflow-hidden rounded-md bg-bg-raised-2">
            <Image
              unoptimized={!isLocalImageSrc(imageSrc)}
              src={imageSrc}
              alt={article.title}
              priority
              className="h-full w-full object-cover"
              width={article.imageWidth ?? 1200}
              height={article.imageHeight ?? 675}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

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
                href={`/${article.slug}`}
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
      <div className="media-frame aspect-video overflow-hidden border-b border-hairline bg-bg-raised-2">
        <Image
          unoptimized={!isLocalImageSrc(thumbSrc)}
          src={thumbSrc}
          alt={article.title}
          loading="lazy"
          className="h-full w-full object-cover"
          width={article.imageWidth ?? 1200}
          height={article.imageHeight ?? 675}
          sizes="(max-width: 640px) 100vw, 50vw"
        />
      </div>

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
            href={`/${article.slug}`}
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

export function StatusLine({ count, title }: { readonly count: number; readonly title: string }) {
  return (
    <p className="sr-only" role="status">
      {count === 0
        ? `Tidak ada artikel pada ${title}.`
        : `Menampilkan ${count} artikel pada ${title}.`}
    </p>
  );
}

export function EmptyListing({ title }: { readonly title: string }) {
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

export function PopularAside({ articles }: { readonly articles: readonly NetworkArticle[] }) {
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
                href={`/${item.slug}`}
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

export function ChannelAside({ site }: { readonly site: NetworkSiteData }) {
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
