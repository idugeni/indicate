import 'server-only';

import { unstable_cache } from 'next/cache';

import { deliveryComposition } from '@/modules/delivery';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { categoryNav, type CategoryNavItem } from '@/modules/site/components/network/templates/clean-blue/lib/nav';

/**
 * Navigasi kategori yang IDENTIK di semua halaman (header + footer).
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas jumlah kanal.
 * @returns Navigasi eksplisit, kategori DB cached, atau derivasi artikel.
 */
export async function getSiteCategoryNav(site: NetworkSiteData, limit = 6): Promise<readonly CategoryNavItem[]> {
  if (site.settings.navigation.length > 0) {
    return site.settings.navigation.slice(0, limit).map((item) => ({ label: item.label, href: item.path }));
  }
  try {
    const { context } = site;
    const cached = unstable_cache(
      async () => (await deliveryComposition()).repository.loadSiteCategories(context),
      [`site-nav:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}:${context.contentVersion}`],
      {
        tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
        revalidate: 1800,
      },
    );
    const rows = await cached();
    if (rows.length > 0) {
      return rows.slice(0, limit).map((row) => ({ label: row.name, href: `/categories/${row.slug}` }));
    }
  } catch {
    /* fallback derivasi artikel di bawah */
  }
  return categoryNav(site, limit);
}
