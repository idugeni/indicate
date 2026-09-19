import type { NetworkSiteData } from '@/modules/delivery/models';

export interface CategoryNavItem {
  readonly label: string;
  readonly href: string;
}

/**
 * Turunkan navigasi kategori dari artikel tayang.
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas jumlah kanal.
 * @returns Daftar kanal unik berurutan kemunculan.
 */
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
