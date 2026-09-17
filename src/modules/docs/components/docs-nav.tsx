'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { DOCS_PAGES, DOCS_SECTIONS } from '@/modules/docs/navigation';

function matches(page: { readonly title: string; readonly description: string }, query: string): boolean {
  const folded = `${page.title} ${page.description}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => folded.includes(token));
}

export function DocsNav() {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const trimmed = query.trim();

  const list = (
    <ul className="m-0 list-none space-y-5 p-0">
      {DOCS_SECTIONS.map((section) => {
        const pages = DOCS_PAGES.filter((page) => page.section === section && (trimmed === '' || matches(page, trimmed)));
        if (pages.length === 0) return null;
        return (
          <li key={section} className="m-0 p-0">
            <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">{section}</p>
            <ul className="m-0 mt-2 list-none space-y-0.5 p-0">
              {pages.map((page) => {
                const active = pathname === page.path;
                return (
                  <li key={page.slug} className="m-0 p-0">
                    <Link
                      href={page.path}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={`block rounded-lg px-3 py-1.5 font-sans text-sm transition-colors ${
                        active
                          ? 'bg-[#1a5fd0]/10 font-semibold text-[#1a5fd0]'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {page.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div>
      <div className="mb-3 flex gap-2 lg:hidden">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari halaman…"
          aria-label="Cari halaman dokumentasi"
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1a5fd0] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="h-9 flex-none rounded-lg bg-slate-900 px-3 font-sans text-sm font-semibold text-white"
        >
          {open ? 'Tutup' : 'Menu'}
        </button>
      </div>
      <div className="mb-3 hidden lg:block">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari halaman…"
          aria-label="Cari halaman dokumentasi"
          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1a5fd0] focus:outline-none"
        />
      </div>
      <nav aria-label="Dokumentasi" className={`${open ? 'block' : 'hidden'} lg:block`}>
        {list}
      </nav>
    </div>
  );
}
