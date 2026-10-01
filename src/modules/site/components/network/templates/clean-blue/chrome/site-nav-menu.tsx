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

function linkClass(active: boolean): string {
  return `inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 font-sans text-sm transition-colors ${
    active
      ? 'font-semibold text-[#1a5fd0] underline decoration-2 underline-offset-4'
      : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function CleanBlueDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  const [menuOpen, setMenuOpen] = useDesktopMenuOpen();
  const { visible, overflow } = splitCategoryNav(categories, CATEGORY_NAV_VISIBLE_COUNT);
  const overflowActive = overflow.some((item) => isCategoryNavActive(path, item.href));
  const indexActive = isCategoryNavActive(path, CATEGORY_INDEX_HREF);
  return (
    <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 justify-center lg:flex">
      <ul className="m-0 flex max-w-full list-none items-center gap-1 overflow-x-auto p-0 [-ms-overflow-style:none] [justify-content:safe_center] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li className="m-0 shrink-0 p-0">
          <Link href="/" aria-current={isCategoryNavActive(path, '/') ? 'page' : undefined} className={linkClass(isCategoryNavActive(path, '/'))}>
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
                className={linkClass(active)}
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
                className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent [&[data-popup-open]>svg]:rotate-180 ${linkClass(overflowActive)}`}
              >
                Lainnya
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={10}
                className="w-[min(40rem,calc(100vw-2rem))] rounded-2xl border-slate-200 bg-white p-6 shadow-2xl"
              >
                <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_170px]">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3 px-1.5">
                      <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Kanal liputan
                      </p>
                      <span className="flex-none rounded-full bg-[#e8f0fe] px-2 py-0.5 font-sans text-[11px] font-bold text-[#1a5fd0]">
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
                                  ? 'bg-[#e8f0fe] font-semibold text-[#1a5fd0] underline decoration-2 underline-offset-4'
                                  : 'text-slate-700 hover:bg-[#e8f0fe] hover:text-[#1a5fd0]'
                              }`}
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
                      className="mt-3 rounded-xl px-3 py-2 font-sans text-[13px] font-bold text-[#1a5fd0] no-underline hover:bg-[#e8f0fe]"
                    >
                      Lihat semua kanal →
                    </DropdownMenuLinkItem>
                  </div>
                  <div className="border-t border-slate-200 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                    <p className="m-0 px-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                                ? 'bg-[#e8f0fe] font-semibold text-[#1a5fd0] underline decoration-2 underline-offset-4'
                                : 'text-slate-700 hover:bg-[#e8f0fe] hover:text-[#1a5fd0]'
                            }`}
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
            className={linkClass(indexActive)}
          >
            {CATEGORY_INDEX_LABEL}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function CleanBlueMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  const indexed = withCategoryIndex(categories);
  return (
    <div className="space-y-6">
      <Link
        href="/"
        aria-current={isCategoryNavActive(path, '/') ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 font-sans text-[15px] font-semibold ${isCategoryNavActive(path, '/') ? 'bg-[#e8f0fe] text-[#1a5fd0] underline decoration-2 underline-offset-4' : 'text-slate-800 hover:bg-slate-100'}`}
      >
        <House className="h-4 w-4 flex-none" aria-hidden="true" />
        Beranda
      </Link>
      <Collapsible defaultOpen>
        <CollapsibleTrigger onClick={(event) => event.stopPropagation()} className="flex w-full cursor-pointer items-center justify-between px-4 font-sans text-xs font-bold uppercase tracking-wider text-slate-400 [&[data-panel-open]>svg]:rotate-180">
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
                  className={`flex items-center rounded-xl px-4 py-2.5 font-sans text-sm font-medium ${active ? 'bg-[#e8f0fe] text-[#1a5fd0] underline decoration-2 underline-offset-4' : 'text-slate-700 hover:bg-slate-100'}`}
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
        <CollapsibleTrigger onClick={(event) => event.stopPropagation()} className="flex w-full cursor-pointer items-center justify-between px-4 font-sans text-xs font-bold uppercase tracking-wider text-slate-400 [&[data-panel-open]>svg]:rotate-180">
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
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 font-sans text-sm ${active ? 'bg-[#e8f0fe] font-semibold text-[#1a5fd0] underline decoration-2 underline-offset-4' : 'text-slate-600 hover:bg-slate-100'}`}
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
