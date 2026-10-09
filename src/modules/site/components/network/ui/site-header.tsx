import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { SiteHeaderBar } from '@/modules/site/components/network/ui/site-header-bar';
import { SiteDesktopNav, SiteMobileNav, SiteMobileNavGrid, SiteMobileNavLarge, SiteQuickNav } from '@/modules/site/components/network/ui/site-nav-menu';
import { SiteTopBar } from '@/modules/site/components/network/ui/site-top-bar';
import { getSiteCategoryNav } from '@/modules/site/components/network/server/site-nav';

/** Varian navbar yang disepakati dari 6 mockup. */
export type SiteHeaderVariant = 'slim' | 'double' | 'centered' | 'masthead' | 'floating' | 'underline';

export interface SiteHeaderSearchSkin {
  readonly panelBorder: string;
  readonly panelBackground: string;
  readonly inputId: string;
}

/** Varian drawer seluler per template: posisi dan presentasi nav. */
export type SiteDrawerVariant = 'right' | 'left' | 'bottom' | 'full' | 'grid';

/** Skin minimal agar 10 template berbagi 1 mode tanpa cabang warna per template. */
export interface SiteHeaderSkin {
  readonly accent: string;
  readonly primaryDark: string;
  readonly primarySoft: string;
  readonly tone: 'light' | 'dark';
  readonly scheme: 'light' | 'dark';
  readonly faint: string;
  readonly card: string;
  readonly canvas: string;
  readonly ring: string;
  readonly onPrimary?: string | undefined;
  readonly ink: string;
  readonly muted: string;
  readonly searchPanel: SiteHeaderSearchSkin;
}

interface SiteHeaderProps {
  readonly variant: SiteHeaderVariant;
  readonly drawer: SiteDrawerVariant;
  readonly site: NetworkSiteData;
  readonly path?: string;
  readonly skin: SiteHeaderSkin;
  readonly templateId: string;
}

/**
 * Satu mode navbar untuk 10 template.
 *
 * @param variant - Salah satu dari 6 gaya mockup yang disetujui.
 * @param drawer - Varian drawer seluler per template.
 * @param site - Data situs tenant aktif.
 * @param path - Path aktif untuk status navigasi.
 * @param skin - Warna dan skin panel dari tema template.
 * @param templateId - Id template untuk keunikan id input pencarian.
 * @returns Header server sesuai varian.
 */
export async function SiteHeader({ variant, drawer, site, path = '/', skin, templateId }: SiteHeaderProps) {
  const nav = await getSiteCategoryNav(site);
  const showRegion =
    site.regionName !== null &&
    site.regionName !== undefined &&
    site.regionName !== '' &&
    !site.settings.name.toLowerCase().includes(site.regionName.toLowerCase());
  const brand = <Brand site={site} showRegion={showRegion} skin={skin} large={variant === 'masthead'} />;
  const sidebarId = `${templateId}-sidebar-search`;
  // The drawer is portaled to document.body, outside the template shell that
  // normally provides these inherited CSS variables. Re-apply the active
  // template palette at the portal boundary so all 10 skins remain intact.
  const sidebarThemeStyle = {
    '--tpl-primary': skin.accent,
    '--tpl-primary-dark': skin.primaryDark,
    '--tpl-primary-soft': skin.primarySoft,
    '--tpl-ink': skin.ink,
    '--tpl-muted': skin.muted,
    '--tpl-faint': skin.faint,
    '--tpl-card': skin.card,
    '--tpl-canvas': skin.canvas,
    '--tpl-ring': skin.ring,
    '--tpl-on-primary': skin.onPrimary ?? (skin.tone === 'dark' ? skin.ink : '#ffffff'),
    '--tpl-scheme': skin.scheme,
    colorScheme: skin.scheme,
  } as CSSProperties;
  const sidebar =
    drawer === 'full' ? (
      <SiteMobileNavLarge categories={nav} path={path} skin={skin} />
    ) : drawer === 'grid' ? (
      <SiteMobileNavGrid categories={nav} path={path} skin={skin} />
    ) : (
      <SiteMobileNav categories={nav} path={path} skin={skin} />
    );
  const placement = drawer === 'grid' ? 'right' : drawer;
  switch (variant) {
    case 'double':
      return (
        <>
          <SiteTopBar site={site} surface={`${skin.accent}0D`} ring={skin.ring} ink={skin.ink} muted={skin.muted} />
          <header className="sticky top-0 z-40" style={{ backgroundColor: skin.card, borderBottom: `1px solid ${skin.ring}` }}>
            <SiteHeaderBar
              brand={brand}
              nav={<SiteDesktopNav categories={nav} path={path} skin={skin} linkStyle="pill" />}
              sidebar={sidebar}
              inputId={sidebarId}
              searchSkin={skin.searchPanel}
              sidebarThemeStyle={sidebarThemeStyle}
              drawer={placement}
              layout="row"
            />
          </header>
        </>
      );
    case 'centered':
      return (
        <header className="sticky top-0 z-40" style={{ backgroundColor: skin.card, borderBottom: `1px solid ${skin.ring}` }}>
          <SiteHeaderBar
            brand={brand}
            nav={<SiteDesktopNav categories={nav} path={path} skin={skin} linkStyle="pill" />}
            sidebar={sidebar}
            inputId={sidebarId}
            searchSkin={skin.searchPanel}
            sidebarThemeStyle={sidebarThemeStyle}
            drawer={placement}
            layout="centered"
          />
        </header>
      );
    case 'masthead':
      return (
        <header className="sticky top-0 z-40" style={{ backgroundColor: skin.card, borderBottom: `1px solid ${skin.ring}` }}>
          <SiteHeaderBar
            brand={brand}
            nav={<SiteDesktopNav categories={nav} path={path} skin={skin} linkStyle="pill" dark={skin.tone === 'dark'} />}
            sidebar={sidebar}
            inputId={sidebarId}
            searchSkin={skin.searchPanel}
            sidebarThemeStyle={sidebarThemeStyle}
            drawer={placement}
            layout="masthead"
            navStripStyle={{ backgroundColor: skin.card, borderTop: `1px solid ${skin.ring}` }}
            quickNav={<SiteQuickNav categories={nav} path={path} accent={skin.accent} dark={skin.tone === 'dark'} />}
          />
        </header>
      );
    case 'floating':
      return (
        <div className="sticky top-0 z-40 px-4 pt-3 sm:px-6">
          <div
            className="mx-auto max-w-7xl rounded-2xl shadow-sm backdrop-blur"
            style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}
          >
            <SiteHeaderBar
              brand={brand}
              nav={<SiteDesktopNav categories={nav} path={path} skin={skin} linkStyle="pill" dark={skin.tone === 'dark'} />}
              sidebar={sidebar}
              inputId={sidebarId}
              searchSkin={skin.searchPanel}
              sidebarThemeStyle={sidebarThemeStyle}
              drawer={placement}
              layout="row"
            />
          </div>
        </div>
      );
    case 'underline':
      return (
        <header className="sticky top-0 z-40" style={{ backgroundColor: skin.card, borderBottom: `1px solid ${skin.ring}` }}>
          <SiteHeaderBar
            brand={brand}
            nav={<SiteDesktopNav categories={nav} path={path} skin={skin} linkStyle="underline" />}
            sidebar={sidebar}
            inputId={sidebarId}
            searchSkin={skin.searchPanel}
            sidebarThemeStyle={sidebarThemeStyle}
            drawer={placement}
            layout="row"
          />
        </header>
      );
    case 'slim':
    default:
      return (
        <header className="sticky top-0 z-40" style={{ backgroundColor: skin.card, borderBottom: `1px solid ${skin.ring}` }}>
          <SiteHeaderBar
            brand={brand}
            nav={<SiteDesktopNav categories={nav} path={path} skin={skin} linkStyle="pill" />}
            sidebar={sidebar}
            inputId={sidebarId}
            searchSkin={skin.searchPanel}
            sidebarThemeStyle={sidebarThemeStyle}
            drawer={placement}
            layout="row"
          />
        </header>
      );
  }
}

function Brand({
  site,
  showRegion,
  skin,
  large,
}: {
  readonly site: NetworkSiteData;
  readonly showRegion: boolean;
  readonly skin: SiteHeaderSkin;
  readonly large: boolean;
}) {
  return (
    <Link href="/" className="flex min-w-0 max-w-full items-center gap-2.5 leading-none no-underline">
      <Image
        unoptimized
        src={site.settings.logoUrl}
        alt={site.settings.name}
        width={72}
        height={72}
        className="h-9 w-9 flex-none rounded-xl object-cover"
        style={{ outline: `1px solid ${skin.ring}` }}
      />
      <span className="grid min-w-0 leading-none">
        <span className="flex min-w-0 items-center gap-1.5">
          <strong
            className={`truncate font-sans font-extrabold tracking-tight ${large ? 'text-2xl' : 'text-lg'}`}
            style={{ color: skin.ink }}
          >
            {site.settings.name}
          </strong>
          {showRegion ? (
            <span
              className="flex-none rounded-md px-1.5 py-0.5 font-sans text-[11px] font-bold"
              style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
            >
              {site.regionName}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
