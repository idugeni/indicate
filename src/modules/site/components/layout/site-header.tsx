'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import Image from 'next/image';
import { Menu, X, ArrowRight } from 'lucide-react';
import {
  SITE_ROUTES,
  LEGAL_ROUTES,
  SERVICE_NAME,
  type NavigationLink,
} from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';
import { useMobileMenu } from './use-mobile-menu';

function NavPendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute right-1 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[#b88d3a] transition-opacity delay-100 duration-180',
        pending ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

export function SiteHeader() {
  const {
    open: mobileMenuOpen,
    setOpen: setMobileMenuOpen,
    pathname,
    menuButtonRef,
    panelRef,
    closeButtonRef,
  } = useMobileMenu();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#e2ded2] bg-[#f4f2ec]/90 backdrop-blur-[10px]">
        <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 flex-none items-center gap-2.5 no-underline sm:gap-3"
            aria-label={`${SERVICE_NAME} beranda`}
          >
            <Image
              className="h-8 w-8 flex-none rounded border border-[#e2ded2] bg-white object-contain transition-colors duration-180 group-hover:border-[#b88d3a]/60"
              src="/brand/indicate-mark.svg"
              alt=""
              width={32}
              height={32}
              priority
              aria-hidden="true"
            />
            <span className="grid min-w-0">
              <strong className="truncate font-sans text-[15px] font-semibold tracking-tight text-[#1a2430] sm:text-base">
                {SERVICE_NAME}
              </strong>
              <small className="hidden truncate font-mono text-[11px] tracking-wider text-[#5f6b7a] xl:block">
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
                    isActive ? 'text-[#1a2430]' : 'text-[#4c5b6b] hover:bg-[#1a2430]/5 hover:text-[#1a2430]',
                  )}
                >
                {route.label}
                <NavPendingDot />
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-[#b88d3a] transition-opacity duration-180',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                  )}
                />
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-none items-center gap-2 sm:gap-3">
            <span aria-hidden="true" className="hidden h-4 w-px bg-[#e2ded2] lg:block" />
            <Link
              href="/sign-in"
              className="hidden items-center justify-center whitespace-nowrap rounded bg-[#1a2430] px-4 py-2 font-sans text-[13px] font-semibold text-white transition-all duration-180 hover:-translate-y-px hover:bg-[#2b3a4b] sm:inline-flex md:px-5"
            >
              <span className="hidden md:inline">Masuk ke Dashboard</span>
              <span className="md:hidden">Masuk</span>
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={cn(
                'flex h-9 w-9 flex-none items-center justify-center rounded border bg-white/60 transition-colors duration-180 lg:hidden',
                mobileMenuOpen
                  ? 'border-[#d8d3c4] text-[#1a2430]'
                  : 'border-[#e2ded2] text-[#4c5b6b] hover:border-[#d8d3c4] hover:text-[#1a2430]',
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
            'absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l border-[#e2ded2] bg-[#f6f4ee] shadow-lg transition-transform duration-300 ease-out',
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#e2ded2] px-5 py-4">
            <div className="grid min-w-0">
              <span className="truncate font-sans text-[15px] font-semibold tracking-tight text-[#1a2430]">
                {SERVICE_NAME}
              </span>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="flex h-8 w-8 flex-none items-center justify-center rounded border border-[#d8d3c4] text-[#4c5b6b] transition-colors duration-180 hover:border-[#e2ded2] hover:text-[#1a2430]"
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
                      ? 'bg-[#1a2430]/5 text-[#1a2430]'
                      : 'text-[#4c5b6b] hover:bg-[#1a2430]/5 hover:text-[#1a2430]',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'font-mono text-[11px] tabular-nums',
                      isActive ? 'text-[#8a5f1c]' : 'text-[#5f6b7a]',
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
                        ? 'text-[#8a5f1c] opacity-100'
                        : '-translate-x-1 text-[#5f6b7a] opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="space-y-3 border-t border-[#e2ded2] px-5 py-4">
            <Link
              href="/sign-in"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#1a2430] px-5 py-2.5 font-sans text-sm font-semibold text-white transition-colors duration-180 hover:bg-[#2b3a4b]"
            >
              Masuk ke Dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-wider text-[#5f6b7a]">
              {LEGAL_ROUTES.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="transition-colors hover:text-[#8a5f1c]"
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
