'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';
import { cn } from '@/ui/cn';
import { useCloseBelowDesktop } from '@/modules/site/components/network/ui/desktop-menu';

/** Posisi drawer seluler: kanan, kiri, bawah, atau layar penuh. */
export type SiteDrawerPlacement = 'right' | 'left' | 'bottom' | 'full';

/**
 * Drawer navigasi seluler bersama dengan pencarian terpadu.
 *
 * @param open - Status terbuka drawer.
 * @param onClose - Penutup drawer.
 * @param onFocusReturn - Kembalikan fokus ke tombol menu saat drawer tutup.
 * @param closeRef - Ref tombol tutup untuk autofocus.
 * @param children - Konten navigasi seluler milik template.
 * @param inputId - Id unik input pencarian drawer per template.
 * @param placement - Posisi drawer per template.
 * @returns Portal drawer aksesibel, null di server hingga terpasang.
 */
export function SiteMobileSidebar({
  open,
  onClose,
  onFocusReturn,
  closeRef,
  children,
  inputId,
  placement = 'right',
  themeStyle,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onFocusReturn: () => void;
  readonly closeRef: React.RefObject<HTMLButtonElement | null>;
  readonly children: ReactNode;
  readonly inputId: string;
  readonly placement?: SiteDrawerPlacement;
  readonly themeStyle?: React.CSSProperties | undefined;
}) {
  const router = useRouter();
  const [sidebarQuery, setSidebarQuery] = useState('');
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        onFocusReturn();
      }
      return undefined;
    }
    wasOpen.current = true;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, onFocusReturn, closeRef]);

  useCloseBelowDesktop(open, onClose);

  const submitSidebar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = sidebarQuery.trim().slice(0, 120);
    onClose();
    router.push(value === '' ? '/search' : `/search?q=${encodeURIComponent(value)}`);
  };

  const panelPosition =
    placement === 'left'
      ? 'absolute inset-y-0 left-0 w-[min(19rem,84vw)] flex-col'
      : placement === 'bottom'
        ? 'absolute inset-x-0 bottom-0 max-h-[85svh] flex-col rounded-t-3xl'
        : placement === 'full'
          ? 'absolute inset-0 flex-col'
          : 'absolute inset-y-0 right-0 w-[min(19rem,84vw)] flex-col';
  const panelMotion =
    placement === 'left'
      ? open
        ? 'translate-x-0'
        : '-translate-x-full'
      : placement === 'bottom' || placement === 'full'
        ? open
          ? 'translate-y-0'
          : 'translate-y-full'
        : open
          ? 'translate-x-0'
          : 'translate-x-full';

  return createPortal(
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn('fixed inset-0 z-[60] lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      style={themeStyle}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn('absolute inset-0 bg-slate-900/50 transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
        className={cn(
          'flex bg-[var(--tpl-card,#ffffff)] shadow-2xl transition-transform duration-300 ease-out overflow-hidden',
          panelPosition,
          panelMotion,
        )}
      >
        {placement === 'bottom' ? (
          <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 flex-none rounded-full bg-[var(--tpl-ring,#e2e8f0)]" />
        ) : null}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--tpl-ring,#e2e8f0)] px-5 py-4">
          <span className="font-sans text-sm font-bold tracking-wide text-[var(--tpl-ink,#0f172a)]">Menu</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--tpl-muted,#475569)] ring-1 ring-[var(--tpl-ring,#e2e8f0)] transition-colors hover:text-[var(--tpl-primary,#1a5fd0)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form role="search" onSubmit={submitSidebar} className="flex flex-none items-center gap-2 border-b border-[var(--tpl-ring,#e2e8f0)] px-5 py-3">
          <label htmlFor={inputId} className="sr-only">
            Cari berita
          </label>
          <TemplateInput
            id={inputId}
            value={sidebarQuery}
            onChange={(event) => setSidebarQuery(event.target.value)}
            maxLength={120}
            autoComplete="off"
            placeholder="Cari berita…"
            className="h-9 min-w-0 flex-1 rounded-full font-sans text-sm"
          />
          <TemplateButton type="submit" aria-label="Cari" className="h-9 w-9 flex-none rounded-full p-0">
            <Search className="h-4 w-4" aria-hidden="true" />
          </TemplateButton>
        </form>
        <nav aria-label="Navigasi seluler" className="flex-1 overflow-y-auto px-4 py-4" onClick={onClose}>
          {children}
        </nav>
        <div className="flex-none border-t border-[var(--tpl-ring,#e2e8f0)] bg-[var(--tpl-canvas,#f5f8fd)] px-5 py-4">
          <p className="m-0 font-sans text-xs leading-relaxed text-[var(--tpl-muted,#475569)]">
            Semua halaman informasi tersedia di menu <span className="font-semibold text-[var(--tpl-ink,#0f172a)]">Informasi</span> di atas.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
