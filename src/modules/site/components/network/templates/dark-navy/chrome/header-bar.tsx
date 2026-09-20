'use client';

import Link from 'next/link';
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Menu, Search } from 'lucide-react';

import { DarkNavyMobileSidebar } from '@/modules/site/components/network/templates/dark-navy/chrome/mobile-sidebar';
import { DarkNavySearchPanel } from '@/modules/site/components/network/templates/dark-navy/chrome/search-panel';

const subscribeMounted = (): (() => void) => () => {};
const getMountedSnapshot = (): boolean => true;
const getMountedServerSnapshot = (): boolean => false;

/**
 * Orkestrasi bar header: brand, nav desktop, pemicu cari ikon saja, dan sidebar.
 *
 * @param brand - Elemen brand situs.
 * @param nav - Navigasi desktop.
 * @param sidebar - Navigasi seluler.
 * @returns Bar header interaktif template.
 */
export function DarkNavyHeaderBar({
  brand,
  nav,
  sidebar,
}: {
  readonly brand: ReactNode;
  readonly nav: ReactNode;
  readonly sidebar: ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="mx-auto grid min-h-16 max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:gap-x-4 sm:px-6 lg:gap-x-6">
        <div className="min-w-0 justify-self-start">{brand}</div>
        {nav}
        <div className="flex flex-none items-center gap-2 justify-self-end">
          <Link
            href="#newsletter"
            className="hidden h-10 flex-none items-center rounded-full bg-[var(--tpl-primary,#2f7bff)] px-5 font-sans text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--tpl-primary-dark,#1a5fd0)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#2f7bff)] lg:inline-flex"
          >
            Langganan
          </Link>
          <button
            ref={searchButtonRef}
            type="button"
            onClick={() => setSearchOpen((value) => !value)}
            aria-expanded={searchOpen}
            aria-label={searchOpen ? 'Tutup pencarian' : 'Cari berita'}
            title={searchOpen ? 'Tutup pencarian' : 'Cari berita'}
            className="hidden h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary,#2f7bff)] font-sans text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--tpl-primary-dark,#1a5fd0)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#2f7bff)] lg:flex"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-label="Buka menu"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[var(--tpl-muted,#9aa9c4)] ring-1 ring-[var(--tpl-ring,#1b2c4f)] transition-colors hover:text-[var(--tpl-primary,#2f7bff)] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <DarkNavySearchPanel
          query={query}
          onQueryChange={setQuery}
          onClose={() => setSearchOpen(false)}
          inputRef={inputRef}
          onFocusReturn={() => searchButtonRef.current?.focus()}
        />
      ) : null}

      {mounted ? (
        <DarkNavyMobileSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onFocusReturn={() => menuButtonRef.current?.focus()}
          closeRef={sidebarCloseRef}
        >
          {sidebar}
        </DarkNavyMobileSidebar>
      ) : null}
    </>
  );
}
