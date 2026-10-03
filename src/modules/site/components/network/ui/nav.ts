import type { NetworkSiteData } from '@/modules/delivery/models';

export interface CategoryNavItem {
  readonly label: string;
  readonly href: string;
  readonly slug?: string | undefined;
}

/**
 * Maksimum kanal yang dirender navbar (3 inline + sisanya di "Lainnya").
 */
export const CATEGORY_NAV_LIMIT = 7;

/**
 * Maksimum kanal yang tampil inline di desktop sebelum masuk "Lainnya".
 */
export const CATEGORY_NAV_VISIBLE_COUNT = 3;

/**
 * Path daftar kanal A–Z penuh, selalu menjadi item terakhir navbar.
 */
export const CATEGORY_INDEX_HREF = '/indeks';

/**
 * Label daftar kanal A–Z penuh.
 */
export const CATEGORY_INDEX_LABEL = 'Indeks';

/**
 * Item "Indeks" yang menutup setiap navbar kategori.
 */
export const CATEGORY_INDEX_ITEM: CategoryNavItem = {
  label: CATEGORY_INDEX_LABEL,
  href: CATEGORY_INDEX_HREF,
  slug: 'indeks',
} as const;

const CATEGORY_DOT_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#78716c',
] as const;

/**
 * Turunkan slug kategori dari sebuah href navbar.
 *
 * @param href - Href navbar (`/categories/slug` atau path eksplisit).
 * @returns Slug tanpa awalan `/categories/` dan tanpa garis miring tepi.
 */
export function categorySlugFromHref(href: string): string {
  const trimmed = href.trim().toLowerCase();
  const withoutPrefix = trimmed.startsWith('/categories/')
    ? trimmed.slice('/categories/'.length)
    : trimmed.startsWith('/')
      ? trimmed.slice(1)
      : trimmed;
  return withoutPrefix.replace(/\/+$/u, '');
}

/**
 * Petakan slug ke satu warna dot yang stabil di semua portal dan template.
 *
 * @param slugOrHref - Slug kategori atau href navbar.
 * @returns Hex warna dari palet bersama.
 */
export function categoryDotColor(slugOrHref: string): string {
  const slug = categorySlugFromHref(slugOrHref).toLowerCase();
  let hash = 5381;
  for (let index = 0; index < slug.length; index += 1) {
    hash = ((hash << 5) + hash + slug.charCodeAt(index)) | 0;
  }
  const palette = CATEGORY_DOT_PALETTE;
  return palette[Math.abs(hash) % palette.length]!;
}

/**
 * Samakan perbandingan path aktif dengan toleransi garis miring tepi.
 *
 * @param path - Path halaman aktif.
 * @param href - Href item navbar.
 * @returns True saat keduanya menunjuk dokumen yang sama.
 */
export function isCategoryNavActive(path: string, href: string): boolean {
  const clean = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '/') return '/';
    return trimmed.replace(/\/+$/u, '');
  };
  return clean(path) === clean(href);
}

/**
 * Bagi kanal menjadi yang tampil inline dan yang masuk menu "Lainnya".
 *
 * @param items - Kanal navbar tanpa item Indeks.
 * @param visibleCount - Batas inline desktop.
 * @returns Pasangan visible dan overflow.
 */
export function splitCategoryNav(
  items: readonly CategoryNavItem[],
  visibleCount: number = CATEGORY_NAV_VISIBLE_COUNT,
): { readonly visible: readonly CategoryNavItem[]; readonly overflow: readonly CategoryNavItem[] } {
  return {
    visible: items.slice(0, visibleCount),
    overflow: items.slice(visibleCount),
  };
}

/**
 * Tambahkan item "Indeks" sebagai penutup navbar bila belum ada.
 *
 * @param items - Kanal navbar.
 * @returns Kanal plus "Indeks" di posisi terakhir.
 */
export function withCategoryIndex(items: readonly CategoryNavItem[]): readonly CategoryNavItem[] {
  if (items.some((item) => item.href === CATEGORY_INDEX_HREF)) return items;
  return [...items, CATEGORY_INDEX_ITEM];
}

/**
 * Turunkan navigasi kategori dari artikel tayang, terbesar dulu.
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas jumlah kanal.
 * @returns Daftar kanal unik terurut frekuensi artikel menurun.
 * @remarks Jalur degradasi, bukan sumber kebenaran. Dipakai hanya saat tabel
 * `categories` tidak terbaca atau kosong, dan karena `site.articles` hanya memuat
 * artikel halaman aktif, hasilnya bukan gambaran kanal tenant. Jangan dipakai untuk
 * klaim seperti "belum memiliki artikel".
 */
export function categoryNav(site: NetworkSiteData, limit = CATEGORY_NAV_LIMIT): readonly CategoryNavItem[] {
  if (site.settings.navigation.length > 0) {
    return site.settings.navigation
      .slice(0, limit)
      .map((item) => ({ label: item.label, href: item.path, slug: categorySlugFromHref(item.path) }));
  }
  const names = new Map<string, string>();
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  site.articles.forEach((article, index) => {
    if (article.categorySlug === null) return;
    if (!names.has(article.categorySlug)) {
      names.set(article.categorySlug, article.categoryName ?? article.categorySlug);
      firstSeen.set(article.categorySlug, index);
    }
    counts.set(article.categorySlug, (counts.get(article.categorySlug) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort(([slugA, countA], [slugB, countB]) => {
      if (countB !== countA) return countB - countA;
      const nameA = names.get(slugA) ?? slugA;
      const nameB = names.get(slugB) ?? slugB;
      const byName = nameA.localeCompare(nameB, 'id');
      if (byName !== 0) return byName;
      return (firstSeen.get(slugA) ?? 0) - (firstSeen.get(slugB) ?? 0);
    })
    .slice(0, limit)
    .map(([slug]) => ({ label: names.get(slug) ?? slug, href: `/categories/${slug}`, slug }));
}
