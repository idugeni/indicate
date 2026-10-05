'use client';

import { SiteDesktopNav, SiteMobileNav } from '@/modules/site/components/network/ui/site-nav-menu';
import type { CategoryNavItem } from '@/modules/site/components/network/ui/nav';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

const SKIN = { accent: GLASSY_BLUE.primary, tone: 'light' } as const;

/**
 * Navigasi desktop GlassyBlue.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Nav desktop milik template.
 */
export function GlassyBlueDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteDesktopNav categories={categories} path={path} skin={{ ...SKIN }} linkStyle="pill" />;
}

/**
 * Navigasi seluler GlassyBlue untuk drawer.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Blok nav drawer milik template.
 */
export function GlassyBlueMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteMobileNav categories={categories} path={path} skin={{ ...SKIN }} />;
}
