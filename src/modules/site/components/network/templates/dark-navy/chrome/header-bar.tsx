'use client';

import type { ReactNode } from 'react';

import { SiteHeaderBar, type SiteHeaderBarLayout } from '@/modules/site/components/network/ui/site-header-bar';
import type { SiteDrawerPlacement } from '@/modules/site/components/network/ui/site-mobile-sidebar';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

/**
 * Bar header DarkNavy: orkestrasi pencarian dan drawer milik template.
 *
 * @param brand - Elemen brand situs.
 * @param nav - Navigasi desktop.
 * @param sidebar - Navigasi seluler untuk drawer.
 * @param layout - Susunan baris header.
 * @param quickNav - Baris kanal geser seluler untuk varian masthead.
 * @param drawer - Posisi drawer seluler.
 * @returns Bar header interaktif.
 */
export function DarkNavyHeaderBar({
  brand,
  nav,
  sidebar,
  layout = 'row',
  quickNav,
  drawer = 'right',
}: {
  readonly brand: ReactNode;
  readonly nav: ReactNode;
  readonly sidebar: ReactNode;
  readonly layout?: SiteHeaderBarLayout;
  readonly quickNav?: ReactNode;
  readonly drawer?: SiteDrawerPlacement;
}) {
  return (
    <SiteHeaderBar
      brand={brand}
      nav={nav}
      sidebar={sidebar}
      inputId="dark-navy-sidebar-search"
      searchSkin={DARK_NAVY.searchPanel}
      layout={layout}
      quickNav={quickNav}
      drawer={drawer}
    />
  );
}
