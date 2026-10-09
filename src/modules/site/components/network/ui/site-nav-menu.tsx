'use client';

import Link from 'next/link';
import { ChevronDown, House, Info, LayoutGrid, Mail, ScrollText, ShieldCheck, User, type LucideIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  CATEGORY_INDEX_HREF,
  CATEGORY_INDEX_LABEL,
  CATEGORY_NAV_VISIBLE_COUNT,
  isCategoryNavActive,
  splitCategoryNav,
  withCategoryIndex,
  type CategoryNavItem,
} from '@/modules/site/components/network/ui/nav';
import { useDesktopMenuOpen } from '@/modules/site/components/network/ui/desktop-menu';

/** Gaya tautan nav desktop: pil atau garis bawah. */
export type SiteNavLinkStyle = 'pill' | 'underline';

export interface SiteNavSkin {
  readonly accent: string;
  readonly tone: 'light' | 'dark';
  readonly card?: string;
  /** Primary text color; falls back to slate when the caller passes a minimal skin. */
  readonly ink?: string | undefined;
  /** Secondary text color for panel labels; falls back to slate. */
  readonly muted?: string | undefined;
  /** Panel border color; falls back to slate. */
  readonly ring?: string | undefined;
  readonly onPrimary?: string | undefined;
}

const INFO_LINKS = [
  { label: 'Profil', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
] as const;

const INFO_ICONS: Readonly<Record<string, LucideIcon>> = {
  '/tentang': User,
  '/kontak': Mail,
  '/kebijakan-privasi': ShieldCheck,
  '/syarat-ketentuan': ScrollText,
};

function desktopLinkClass(active: boolean, linkStyle: SiteNavLinkStyle, dark: boolean): string {
  const base = 'inline-flex items-center whitespace-nowrap px-3 py-2 font-sans text-sm transition-colors';
  if (linkStyle === 'underline') {
    return `${base} border-b-2 ${active ? 'border-current font-semibold underline decoration-2 underline-offset-8' : 'border-transparent font-medium hover:opacity-70'}`;
  }
  if (dark) {
    return `${base} rounded-full ${active ? 'bg-white font-semibold text-slate-900' : 'font-medium text-white/70 hover:bg-white/10 hover:text-white'}`;
  }
  return `${base} rounded-full ${active ? 'font-semibold underline decoration-2 underline-offset-4' : 'font-medium hover:bg-slate-100'}`;
}

function desktopLinkStyle(
  active: boolean,
  linkStyle: SiteNavLinkStyle,
  skin: SiteNavSkin,
  dark: boolean,
): React.CSSProperties | undefined {
  if (dark) return undefined;
  if (active) {
    return linkStyle === 'underline' ? { color: 'var(--tpl-ink,#0f172a)', borderColor: skin.accent } : { color: skin.accent };
  }
  return { color: 'var(--tpl-muted,#475569)' };
}

/**
 * Navigasi desktop bersama: Beranda, kategori, dropdown Lainnya, dan Indeks.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @param skin - Aksen dan nada tema template.
 * @param linkStyle - Pil atau garis bawah.
 * @param dark - Baris nav gelap milik varian masthead.
 * @returns Nav desktop tanpa perilaku template-spesifik.
 * @remarks Panel dropdown "Lainnya" mengikuti skin template (card/ink/muted/
 * ring, bukan slate statis). Item dropdown menetralkan warna fokus bawaan
 * Base UI (`focus:bg-accent` dasbor gelap) karena teks item memakai warna
 * inline/style template yang selalu menang atas kelas — tanpanya teks gelap
 * di atas sorotan gelap menjadi tidak terbaca; fokus tetap terlihat lewat
 * warna sorot yang sama dengan hover.
 */
export function SiteDesktopNav({
  categories,
  path,
  skin,
  linkStyle = 'pill',
  dark = false,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
  readonly skin: SiteNavSkin;
  readonly linkStyle?: SiteNavLinkStyle;
  readonly dark?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useDesktopMenuOpen();
  const { visible, overflow } = splitCategoryNav(categories, CATEGORY_NAV_VISIBLE_COUNT);
  const overflowActive = overflow.some((item) => isCategoryNavActive(path, item.href));
  const indexActive = isCategoryNavActive(path, CATEGORY_INDEX_HREF);
  return (
    <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 justify-center lg:flex">
      <ul className="m-0 flex max-w-full list-none items-center gap-1 overflow-x-auto p-0 [-ms-overflow-style:none] [justify-content:safe_center] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="m-0 shrink-0 p-0">
          <Link
            href="/"
            aria-current={isCategoryNavActive(path, '/') ? 'page' : undefined}
            className={desktopLinkClass(isCategoryNavActive(path, '/'), linkStyle, dark)}
            style={desktopLinkStyle(isCategoryNavActive(path, '/'), linkStyle, skin, dark)}
          >
            Beranda
          </Link>
        </li>
        {visible.map((item) => {
          const active = isCategoryNavActive(path, item.href);
          return (
            <li key={`${item.href}:${item.label}`} className="m-0 shrink-0 p-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={desktopLinkClass(active, linkStyle, dark)}
                style={desktopLinkStyle(active, linkStyle, skin, dark)}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
        {overflow.length > 0 ? (
          <li className="m-0 shrink-0 p-0">
            <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger
                aria-label={`Kategori lainnya (${overflow.length})`}
                className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent [&[data-popup-open]>svg]:rotate-180 ${desktopLinkClass(overflowActive, linkStyle, dark)}`}
                style={desktopLinkStyle(overflowActive, linkStyle, skin, dark)}
              >
                Lainnya
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={10}
                className="w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-6 shadow-2xl"
                style={{
                  backgroundColor: skin.card ?? (dark ? '#0e1830' : '#ffffff'),
                  color: skin.ink ?? (dark ? '#f1f5f9' : '#0f172a'),
                  border: `1px solid ${skin.ring ?? (dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
                }}
              >
                <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_170px]">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3 px-1.5">
                      <p
                        className="m-0 font-sans text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: skin.muted ?? '#94a3b8' }}
                      >
                        Kanal liputan
                      </p>
                      <span
                        className="flex-none rounded-full px-2 py-0.5 font-sans text-[11px] font-bold"
                        style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
                      >
                        {overflow.length} kanal
                      </span>
                    </div>
                    <ul className="m-0 mt-3 grid list-none gap-1.5 p-0 sm:grid-cols-2">
                      {overflow.map((item) => {
                        const active = isCategoryNavActive(path, item.href);
                        return (
                          <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                            <DropdownMenuLinkItem
                              render={<Link href={item.href} />}
                              aria-current={active ? 'page' : undefined}
                              className={`rounded-xl px-3 py-2 font-sans font-medium no-underline ${
                                active
                                  ? 'font-semibold underline decoration-2 underline-offset-4 focus:bg-transparent'
                                  : dark
                                    ? 'hover:bg-white/10 focus:bg-white/10'
                                    : 'hover:bg-slate-100 focus:bg-slate-100'
                              }`}
                              style={
                                active
                                  ? { backgroundColor: `${skin.accent}1A`, color: skin.accent }
                                  : { color: dark ? (skin.ink ?? '#e2e8f0') : (skin.ink ?? '#334155') }
                              }
                            >
                              {item.label}
                            </DropdownMenuLinkItem>
                          </li>
                        );
                      })}
                    </ul>
                    <DropdownMenuLinkItem
                      render={<Link href={CATEGORY_INDEX_HREF} />}
                      aria-current={isCategoryNavActive(path, CATEGORY_INDEX_HREF) ? 'page' : undefined}
                      className="mt-3 rounded-xl px-3 py-2 font-sans text-[13px] font-bold no-underline hover:opacity-80 focus:bg-transparent"
                      style={{ color: skin.accent }}
                    >
                      Lihat semua kanal →
                    </DropdownMenuLinkItem>
                  </div>
                  <div className={`border-t pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 ${dark ? 'border-white/10' : 'border-slate-200'}`}>
                    <p
                      className="m-0 px-1.5 font-sans text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: skin.muted ?? '#94a3b8' }}
                    >
                      Informasi
                    </p>
                    <ul className="m-0 mt-3 grid list-none gap-1 p-0">
                      {INFO_LINKS.map((item) => (
                        <li key={item.href} className="m-0 p-0">
                          <DropdownMenuLinkItem
                            render={<Link href={item.href} />}
                            aria-current={isCategoryNavActive(path, item.href) ? 'page' : undefined}
                            className={`rounded-xl px-3 py-2 font-sans no-underline ${
                              isCategoryNavActive(path, item.href)
                                ? 'font-semibold underline decoration-2 underline-offset-4 focus:bg-transparent'
                                : dark
                                  ? 'hover:bg-white/10 focus:bg-white/10'
                                  : 'hover:bg-slate-100 focus:bg-slate-100'
                            }`}
                            style={
                              isCategoryNavActive(path, item.href)
                                ? { backgroundColor: `${skin.accent}1A`, color: skin.accent }
                                : { color: dark ? (skin.ink ?? '#e2e8f0') : (skin.ink ?? '#334155') }
                            }
                          >
                            {item.label}
                          </DropdownMenuLinkItem>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ) : null}
        <li className="m-0 shrink-0 p-0">
          <Link
            href={CATEGORY_INDEX_HREF}
            aria-current={indexActive ? 'page' : undefined}
            className={desktopLinkClass(indexActive, linkStyle, dark)}
            style={desktopLinkStyle(indexActive, linkStyle, skin, dark)}
          >
            {CATEGORY_INDEX_LABEL}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/**
 * Navigasi seluler bersama untuk drawer: Beranda, Kategori, dan Informasi.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @param skin - Aksen dan nada tema template.
 * @returns Blok nav drawer tanpa perilaku template-spesifik.
 */
export function SiteMobileNav({
  categories,
  path,
  skin,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
  readonly skin: SiteNavSkin;
}) {
  const indexed = withCategoryIndex(categories);
  const dark = skin.tone === 'dark';
  const activeStyle = { backgroundColor: `${skin.accent}1A`, color: skin.accent };
  const idleHome = dark ? 'text-slate-200 hover:bg-white/10' : 'text-slate-800 hover:bg-slate-100';
  const idleCat = dark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100';
  const idleInfo = dark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100';
  const groupLabel = dark ? 'text-slate-500' : 'text-slate-400';
  return (
    <div className="space-y-6">
      <Link
        href="/"
        aria-current={isCategoryNavActive(path, '/') ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 font-sans text-[15px] font-semibold ${isCategoryNavActive(path, '/') ? 'underline decoration-2 underline-offset-4' : idleHome}`}
        style={isCategoryNavActive(path, '/') ? activeStyle : undefined}
      >
        <House className="h-4 w-4 flex-none" aria-hidden="true" />
        Beranda
      </Link>
      <Collapsible defaultOpen>
        <CollapsibleTrigger onClick={(event) => event.stopPropagation()} className={`flex w-full cursor-pointer items-center justify-between px-4 font-sans text-xs font-bold uppercase tracking-wider [&[data-panel-open]>svg]:rotate-180 ${groupLabel}`}>
          <span className="flex items-center gap-2">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            Kategori
          </span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
        <ul className="m-0 mt-2 list-none space-y-1 p-0">
          {indexed.map((item) => {
            const active = isCategoryNavActive(path, item.href);
            return (
              <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center rounded-xl px-4 py-2.5 font-sans text-sm font-medium ${active ? 'underline decoration-2 underline-offset-4' : idleCat}`}
                  style={active ? activeStyle : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger onClick={(event) => event.stopPropagation()} className={`flex w-full cursor-pointer items-center justify-between px-4 font-sans text-xs font-bold uppercase tracking-wider [&[data-panel-open]>svg]:rotate-180 ${groupLabel}`}>
          <span className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            Informasi
          </span>
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180" aria-hidden="true" />
        </CollapsibleTrigger>
        <CollapsibleContent>
        <ul className="m-0 mt-2 list-none space-y-1 p-0">
          {INFO_LINKS.map((item) => {
            const Icon = INFO_ICONS[item.href] ?? Info;
            const active = isCategoryNavActive(path, item.href);
            return (
            <li key={item.href} className="m-0 p-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 font-sans text-sm ${active ? 'font-semibold underline decoration-2 underline-offset-4' : idleInfo}`}
                style={active ? activeStyle : undefined}
              >
                <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
          })}
        </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Baris kanal geser untuk layar kecil pada varian masthead.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @param accent - Warna aksen garis aktif.
 * @returns Nav horizontal tanpa dropdown.
 */
export function SiteQuickNav({
  categories,
  path,
  accent,
  dark = true,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
  readonly accent: string;
  readonly dark?: boolean;
}) {
  const items = [{ label: 'Beranda', href: '/' }, ...categories.slice(0, 6)];
  return (
    <nav aria-label="Navigasi cepat" className="lg:hidden">
      <ul className="m-0 flex list-none items-center gap-1 overflow-x-auto p-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isCategoryNavActive(path, item.href);
          return (
            <li key={`${item.href}:${item.label}`} className="m-0 shrink-0 p-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center whitespace-nowrap border-b-2 px-2.5 py-2.5 font-sans text-[13px] transition-colors ${active ? 'border-current font-bold' : 'border-transparent font-medium'} ${dark ? (active ? 'text-white' : 'text-white/65') : active ? '' : 'text-slate-600'}`}
                style={active ? { borderColor: accent, color: dark ? '#ffffff' : accent } : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Navigasi seluler layar penuh: tautan besar tanpa lipatan.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @param skin - Aksen dan nada tema template.
 * @returns Daftar tautan besar untuk drawer fullscreen.
 */
export function SiteMobileNavLarge({
  categories,
  path,
  skin,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
  readonly skin: SiteNavSkin;
}) {
  const indexed = withCategoryIndex(categories);
  return (
    <div className="space-y-8 px-2">
      <ul className="m-0 list-none space-y-1 p-0">
        {[{ label: 'Beranda', href: '/' }, ...indexed].map((item) => {
          const active = isCategoryNavActive(path, item.href);
          return (
            <li key={`${item.href}:${item.label}`} className="m-0 p-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="block py-1.5 font-sans text-3xl font-extrabold tracking-tight transition-opacity hover:opacity-75"
                style={{ color: active ? skin.accent : 'var(--tpl-ink,#0f172a)' }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div>
        <p
          className="m-0 px-0 font-sans text-xs font-bold uppercase tracking-[0.2em]"
          style={{ color: skin.muted ?? 'var(--tpl-muted,#94a3b8)' }}
        >
          Informasi
        </p>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
          {INFO_LINKS.map((item) => (
            <li key={item.href} className="m-0 p-0">
              <Link
                href={item.href}
                aria-current={isCategoryNavActive(path, item.href) ? 'page' : undefined}
                className="font-sans text-sm font-semibold transition-opacity hover:opacity-75"
                style={{ color: isCategoryNavActive(path, item.href) ? skin.accent : 'var(--tpl-muted,#475569)' }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Navigasi seluler grid ikon: kanal sebagai ubin.
 *
 * @param categories - Kanal dari navigasi situs.
 * @param path - Path aktif untuk status `aria-current`.
 * @param skin - Aksen dan nada tema template.
 * @returns Grid ubin kanal untuk drawer.
 */
export function SiteMobileNavGrid({
  categories,
  path,
  skin,
}: {
  readonly categories: readonly CategoryNavItem[];
  readonly path: string;
  readonly skin: SiteNavSkin;
}) {
  const indexed = withCategoryIndex(categories);
  return (
    <div className="space-y-6">
      <ul className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
        {[{ label: 'Beranda', href: '/' }, ...indexed].map((item) => {
          const active = isCategoryNavActive(path, item.href);
          return (
            <li key={`${item.href}:${item.label}`} className="m-0 min-w-0 p-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-w-0 flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center transition-opacity hover:opacity-80"
                style={
                  active
                    ? { backgroundColor: `${skin.accent}1A`, outline: `1px solid ${skin.accent}` }
                    : { backgroundColor: 'var(--tpl-canvas,#f5f8fd)', outline: '1px solid var(--tpl-ring,#e2e8f0)' }
                }
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full font-sans text-sm font-extrabold"
                  style={{
                    backgroundColor: skin.accent,
                    color: skin.onPrimary ?? (skin.tone === 'dark' ? (skin.ink ?? '#ffffff') : '#ffffff'),
                  }}
                >
                  {item.label.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="line-clamp-2 w-full font-sans text-xs font-bold" style={{ color: 'var(--tpl-ink,#0f172a)' }}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {INFO_LINKS.map((item) => (
          <li key={item.href} className="m-0">
            <Link
              href={item.href}
              className="inline-block rounded-full px-3.5 py-1.5 font-sans text-xs font-bold transition-opacity hover:opacity-75"
              style={{ color: 'var(--tpl-muted,#475569)', outline: '1px solid var(--tpl-ring,#e2e8f0)' }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
