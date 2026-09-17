'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { SERVICE_NAME, SITE_ROUTES, type NavigationLink } from '@/ui/site/marketing-content';
import { GLASS_ELEVATED } from '@/modules/site/components/landing/material';
import { cn } from '@/ui/cn';

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  return (
    <>
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className={cn('mx-auto w-full max-w-7xl rounded-md', GLASS_ELEVATED)}>
          <div className="flex items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${SERVICE_NAME} beranda`}>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 flex-none items-center justify-center rounded bg-[#1a2430] font-serif text-base font-semibold text-[#e8c87e] transition-transform duration-180 group-hover:-translate-y-px"
              >
                I
              </span>
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
                className="hidden rounded px-3.5 py-2 text-[13px] font-semibold transition-colors duration-180 hover:bg-[#1a2430]/5 active:bg-[#1a2430]/10 sm:inline-flex"
              >
                Masuk
              </Link>
              <Link
                href="/contact"
                className="hidden items-center gap-1.5 rounded bg-[#1a2430] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(26,36,48,0.6)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27] sm:inline-flex"
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
        <div
          className={cn(
            'absolute inset-x-3 top-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-md border border-white/70 bg-[#f6f4ee]/95 shadow-2xl ring-1 ring-[#1a2430]/10 backdrop-blur-2xl transition-all duration-300 ease-out',
            open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded bg-[#1a2430] font-serif text-base font-semibold text-[#e8c87e]"
              >
                I
              </span>
              <strong className="text-[15px] font-semibold tracking-tight">{SERVICE_NAME}</strong>
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
          <nav aria-label="Navigasi seluler" className="grid gap-1 px-4 pt-1 pb-4">
            {SITE_ROUTES.map((route: NavigationLink, index: number) => (
              <Link
                key={route.href}
                href={route.href}
                onClick={() => setOpen(false)}
                className="group flex items-baseline gap-4 border-b border-[#e2ded2] py-3 last:border-b-0"
              >
                <span className="font-mono text-[11px] text-[#8a5f1c] tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-serif text-[1.7rem] leading-none tracking-tight transition-transform duration-180 group-hover:translate-x-1">
                  {route.label}
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-5 w-5 self-center text-[#5f6b7a] transition-all duration-180 group-hover:text-[#8a5f1c]"
                />
              </Link>
            ))}
            <div className="mt-3 grid gap-2">
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
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
