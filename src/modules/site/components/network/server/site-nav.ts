import 'server-only';

import { unstable_cache } from 'next/cache';

import { deliveryComposition } from '@/modules/delivery';
import type { NetworkSiteData } from '@/modules/delivery/models';
import type { SiteCategory } from '@/modules/delivery/ports';
import {
  CATEGORY_NAV_LIMIT,
  categoryNav,
  type CategoryNavItem,
} from '@/modules/site/components/network/ui/nav';

/**
 * Plafon entri cache navigasi. Semua limit di bawahnya membaca satu entri yang
 * sama lalu dipotong di memori, jadi header (7) dan footer (6) tidak menambah
 * round-trip maupun biaya cache. Limit di atas plafon memakai entri sendiri —
 * tanpa itu pemanggil besar akan ikut terpotong diam-diam.
 */
const NAV_CACHE_LIMIT = CATEGORY_NAV_LIMIT;

/**
 * Baca kanal aktif tenant beserta jumlah artikelnya lewat cache bersama.
 *
 * @param site - Data situs tenant aktif.
 * @param scope - Pemanggil logis; wajib berbeda agar dua navigasi tidak berbagi entri.
 * @param limit - Batas baris yang benar-benar diambil, dan ikut jadi bagian key.
 * @returns Baris kanal sesuai urutan stabil.
 * @remarks `limit` **wajib** ada di `keyParts`. `unstable_cache` menyusun key dari
 * `cb.toString()` + `keyParts` saja
 * (`node_modules/next/dist/server/web/spec-extension/unstable-cache.js`), bukan dari
 * argumen runtime; `limit` yang hanya tertangkap di closure membuat navigasi header
 * dan halaman indeks saling menimpa dalam 24 jam.
 * @remarks Tanpa cache ini setiap revalidasi 1800 detik mengulang baca `categories`
 * ~22 ribu kali sehari. TTL 24 jam hanyalah backstop: kategori hanya berubah lewat
 * mutasi dashboard, dan tiap mutasi merevalidasi tag `org:`.
 */
async function readCachedCategories(site: NetworkSiteData, scope: 'nav' | 'index', limit: number): Promise<readonly SiteCategory[]> {
  const { context } = site;
  const cached = unstable_cache(
    async () => (await deliveryComposition()).repository.loadSiteCategories(context, limit),
    [`site-${scope}-channels:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}:${context.contentVersion}:${limit}`],
    {
      tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
      revalidate: 86400,
    },
  );
  return cached();
}

/**
 * Urut A–Z stabil, diputuskan di sini dan bukan dari collation SQL supaya tetap
 * deterministik meski collation Postgres atau urutan baris berubah.
 */
function compareCategoryRows(rowA: SiteCategory, rowB: SiteCategory): number {
  const byLabel = rowA.name.localeCompare(rowB.name, 'id');
  return byLabel !== 0 ? byLabel : rowA.slug.localeCompare(rowB.slug);
}

function toNavItems(rows: readonly SiteCategory[], limit: number): readonly CategoryNavItem[] {
  return [...rows]
    .slice(0, limit)
    .sort(compareCategoryRows)
    .map((row) => ({ label: row.name, href: `/categories/${row.slug}`, slug: row.slug }));
}

/**
 * Kanal aktif beserta jumlah artikelnya, untuk sitemap.
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas atas kanal.
 * @returns Kanal aktif terurut nama beserta `articleCount` dan `lastUpdatedAt`.
 * @remarks Sengaja memakai scope `index` yang sama dengan halaman Indeks, jadi
 * sitemap tidak menambah satu pun query: keduanya membaca entri cache yang sama.
 * Fallback ke `site.articles` hanya berlaku saat DB tidak terbaca; di steady state
 * jalur DB yang dipakai.
 */
export async function getSiteCategoryChannels(
  site: NetworkSiteData,
  limit = 200,
): Promise<readonly SiteCategory[]> {
  try {
    const rows = await readCachedCategories(site, 'index', limit);
    if (rows.length > 0) return [...rows].sort(compareCategoryRows);
  } catch {
    /* fallback derivasi artikel di bawah */
  }
  const totals = new Map<string, { name: string; articleCount: number; lastUpdatedAt: string }>();
  for (const article of site.articles) {
    if (article.categorySlug === null) continue;
    const seen = totals.get(article.categorySlug);
    totals.set(article.categorySlug, {
      name: article.categoryName ?? article.categorySlug,
      articleCount: (seen?.articleCount ?? 0) + 1,
      lastUpdatedAt: seen === undefined || article.updatedAt > seen.lastUpdatedAt ? article.updatedAt : seen.lastUpdatedAt,
    });
  }
  return [...totals.entries()]
    .map(([slug, value]) => ({ slug, name: value.name, articleCount: value.articleCount, lastUpdatedAt: value.lastUpdatedAt }))
    .sort(compareCategoryRows)
    .slice(0, limit);
}

/**
 * Navigasi kategori yang IDENTIK di semua halaman (header + footer).
 *
 * @param site - Data situs tenant aktif.
 * @param limit - Batas jumlah kanal.
 * @returns Navigasi eksplisit, kategori DB cached, atau derivasi artikel.
 * @remarks Urutan kanal **tidak pernah** memakai `site.articles`: field itu hanya
 * memuat artikel halaman yang sedang dirender, bukan seluruh tenant. Memakainya
 * sebagai peringkat membuat urutan navigasibergeser tergantung halaman mana yang
 * pertama mengisi cache, lalu terkunci 24 jam. Kanal aktif dibaca dari DB dengan
 * urut A–Z; operator yang ingin urutan sendiri mengisi `site.settings.navigation`.
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
    const cacheLimit = limit <= NAV_CACHE_LIMIT ? NAV_CACHE_LIMIT : limit;
    const rows = await readCachedCategories(site, 'nav', cacheLimit);
    if (rows.length > 0) return toNavItems(rows, limit);
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
 * @remarks Scope cache terpisah dari navigasi, dan limit ikut di key: tanpa itu
 * halaman indeks menerima 7 baris navigasi dan diam-diam melaporkan sisanya sebagai
 * kanal tanpa artikel.
 */
export async function getSiteCategoryIndex(
  site: NetworkSiteData,
  limit = 200,
): Promise<readonly CategoryNavItem[]> {
  try {
    const rows = await readCachedCategories(site, 'index', limit);
    if (rows.length > 0) return toNavItems(rows, limit);
  } catch {
    /* fallback derivasi artikel di bawah */
  }
  return categoryNav(site, limit);
}