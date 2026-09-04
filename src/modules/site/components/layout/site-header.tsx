'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, X, ArrowRight } from 'lucide-react';
import {
  SITE_ROUTES,
  SERVICE_NAME,
  type NavigationLink,
} from '@/ui/site/marketing-content';

/** Command palette split into a lazy chunk; static fallback avoids CLS. */
const CommandPalette = dynamic(
  () => import('@/modules/dashboard/components/command-palette').then((module) => ({ default: module.CommandPalette })),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        aria-label="Muat navigasi cepat"
        className="hidden items-center gap-2 rounded border border-hairline bg-bg-raised px-2.5 py-1.5 font-mono text-xs text-paper-dim md:flex"
      >
        <Search className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
        <span>Navigasi Cepat...</span>
        <kbd className="ml-1 rounded border border-hairline-strong bg-bg px-1.5 py-0.5 font-mono text-[10px] text-paper-faint">
          Ctrl+K
        </kbd>
      </button>
    ),
  },
);

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
      const panel = panelRef.current;
      if (!panel) return;
      const handleTrap = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        const focusables = panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      panel.addEventListener('keydown', handleTrap);
      return () => panel.removeEventListener('keydown', handleTrap);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
    return undefined;
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bg-raised">
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-3 px-6 py-3 sm:gap-4">
        <Link
          href="/"
          className="flex min-w-0 flex-none items-center gap-3 no-underline"
          aria-label={`${SERVICE_NAME} beranda`}
        >
          <Image
            className="h-8 w-8 flex-none rounded border border-hairline-strong bg-bg-raised-2 object-contain"
            src="/brand/logo.png"
            alt=""
            width={32}
            height={32}
            priority
            aria-hidden="true"
          />
          <span className="grid min-w-0">
            <strong className="truncate font-sans text-base font-semibold tracking-tight text-paper">
              {SERVICE_NAME}
            </strong>
            <small className="hidden truncate font-mono text-[11px] tracking-wider text-paper-faint xl:block">
              Satu sinyal · ratusan kanal
            </small>
          </span>
        </Link>

        <nav aria-label="Navigasi desktop" className="hidden min-w-0 flex-none items-center gap-1 lg:flex">
          {SITE_ROUTES.map((route: NavigationLink) => (
            <Link
              key={route.href}
              href={route.href}
              className="whitespace-nowrap rounded px-2.5 py-1.5 font-sans text-xs font-medium text-paper-dim transition-colors duration-180 hover:bg-bg-raised-2 hover:text-paper"
            >
              {route.label}
            </Link>
          ))}
          <CommandPalette />
          <div className="mx-1 h-4 w-px flex-none bg-hairline" aria-hidden="true" />
        </nav>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <Link
            href="/sign-in"
            className="hidden items-center justify-center whitespace-nowrap rounded bg-brass px-4 py-1.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft md:inline-flex"
          >
            Masuk ke Dashboard
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 flex-none items-center justify-center rounded border border-hairline bg-bg-raised text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper lg:hidden"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-side-panel"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
        data-open={mobileMenuOpen || undefined}
        className={`fixed inset-0 z-50 lg:hidden ${
          mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          id="mobile-side-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigasi menu"
          className={`absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l border-hairline bg-bg-raised shadow-lg transition-transform duration-300 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <span className="font-sans text-base font-medium text-paper">{SERVICE_NAME}</span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded border border-hairline-strong text-paper-dim transition-colors duration-180 hover:border-hairline hover:text-paper"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Navigasi seluler" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {SITE_ROUTES.map((route: NavigationLink) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded px-4 py-2.5 font-sans text-sm font-medium text-paper-dim transition-colors duration-180 hover:bg-bg-raised-2 hover:text-paper"
              >
                {route.label}
              </Link>
            ))}
          </nav>

          <div className="space-y-2 border-t border-hairline px-5 py-4">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-brass px-5 py-2.5 font-sans text-sm font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
            >
              Masuk ke Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="text-center font-mono text-[10px] tracking-wider text-paper-faint">
              {SERVICE_NAME} · Editorial Network
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}