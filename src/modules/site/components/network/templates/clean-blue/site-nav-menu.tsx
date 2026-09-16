'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CategoryNavItem } from '@/modules/site/components/network/templates/clean-blue/shared';

const MAX_VISIBLE_CATEGORIES = 5;

function linkClass(active: boolean): string {
  return `whitespace-nowrap rounded-full px-3 py-2 font-sans text-sm transition-colors ${
    active
      ? 'font-semibold text-[#1a5fd0]'
      : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;
}

export function CleanBlueDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
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
            <DropdownMenu>
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
                className="w-64 border-slate-200 bg-white p-1.5 shadow-xl"
              >
                {overflow.map((item) => (
                  <DropdownMenuLinkItem
                    key={`${item.href}:${item.label}`}
                    render={<Link href={item.href} />}
                    aria-current={path === item.href ? 'page' : undefined}
                    className={`font-sans no-underline ${
                      path === item.href
                        ? 'bg-[#e8f0fe] font-semibold text-[#1a5fd0]'
                        : 'text-slate-700 hover:bg-[#e8f0fe] hover:text-[#1a5fd0]'
                    }`}
                  >
                    {item.label}
                  </DropdownMenuLinkItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}

export function CleanBlueMobileNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-slate-400">Menu</span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0]"
        >
          {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {open ? (
        <nav aria-label="Navigasi seluler" className="space-y-5 border-t border-slate-100 bg-white px-4 py-4">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-current={path === '/' ? 'page' : undefined}
            className={`block font-sans text-sm font-semibold ${path === '/' ? 'text-[#1a5fd0]' : 'text-slate-800'}`}
          >
            Beranda
          </Link>
          <div>
            <p className="m-0 font-sans text-xs font-bold uppercase tracking-wider text-slate-400">Kategori</p>
            <ul className="m-0 mt-2 grid list-none grid-cols-2 gap-1 p-0">
              {categories.map((item) => (
                <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={path === item.href ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2 font-sans text-sm font-medium ${path === item.href ? 'bg-[#e8f0fe] text-[#1a5fd0]' : 'text-slate-700'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
