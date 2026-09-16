'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/ui/cn';

/**
 * Rangka interaktif header: baris brand/menu/aksi, panel cari mengembang ke
 * bawah (in-flow, tidak menindih), dan sidebar seluler.
 */
export function CleanBlueHeaderChrome({ brand, nav, sidebar }: { readonly brand: ReactNode; readonly nav: ReactNode; readonly sidebar: ReactNode }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const searchWasOpen = useRef(false);
  const sidebarWasOpen = useRef(false);

  useEffect(() => {
    if (searchOpen) {
      searchWasOpen.current = true;
      const id = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(id);
    }
    if (searchWasOpen.current) {
      searchWasOpen.current = false;
      searchButtonRef.current?.focus();
    }
    return undefined;
  }, [searchOpen]);

  useEffect(() => {
    if (!sidebarOpen) {
      if (sidebarWasOpen.current) {
        sidebarWasOpen.current = false;
        menuButtonRef.current?.focus();
      }
      return undefined;
    }
    sidebarWasOpen.current = true;
    sidebarCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim().slice(0, 120);
    router.push(value === '' ? '/search' : `/search?q=${encodeURIComponent(value)}`);
  };

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
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#1a5fd0] font-sans text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#155cb8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a5fd0] sm:w-auto sm:px-4"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cari</span>
          </button>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-label="Buka menu"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="ticker-enter border-t border-slate-100 bg-white">
          <form
            role="search"
            onSubmit={submit}
            className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6"
          >
            <Search className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
            <label htmlFor="clean-blue-search" className="sr-only">
              Cari berita
            </label>
            <Input
              ref={inputRef}
              id="clean-blue-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchOpen(false);
              }}
              maxLength={120}
              autoComplete="off"
              placeholder="Ketik kata kunci…"
              className="h-10 min-w-0 flex-1 rounded-full border-slate-200 bg-slate-50 font-sans text-sm"
            />
            <Button
              type="submit"
              className="h-10 flex-none rounded-full bg-[#1a5fd0] px-5 font-sans text-sm font-bold text-white hover:bg-[#155cb8]"
            >
              Cari
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Tutup pencarian"
              onClick={() => setSearchOpen(false)}
              className="h-10 w-10 flex-none rounded-full text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      ) : null}

      <div
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={cn('fixed inset-0 z-50 lg:hidden', sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none')}
      >
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'absolute inset-0 bg-slate-900/50 transition-opacity duration-300',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className={cn(
            'absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <span className="font-sans text-sm font-bold tracking-wide text-slate-900">Menu</span>
            <button
              ref={sidebarCloseRef}
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Tutup menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Navigasi seluler" className="flex-1 overflow-y-auto px-4 py-4" onClick={() => setSidebarOpen(false)}>
            {sidebar}
          </nav>
        </div>
      </div>
    </>
  );
}
