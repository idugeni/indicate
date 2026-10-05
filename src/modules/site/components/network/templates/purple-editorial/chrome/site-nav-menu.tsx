'use client';

import { SiteDesktopNav, SiteMobileNav } from '@/modules/site/components/network/ui/site-nav-menu';
import type { CategoryNavItem } from '@/modules/site/components/network/ui/nav';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

const SKIN = { accent: PURPLE_EDITORIAL.primary, tone: 'light' } as const;

/**
 * Navigasi desktop PurpleEditorial.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Nav desktop milik template.
 */
export function PurpleEditorialDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteDesktopNav categories={categories} path={path} skin={{ ...SKIN }} linkStyle="pill" />;
}

/**
 * Navigasi seluler PurpleEditorial untuk drawer.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Blok nav drawer milik template.
 */
export function PurpleEditorialMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteMobileNav categories={categories} path={path} skin={{ ...SKIN }} />;
}
