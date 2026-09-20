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
import type { CategoryNavItem } from '@/modules/site/components/network/templates/green-minimal/lib/nav';

const MAX_VISIBLE_CATEGORIES = 4;

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
  return `whitespace-nowrap rounded-full px-3 py-2 font-sans text-sm transition-colors ${
    active
      ? 'font-semibold text-[#1d7a38]'
      : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function GreenMinimalDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  const visible = categories.slice(0, MAX_VISIBLE_CATEGORIES);
  const overflow = categories.slice(MAX_VISIBLE_CATEGORIES);
  const overflowActive = overflow.some((item) => path === item.href);
  return (
    <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 justify-center lg:flex">
      <ul className="m-0 flex list-none items-center justify-center gap-1 p-0">
        <li className="m-0 shrink-0 p-0">
          <Link href="/" aria-current={path === '/' ? 'page' : undefined} className={linkClass(path === '/')}>
            Beranda
          </Link>
        </li>
        {visible.map((item) => (
          <li key={`${item.href}:${item.label}`} className="m-0 shrink-0 p-0">
            <Link
              href={item.href}
              aria-current={path === item.href ? 'page' : undefined}
              className={linkClass(path === item.href)}
            >
              {item.label}
            </Link>
          </li>
        ))}
        {overflow.length > 0 ? (
          <li className="m-0 shrink-0 p-0">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label={`Kategori lainnya (${overflow.length})`}
                className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent [&[data-popup-open]>svg]:rotate-180 ${linkClass(overflowActive)}`}
              >
                Lainnya
                <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="center"
                sideOffset={8}
                className="w-[34rem] border-slate-200 bg-white p-5 shadow-xl"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-6">
                  <div>
                    <p className="m-0 px-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Kanal liputan
                    </p>
                    <ul className="m-0 mt-2 grid list-none grid-cols-2 gap-1 p-0">
                      {overflow.map((item) => (
                        <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                          <DropdownMenuLinkItem
                            render={<Link href={item.href} />}
                            aria-current={path === item.href ? 'page' : undefined}
                            className={`font-sans no-underline ${
                              path === item.href
                                ? 'bg-[#e0f0e5] font-semibold text-[#1d7a38]'
                                : 'text-slate-700 hover:bg-[#e0f0e5] hover:text-[#1d7a38]'
                            }`}
                          >
                            {item.label}
                          </DropdownMenuLinkItem>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-l border-slate-200 pl-5">
                    <p className="m-0 px-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Informasi
                    </p>
                    <ul className="m-0 mt-2 grid list-none gap-1 p-0">
                      {INFO_LINKS.map((item) => (
                        <li key={item.href} className="m-0 p-0">
                          <DropdownMenuLinkItem
                            render={<Link href={item.href} />}
                            aria-current={path === item.href ? 'page' : undefined}
                            className={`font-sans no-underline ${
                              path === item.href
                                ? 'bg-[#e0f0e5] font-semibold text-[#1d7a38]'
                                : 'text-slate-700 hover:bg-[#e0f0e5] hover:text-[#1d7a38]'
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
      </ul>
    </nav>
  );
}

export function GreenMinimalMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        aria-current={path === '/' ? 'page' : undefined}
        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 font-sans text-[15px] font-semibold ${path === '/' ? 'bg-[#e0f0e5] text-[#1d7a38]' : 'text-slate-800 hover:bg-slate-100'}`}
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
          {categories.map((item) => (
            <li key={`${item.href}:${item.label}`} className="m-0 p-0">
              <Link
                href={item.href}
                aria-current={path === item.href ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 font-sans text-sm font-medium ${path === item.href ? 'bg-[#e0f0e5] text-[#1d7a38]' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 flex-none rounded-full bg-[#1d7a38]" />
                {item.label}
              </Link>
            </li>
          ))}
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
            return (
            <li key={item.href} className="m-0 p-0">
              <Link
                href={item.href}
                aria-current={path === item.href ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 font-sans text-sm ${path === item.href ? 'bg-[#e0f0e5] font-semibold text-[#1d7a38]' : 'text-slate-600 hover:bg-slate-100'}`}
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
