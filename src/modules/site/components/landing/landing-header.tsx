'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react';
import { SERVICE_NAME, SITE_ROUTES, type NavigationLink } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';
import { useMobileMenu } from '@/modules/site/components/layout/use-mobile-menu';

const MENU_OPEN_EASE = 'cubic-bezier(0.32,0.72,0,1)';

export function LandingHeader() {
  const { open, setOpen, pathname, menuButtonRef, panelRef, closeButtonRef: closeRef } =
    useMobileMenu();
  const wasOpenRef = useRef(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open && !wasOpen) return undefined;
    const backdrop = backdropRef.current;
    const aside = asideRef.current;
    if (!backdrop || !aside) return undefined;
    const items = Array.from(navRef.current?.querySelectorAll('a') ?? []);
    const cta = ctaRef.current;
    const animated = [backdrop, aside, ...items, ...(cta ? [cta] : [])];
    for (const element of animated) element.style.willChange = 'translate, opacity';
    const played: Animation[] = [];
    const play = (target: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      played.push(target.animate(frames, { fill: 'both', ...options }));
    };
    if (open) {
      play(backdrop, [{ opacity: '0' }, { opacity: '1' }], { duration: 300, easing: 'ease-out' });
      play(
        aside,
        [{ translate: '100% 0' }, { translate: '0 0' }],
        { duration: 380, easing: MENU_OPEN_EASE },
      );
      items.forEach((item, index) => {
        play(item, [{ opacity: '0' }, { opacity: '1' }], {
          duration: 260,
          delay: 80 + index * 45,
          easing: 'ease-out',
        });
      });
      if (cta) {
        play(cta, [{ opacity: '0' }, { opacity: '1' }], {
          duration: 260,
          delay: 320,
          easing: 'ease-out',
        });
      }
    } else {
      for (const item of [...items, ...(cta ? [cta] : [])]) {
        play(item, [{ opacity: '1' }, { opacity: '0' }], { duration: 150, easing: 'ease-out' });
      }
      play(backdrop, [{ opacity: '1' }, { opacity: '0' }], { duration: 260, easing: 'ease-out' });
      play(aside, [{ translate: '0 0' }, { translate: '100% 0' }], { duration: 320, easing: 'ease-in' });
    }
    const release = () => {
      for (const animation of played) animation.cancel();
      for (const element of animated) element.style.willChange = '';
    };
    void Promise.allSettled(played.map((animation) => animation.finished)).then(release);
    return release;
  }, [open ]);

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-[#e2ded2] bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between gap-2 px-5 py-2 sm:gap-3 sm:px-8">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${SERVICE_NAME} beranda`}>
              <Image
                unoptimized
                src="/brand/indicate-mark.svg"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                className="h-8 w-8 flex-none transition-transform duration-180 group-hover:-translate-y-px"
              />
              <span className="grid min-w-0 leading-none">
                <span className="flex min-w-0 items-center gap-1.5">
                  <strong className="truncate text-[15px] font-semibold tracking-tight">{SERVICE_NAME}</strong>
                  <span className="flex-none rounded-full border border-[#b88d3a]/40 bg-[#b88d3a]/10 px-1.5 py-px font-mono text-[9px] font-semibold tracking-[0.08em] text-[#8a5f1c]">
                    2.0
                  </span>
                </span>
                <small className="mt-0.5 hidden font-mono text-[9px] tracking-[0.16em] text-[#5f6b7a] uppercase md:block">
                  Publishing infrastructure
                </small>
              </span>
            </Link>

            <nav aria-label="Navigasi utama" className="hidden min-w-0 items-center gap-1 rounded-full border border-[#1a2430]/10 bg-[#ece9e0]/60 p-1 lg:flex">
              {SITE_ROUTES.map((route: NavigationLink) => {
                const active = pathname === route.href;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative rounded-full px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88d3a]',
                      active
                        ? 'bg-[#1a2430] text-white shadow-sm'
                        : 'text-[#4c5b6b] hover:-translate-y-px hover:bg-white hover:text-[#1a2430] hover:shadow-sm active:translate-y-0 active:bg-white',
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
                className="hidden items-center gap-1.5 rounded bg-[#1a2430] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_24px_-12px_rgba(26,36,48,0.6)] transition-all duration-180 hover:-translate-y-0.5 hover:bg-[#2b3a4b] active:translate-y-0 active:bg-[#141d27] md:inline-flex"
              >
                Jadwalkan diskusi
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Buka menu navigasi"
                aria-expanded={open}
                aria-controls="landing-menu"
                className="flex h-9 w-9 touch-manipulation items-center justify-center rounded border border-[#1a2430]/10 bg-white/60 transition-colors hover:border-[#1a2430]/30 lg:hidden"
              >
                <Menu className="h-4.5 w-4.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        id="landing-menu"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        inert={!open}
        className={cn('fixed inset-0 z-50 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      >
        <div
          aria-hidden="true"
          ref={backdropRef}
          onClick={() => setOpen(false)}
          className={cn('absolute inset-0 bg-[#1a2430]/30', open ? 'opacity-100' : 'opacity-0')}
        />
        <aside
          ref={asideRef}
          className={cn(
            'absolute top-0 right-0 flex h-full w-[86%] max-w-sm flex-col border-l border-[#e2ded2] bg-[#f6f4ee] shadow-2xl',
            open ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-[#e2ded2] px-5 py-4">
            <span className="flex items-center gap-2.5">
              <Image
                unoptimized
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
              className="flex h-9 w-9 touch-manipulation items-center justify-center rounded border border-[#1a2430]/10 bg-white/70 transition-colors hover:border-[#1a2430]/30"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
          <nav ref={navRef} aria-label="Navigasi seluler" className="grid flex-1 content-start gap-2 overflow-y-auto overscroll-contain px-5 pt-4 pb-4">
            {SITE_ROUTES.map((route: NavigationLink, index: number) => {
              const active = pathname === route.href;
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                    active
                      ? 'border-transparent bg-[#1a2430] text-white shadow-md'
                      : 'border-[#1a2430]/10 bg-white/70 hover:-translate-y-px hover:border-[#1a2430]/25 hover:bg-white hover:shadow-md active:translate-y-0',
                  )}
                >
                  <span
                    className={cn(
                      'flex-none rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                      active ? 'bg-white/15 text-[#e8c87a]' : 'bg-[#b88d3a]/10 text-[#8a5f1c]',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[15px] font-semibold tracking-tight">{route.label}</span>
                  <span
                    className={cn(
                      'flex h-7 w-7 flex-none items-center justify-center rounded-full transition-colors duration-200',
                      active
                        ? 'bg-white/15 text-white'
                        : 'bg-[#1a2430]/5 text-[#5f6b7a] group-hover:bg-[#1a2430] group-hover:text-white',
                    )}
                  >
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </nav>
          <div
            ref={ctaRef}
            className={cn(
              'grid gap-2 border-t border-[#e2ded2] bg-white/60 px-5 py-5',
              open ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
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
