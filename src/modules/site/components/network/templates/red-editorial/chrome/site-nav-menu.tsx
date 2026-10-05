'use client';

import { SiteDesktopNav, SiteMobileNav } from '@/modules/site/components/network/ui/site-nav-menu';
import type { CategoryNavItem } from '@/modules/site/components/network/ui/nav';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

const SKIN = { accent: RED_EDITORIAL.primary, tone: 'light' } as const;

/**
 * Navigasi desktop RedEditorial.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Nav desktop milik template.
 */
export function RedEditorialDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteDesktopNav categories={categories} path={path} skin={{ ...SKIN }} linkStyle="pill" />;
}

/**
 * Navigasi seluler RedEditorial untuk drawer.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Blok nav drawer milik template.
 */
export function RedEditorialMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteMobileNav categories={categories} path={path} skin={{ ...SKIN }} />;
}
