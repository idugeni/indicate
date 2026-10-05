'use client';

import { SiteDesktopNav, SiteMobileNav } from '@/modules/site/components/network/ui/site-nav-menu';
import type { CategoryNavItem } from '@/modules/site/components/network/ui/nav';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';

const SKIN = { accent: SOFT_BLUE.primary, tone: 'light' } as const;

/**
 * Navigasi desktop SoftBlue.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Nav desktop milik template.
 */
export function SoftBlueDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteDesktopNav categories={categories} path={path} skin={{ ...SKIN }} linkStyle="pill" />;
}

/**
 * Navigasi seluler SoftBlue untuk drawer.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Blok nav drawer milik template.
 */
export function SoftBlueMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteMobileNav categories={categories} path={path} skin={{ ...SKIN }} />;
}
