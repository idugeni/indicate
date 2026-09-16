import type { ReactNode } from 'react';

import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';

/**
 * Palet mandiri Clean Blue Editorial — ditanggung template langsung, bukan
 * `site_settings.colors`. Disengaja mengabaikan variabel `--site-*` agar
 * tampil persis seperti contoh dalam segala kondisi.
 */
export const CLEAN_BLUE = {
  primary: '#1a5fd0',
  primaryDark: '#155cb8',
  primarySoft: '#e8f0fe',
  ink: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  canvas: '#f5f8fd',
  card: '#ffffff',
  ring: '#e2e8f0',
} as const;

/** Badge kategori berwarna (disiklus per indeks). */
const BADGE_STYLES = [
  { color: '#15803d', backgroundColor: '#dcfce7' },
  { color: '#6d28d9', backgroundColor: '#ede9fe' },
  { color: '#c2410c', backgroundColor: '#ffedd5' },
  { color: '#1d4ed8', backgroundColor: '#dbeafe' },
] as const;

export function badgeStyle(index: number): { readonly color: string; readonly backgroundColor: string } {
  const pick = BADGE_STYLES[index % BADGE_STYLES.length] ?? BADGE_STYLES[0];
  return { color: pick.color, backgroundColor: pick.backgroundColor };
}

export function articleImage(article: NetworkArticle): string {
  return article.thumbnailUrl ?? article.imageUrl ?? '/assets/article-fallback.png';
}

export function isLocalImageSrc(src: string): boolean {
  return src.startsWith('/');
}

/** Jam ticker gaya contoh (JJ:MM, tanpa detik). */
export function tickerTime(isoString: string): string {
  try {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) return isoString;
    const parts = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).formatToParts(parsed);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
    return `${hour}.${minute}`;
  } catch {
    return isoString;
  }
}

export function readingMinutes(article: NetworkArticle): number {
  const words = (article.body || article.description || '').trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Tampilan ringkas id-ID: 999, 1,2 rb, 3,4 jt. Selalu tampil (termasuk nol). */
export function formatCompactViews(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(Math.floor(value));
}

/** Nama penulis dengan fallback atribusi redaksi. */
export function authorDisplayName(article: NetworkArticle): string {
  return article.authorDisplayName ?? article.authorName ?? article.attribution;
}

/** Tanggal ringkas id-ID gaya contoh ("14 Sep 2026"). */
export function formatDate(isoString: string, dateStyle: 'medium' | 'full' = 'medium'): string {
  try {
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle,
      timeZone: 'Asia/Jakarta',
    }).format(parsedDate);
  } catch {
    return isoString;
  }
}

export interface ListingProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/** Penampung konten selebar contoh (max-6xl). */
export function CleanBlueContainer({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

/** Pengumuman jumlah artikel untuk pembaca layar (paritas pola lain). */
export function CleanBlueStatusLine({ count, title }: { readonly count: number; readonly title: string }) {
  return (
    <p className="sr-only" role="status">
      {count === 0
        ? `Tidak ada artikel pada ${title}.`
        : `Menampilkan ${count} artikel pada ${title}.`}
    </p>
  );
}

export function CleanBlueEmpty({ title }: { readonly title: string }) {
  return (
    <div
      className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12"
      role="status"
    >
      <h2 className="m-0 font-sans text-xl font-bold text-slate-900">
        Belum ada laporan terbit
      </h2>
      <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-slate-600">
        Konten editorial untuk {title} sedang dalam antrean pemrosesan sinyal atau validasi redaksi.
      </p>
    </div>
  );
}

export interface CategoryNavItem {
  readonly label: string;
  readonly href: string;
}

/** Navigasi gaya contoh (Beranda + kategori): pakai navigasi situs bila diisi,
 *  bila kosong diturunkan dari kategori artikel yang tayang. */
export function categoryNav(site: NetworkSiteData, limit = 6): readonly CategoryNavItem[] {
  if (site.settings.navigation.length > 0) {
    return site.settings.navigation.slice(0, limit).map((item) => ({ label: item.label, href: item.path }));
  }
  const seen = new Map<string, string>();
  for (const article of site.articles) {
    if (article.categorySlug === null || seen.has(article.categorySlug)) continue;
    seen.set(article.categorySlug, article.categoryName ?? article.categorySlug);
    if (seen.size >= limit) break;
  }
  return [...seen.entries()].map(([slug, name]) => ({ label: name, href: `/categories/${slug}` }));
}
