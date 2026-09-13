import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';

/**
 * Palet mandiri Clean Blue Editorial — ditanggung template langsung, bukan
 * `site_settings.colors`. Disengaja mengabaikan variabel `--site-*` agar
 * tampil persis seperti contoh dalam segala kondisi.
 */
export const CLEAN_BLUE = {
  primary: '#1f6feb',
  primaryDark: '#1a5fd0',
  primarySoft: '#e8f0fe',
  ink: '#0f172a',
  muted: '#64748b',
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
