'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight } from 'lucide-react';
import {
  SITE_ROUTES,
  LEGAL_ROUTES,
  SERVICE_NAME,
  type NavigationLink,
} from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';

/**
 * Titik pending navigasi: selalu di-render (ukuran tetap, tanpa layout shift),
 * hanya opacity yang berubah dengan delay 100ms agar navigasi cepat tidak
 * berkedip. Tanpa animasi infinite.
 */
function NavPendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute right-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-brass transition-opacity delay-100 duration-180',
        pending ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  // Tutup otomatis saat viewport membesar ke desktop: overlay memakai
  // lg:hidden sehingga menu yang tertinggal terbuka akan mengunci scroll
  // (body overflow hidden) tanpa terlihat.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };
    query.addEventListener('change', closeOnDesktop);
    return () => query.removeEventListener('change', closeOnDesktop);
  }, []);

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
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-bg/90 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 flex-none items-center gap-2.5 no-underline sm:gap-3"
            aria-label={`${SERVICE_NAME} beranda`}
          >
            <Image
              className="h-8 w-8 flex-none rounded border border-hairline-strong bg-bg-raised-2 object-contain transition-colors duration-180 group-hover:border-brass/60"
              src="/brand/indicate-mark.svg"
              alt=""
              width={32}
              height={32}
              priority
              aria-hidden="true"
            />
            <span className="grid min-w-0">
              <strong className="truncate font-sans text-[15px] font-semibold tracking-tight text-paper sm:text-base">
                {SERVICE_NAME}
              </strong>
              <small className="hidden truncate font-mono text-[11px] tracking-wider text-paper-faint xl:block">
                Satu sinyal · ratusan kanal
              </small>
            </span>
          </Link>

          <nav aria-label="Navigasi desktop" className="hidden min-w-0 flex-none items-center gap-0.5 lg:flex">
            {SITE_ROUTES.map((route: NavigationLink) => {
              const isActive = pathname === route.href;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative whitespace-nowrap rounded px-3 py-2 font-sans text-[13px] font-medium transition-colors duration-180',
                    isActive ? 'text-paper' : 'text-paper-dim hover:bg-bg-raised-2 hover:text-paper',
                  )}
                >
                {route.label}
                <NavPendingDot />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-brass transition-opacity duration-180',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                  )}
                />
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-none items-center gap-2 sm:gap-3">
            <span aria-hidden="true" className="hidden h-4 w-px bg-hairline lg:block" />
            <Link
              href="/sign-in"
              className="hidden items-center justify-center whitespace-nowrap rounded bg-brass px-4 py-2 font-sans text-[13px] font-semibold text-bg transition-all duration-180 hover:-translate-y-px hover:bg-brass-soft sm:inline-flex md:px-5"
            >
              <span className="hidden md:inline">Masuk ke Dashboard</span>
              <span className="md:hidden">Masuk</span>
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={cn(
                'flex h-9 w-9 flex-none items-center justify-center rounded border bg-bg-raised transition-colors duration-180 lg:hidden',
                mobileMenuOpen
                  ? 'border-hairline-strong text-paper'
                  : 'border-hairline text-paper-dim hover:border-hairline-strong hover:text-paper',
              )}
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-side-panel"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen}
        data-open={mobileMenuOpen || undefined}
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300',
            mobileMenuOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          id="mobile-side-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigasi menu"
          className={cn(
            'absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l border-hairline bg-bg-raised shadow-lg transition-transform duration-300 ease-out',
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <div className="grid min-w-0">
              <span className="truncate font-sans text-[15px] font-semibold tracking-tight text-paper">
                {SERVICE_NAME}
              </span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 flex-none items-center justify-center rounded border border-hairline-strong text-paper-dim transition-colors duration-180 hover:border-hairline hover:text-paper"
              aria-label="Tutup menu"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Navigasi seluler" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {SITE_ROUTES.map((route: NavigationLink, index: number) => {
              const isActive = pathname === route.href;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded px-4 py-3 font-sans text-[15px] font-medium transition-colors duration-180',
                    isActive
                      ? 'bg-bg-raised-2 text-paper'
                      : 'text-paper-dim hover:bg-bg-raised-2 hover:text-paper',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'font-mono text-[11px] tabular-nums',
                      isActive ? 'text-brass' : 'text-paper-faint',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1">{route.label}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className={cn(
                      'h-4 w-4 transition-all duration-180',
                      isActive
                        ? 'text-brass opacity-100'
                        : '-translate-x-1 text-paper-faint opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-hairline px-5 py-4">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-brass px-5 py-2.5 font-sans text-sm font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
            >
              Masuk ke Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-wider text-paper-faint">
              {LEGAL_ROUTES.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="transition-colors hover:text-brass-soft"
                >
                  {route.label}
                </Link>
              ))}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
