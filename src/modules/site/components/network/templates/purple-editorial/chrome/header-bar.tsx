'use client';

import type { ReactNode } from 'react';

import { SiteHeaderBar, type SiteHeaderBarLayout } from '@/modules/site/components/network/ui/site-header-bar';
import type { SiteDrawerPlacement } from '@/modules/site/components/network/ui/site-mobile-sidebar';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

/**
 * Bar header PurpleEditorial: orkestrasi pencarian dan drawer milik template.
 *
 * @param brand - Elemen brand situs.
 * @param nav - Navigasi desktop.
 * @param sidebar - Navigasi seluler untuk drawer.
 * @param layout - Susunan baris header.
 * @param quickNav - Baris kanal geser seluler untuk varian masthead.
 * @param drawer - Posisi drawer seluler.
 * @returns Bar header interaktif.
 */
export function PurpleEditorialHeaderBar({
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
      inputId="purple-editorial-sidebar-search"
      searchSkin={PURPLE_EDITORIAL.searchPanel}
      layout={layout}
      quickNav={quickNav}
      drawer={drawer}
    />
  );
}
