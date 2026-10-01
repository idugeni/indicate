import 'server-only';

import { unstable_cache } from 'next/cache';

import { deliveryComposition } from '@/modules/delivery';
import type { NetworkSiteData } from '@/modules/delivery/models';
import {
  CATEGORY_NAV_LIMIT,
  categoryFrequencyRank,
  categoryNav,
  type CategoryNavItem,
} from '@/modules/site/components/network/ui/nav';

/**
 * Navigasi kategori yang IDENTIK di semua halaman (header + footer).
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas jumlah kanal.
 * @returns Navigasi eksplisit, kategori DB cached, atau derivasi artikel.
 * @remarks Kunci cache sengaja tanpa versi konten: kategori hanya berubah
 * lewat mutasi dashboard, dan setiap mutasi kategori merevalidasi tag
 * `org:` lewat DashboardCacheInvalidator — jadi TTL 24 jam di sini
 * hanyalah backstop, bukan jendela basi. Tanpa ini setiap
 * revalidasi 1800 detik mengulang baca `categories` ~22 ribu kali sehari.
 */
export async function getSiteCategoryNav(
  site: NetworkSiteData,
  limit = CATEGORY_NAV_LIMIT,
): Promise<readonly CategoryNavItem[]> {
  if (site.settings.navigation.length > 0) {
    return site.settings.navigation
      .slice(0, limit)
      .map((item) => ({ label: item.label, href: item.path }));
  }
  try {
    const { context } = site;
    const cached = unstable_cache(
      async () => (await deliveryComposition()).repository.loadSiteCategories(context, limit),
      [`site-nav:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}:${context.contentVersion}`],
      {
        tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
        revalidate: 86400,
      },
    );
    const rows = await cached();
    if (rows.length > 0) {
      const rank = categoryFrequencyRank(site);
      return [...rows]
        .slice(0, limit)
        .sort((rowA, rowB) => {
          const countA = rank.get(rowA.slug) ?? 0;
          const countB = rank.get(rowB.slug) ?? 0;
          if (countB !== countA) return countB - countA;
          const byName = rowA.name.localeCompare(rowB.name, 'id');
          if (byName !== 0) return byName;
          return rowA.slug.localeCompare(rowB.slug);
        })
        .map((row) => ({ label: row.name, href: `/categories/${row.slug}`, slug: row.slug }));
    }
  } catch {
    /* fallback derivasi artikel di bawah */
  }
  return categoryNav(site, limit);
}

/**
 * Daftar kanal A–Z penuh untuk halaman Indeks.
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas atas kanal; 200 menutup 64 kanal operator plus ruang tumbuh.
 * @returns Kanal aktif terurut nama, tanpa navigasi eksplisit.
 */
export async function getSiteCategoryIndex(
  site: NetworkSiteData,
  limit = 200,
): Promise<readonly CategoryNavItem[]> {
  try {
    const { context } = site;
    const cached = unstable_cache(
      async () => (await deliveryComposition()).repository.loadSiteCategories(context, limit),
      [`site-index:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}:${context.contentVersion}`],
      {
        tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
        revalidate: 86400,
      },
    );
    const rows = await cached();
    if (rows.length > 0) {
      return [...rows]
        .slice(0, limit)
        .sort((rowA, rowB) => {
          const byName = rowA.name.localeCompare(rowB.name, 'id');
          if (byName !== 0) return byName;
          return rowA.slug.localeCompare(rowB.slug);
        })
        .map((row) => ({ label: row.name, href: `/categories/${row.slug}`, slug: row.slug }));
    }
  } catch {
    /* fallback derivasi artikel di bawah */
  }
  return categoryNav(site, limit);
}
