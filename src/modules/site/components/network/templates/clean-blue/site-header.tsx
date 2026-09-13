import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { CLEAN_BLUE, categoryNav } from '@/modules/site/components/network/templates/clean-blue/shared';

export function CleanBlueHeader({ site, path = '/' }: { readonly site: NetworkSiteData; readonly path?: string }) {
  const nav = categoryNav(site);
  const tagline = site.settings.description.length > 64
    ? `${site.settings.description.slice(0, 64).trimEnd()}…`
    : site.settings.description;
  const initial = (site.settings.name || 'N').trim().slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label={`${site.settings.name} beranda`} className="flex min-w-0 flex-none items-center gap-2.5 no-underline">
          {site.settings.logoUrl ? (
            <Image
              unoptimized
              src={site.settings.logoUrl}
              alt=""
              aria-hidden="true"
              width={36}
              height={36}
              className="h-9 w-9 flex-none rounded-xl object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl font-sans text-lg font-extrabold text-white"
              style={{ backgroundColor: CLEAN_BLUE.primary }}
            >
              {initial}
            </span>
          )}
          <span className="grid min-w-0 leading-none">
            <strong className="truncate font-sans text-lg font-extrabold tracking-tight text-slate-900">
              {site.settings.name}
            </strong>
            <small className="mt-0.5 hidden truncate font-sans text-[11px] text-slate-500 sm:block">
              {tagline}
            </small>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="no-scrollbar -mb-px flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <Link
            href="/"
            aria-current={path === '/' ? 'page' : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 font-sans text-sm font-semibold transition-colors ${
              path === '/'
                ? 'text-[#1f6feb] underline decoration-2 underline-offset-8'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Beranda
          </Link>
          {nav.map((item) => (
            <Link
              key={`${item.href}:${item.label}`}
              href={item.href}
              aria-current={path === item.href ? 'page' : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-2 font-sans text-sm font-medium transition-colors ${
                path === item.href
                  ? 'text-[#1f6feb] underline decoration-2 underline-offset-8'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-none items-center gap-2.5">
          <Link
            href="/search"
            aria-label="Cari berita"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-slate-900"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#newsletter"
            className="hidden whitespace-nowrap rounded-full bg-[#1f6feb] px-5 py-2.5 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1a5fd0] sm:inline-flex"
          >
            Langganan
          </Link>
        </div>
      </div>
    </header>
  );
}
