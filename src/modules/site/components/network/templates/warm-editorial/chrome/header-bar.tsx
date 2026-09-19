'use client';

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Menu, Search } from 'lucide-react';

import { WarmEditorialMobileSidebar } from '@/modules/site/components/network/templates/warm-editorial/chrome/mobile-sidebar';
import { WarmEditorialSearchPanel } from '@/modules/site/components/network/templates/warm-editorial/chrome/search-panel';

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
export function WarmEditorialHeaderBar({
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
          <button
            ref={searchButtonRef}
            type="button"
            onClick={() => setSearchOpen((value) => !value)}
            aria-expanded={searchOpen}
            aria-label={searchOpen ? 'Tutup pencarian' : 'Cari berita'}
            title={searchOpen ? 'Tutup pencarian' : 'Cari berita'}
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#b4532a] font-sans text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#8a3c1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b4532a]"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-label="Buka menu"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#b4532a] text-white shadow-sm transition-colors hover:bg-[#8a3c1d] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <WarmEditorialSearchPanel
          query={query}
          onQueryChange={setQuery}
          onClose={() => setSearchOpen(false)}
          inputRef={inputRef}
          onFocusReturn={() => searchButtonRef.current?.focus()}
        />
      ) : null}

      {mounted ? (
        <WarmEditorialMobileSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onFocusReturn={() => menuButtonRef.current?.focus()}
          closeRef={sidebarCloseRef}
        >
          {sidebar}
        </WarmEditorialMobileSidebar>
      ) : null}
    </>
  );
}
