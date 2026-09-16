'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';

import type { CategoryNavItem } from '@/modules/site/components/network/templates/clean-blue/shared';

const INFO_LINKS = [
  { label: 'Profil', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
] as const;

function linkClass(active: boolean): string {
  return `whitespace-nowrap px-3 py-2 font-sans text-sm transition-colors ${
    active
      ? 'font-semibold text-[#1a5fd0] underline decoration-2 underline-offset-8'
      : 'font-medium text-slate-600 hover:text-slate-900'
  }`;
}

const PANEL_CLASS =
  'invisible absolute left-1/2 top-full z-50 w-max -translate-x-1/2 translate-y-1 pt-2 opacity-0 transition-all duration-180 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100';

export function CleanBlueDesktopNav({ categories, path }: { readonly categories: readonly CategoryNavItem[]; readonly path: string }) {
  const infoActive = INFO_LINKS.some((item) => path === item.href);
  const categoryActive = categories.some((item) => path === item.href);
  return (
    <nav aria-label="Navigasi utama" className="hidden justify-self-center lg:block">
      <ul className="m-0 flex list-none items-center gap-0.5 p-0">
        <li className="m-0 p-0">
          <Link href="/" aria-current={path === '/' ? 'page' : undefined} className={linkClass(path === '/')}>
            Beranda
          </Link>
        </li>
        <li className="group relative m-0 p-0">
          <button
            type="button"
            aria-haspopup="true"
            className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent ${linkClass(categoryActive)}`}
          >
            Kategori
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180 group-hover:rotate-180" aria-hidden="true" />
          </button>
          <div className={PANEL_CLASS}>
            <div className="w-[30rem] rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
              <p className="m-0 px-2 pb-2 font-sans text-xs font-bold uppercase tracking-wider text-slate-400">
                Jelajahi Kategori
              </p>
              <ul className="m-0 grid list-none grid-cols-2 gap-1 p-0">
                {categories.map((item) => (
                  <li key={`${item.href}:${item.label}`} className="m-0 p-0">
                    <Link
                      href={item.href}
                      aria-current={path === item.href ? 'page' : undefined}
                      className={`group/item flex items-center justify-between rounded-xl px-3 py-2.5 font-sans text-sm font-medium transition-colors ${
                        path === item.href
                          ? 'bg-[#e8f0fe] text-[#1a5fd0]'
                          : 'text-slate-700 hover:bg-[#e8f0fe] hover:text-[#1a5fd0]'
                      }`}
                    >
                      {item.label}
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/item:opacity-100" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </li>
        <li className="group relative m-0 p-0">
          <button
            type="button"
            aria-haspopup="true"
            className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent ${linkClass(infoActive)}`}
          >
            Info
            <ChevronDown className="h-3.5 w-3.5 transition-transform duration-180 group-hover:rotate-180" aria-hidden="true" />
          </button>
          <div className={PANEL_CLASS}>
            <div className="w-60 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
              <ul className="m-0 list-none space-y-0.5 p-0">
                {INFO_LINKS.map((item) => (
                  <li key={item.href} className="m-0 p-0">
                    <Link
                      href={item.href}
                      aria-current={path === item.href ? 'page' : undefined}
                      className={`flex items-center rounded-xl px-3 py-2.5 font-sans text-sm font-medium transition-colors ${
                        path === item.href
                          ? 'bg-[#e8f0fe] text-[#1a5fd0]'
                          : 'text-slate-700 hover:bg-[#e8f0fe] hover:text-[#1a5fd0]'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </li>
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
          <div>
            <p className="m-0 font-sans text-xs font-bold uppercase tracking-wider text-slate-400">Informasi</p>
            <ul className="m-0 mt-2 list-none space-y-1 p-0">
              {INFO_LINKS.map((item) => (
                <li key={item.href} className="m-0 p-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={path === item.href ? 'page' : undefined}
                    className={`block font-sans text-sm ${path === item.href ? 'font-semibold text-[#1a5fd0]' : 'text-slate-600'}`}
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
