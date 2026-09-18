'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { SERVICE_NAME, SITE_ROUTES, type NavigationLink } from '@/ui/site/marketing-content';
import { GLASS_ELEVATED } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';
import { useMobileMenu } from '@/modules/site/components/layout/use-mobile-menu';

export function LandingHeader() {
  const { open, setOpen, pathname, closeButtonRef: closeRef } = useMobileMenu();

  return (
    <>
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className={cn('mx-auto w-full max-w-7xl rounded-md', GLASS_ELEVATED)}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${SERVICE_NAME} beranda`}>
              <Image
                src="/brand/indicate-mark.svg"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                className="h-8 w-8 flex-none transition-transform duration-180 group-hover:-translate-y-px"
              />
              <span className="grid min-w-0 leading-none">
                <strong className="truncate text-[15px] font-semibold tracking-tight">{SERVICE_NAME}</strong>
                <small className="mt-0.5 hidden font-mono text-[9px] tracking-[0.16em] text-[#5f6b7a] uppercase md:block">
                  Publishing infrastructure
                </small>
              </span>
            </Link>

            <nav aria-label="Navigasi utama" className="hidden min-w-0 items-center gap-0.5 lg:flex">
              {SITE_ROUTES.map((route: NavigationLink) => {
                const active = pathname === route.href;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-180',
                      active ? 'bg-[#1a2430] text-white' : 'text-[#4c5b6b] hover:bg-[#1a2430]/5 hover:text-[#1a2430] active:bg-[#1a2430]/10',
                    )}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-none items-center gap-1.5">
              <Link
                href="/sign-in"
                className="hidden rounded px-3.5 py-2 text-[13px] font-semibold transition-colors duration-180 hover:bg-[#1a2430]/5 active:bg-[#1a2430]/10 lg:inline-flex"
              >
                Masuk
              </Link>
              <Link
                href="/contact"
                className="hidden items-center gap-1.5 rounded bg-[#1a2430] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(26,36,48,0.6)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27] lg:inline-flex"
              >
                Jadwalkan diskusi
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Buka menu navigasi"
                aria-expanded={open}
                aria-controls="landing-menu"
                className="flex h-9 w-9 items-center justify-center rounded border border-[#1a2430]/10 bg-white/60 transition-colors hover:border-[#1a2430]/30 lg:hidden"
              >
                <Menu className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        id="landing-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        inert={!open}
        className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      >
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute inset-0 bg-[#1a2430]/25 backdrop-blur-sm transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute top-0 right-0 flex h-full w-[86%] max-w-sm flex-col border-l border-[#e2ded2] bg-[#f6f4ee] shadow-2xl transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-[#e2ded2] px-5 py-4">
            <span className="flex items-center gap-2.5">
              <Image
                src="/brand/indicate-mark.svg"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                className="h-8 w-8 flex-none"
              />
              <span className="grid leading-none">
                <strong className="text-[15px] font-semibold tracking-tight">{SERVICE_NAME}</strong>
                <small className="mt-0.5 font-mono text-[9px] tracking-[0.16em] text-[#5f6b7a] uppercase">
                  Menu
                </small>
              </span>
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu navigasi"
              className="flex h-9 w-9 items-center justify-center rounded border border-[#1a2430]/10 bg-white/70 transition-colors hover:border-[#1a2430]/30"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Navigasi seluler" className="grid flex-1 content-start gap-1 overflow-y-auto px-5 pt-3 pb-4">
            {SITE_ROUTES.map((route: NavigationLink, index: number) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setOpen(false)}
                className="group flex items-baseline gap-4 border-b border-[#e2ded2] py-3.5 last:border-b-0"
              >
                <span className="font-mono text-[11px] text-[#8a5f1c] tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-serif text-2xl leading-none tracking-tight transition-transform duration-180 group-hover:translate-x-1">
                  {route.label}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-5 w-5 self-center text-[#5f6b7a] transition-all duration-180 group-hover:text-[#8a5f1c]"
                />
              </Link>
            ))}
          </nav>
          <div className="grid gap-2 border-t border-[#e2ded2] bg-white/60 px-5 py-5">
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded bg-[#1a2430] px-5 py-3 text-sm font-semibold text-white transition-colors duration-180 hover:bg-[#2b3a4b] active:bg-[#141d27]"
            >
              Jadwalkan diskusi
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded border border-[#1a2430]/15 bg-white/70 px-5 py-3 text-sm font-semibold transition-colors duration-180 hover:border-[#1a2430]/30 hover:bg-white active:bg-white"
            >
              Masuk ke Dashboard
            </Link>
            <p className="m-0 mt-1 text-center font-mono text-[11px] text-[#5f6b7a]">
              sancaphenacakra@gmail.com
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
