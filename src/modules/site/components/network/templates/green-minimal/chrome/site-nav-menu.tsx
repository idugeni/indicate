'use client';

import { SiteDesktopNav, SiteMobileNav } from '@/modules/site/components/network/ui/site-nav-menu';
import type { CategoryNavItem } from '@/modules/site/components/network/ui/nav';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

const SKIN = { accent: GREEN_MINIMAL.primary, tone: 'light' } as const;

/**
 * Navigasi desktop GreenMinimal.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Nav desktop milik template.
 */
export function GreenMinimalDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteDesktopNav categories={categories} path={path} skin={{ ...SKIN }} linkStyle="underline" />;
}

/**
 * Navigasi seluler GreenMinimal untuk drawer.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @returns Blok nav drawer milik template.
 */
export function GreenMinimalMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return <SiteMobileNav categories={categories} path={path} skin={{ ...SKIN }} />;
}
