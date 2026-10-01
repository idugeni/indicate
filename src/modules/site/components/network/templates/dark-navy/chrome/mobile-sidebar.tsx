'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';
import { cn } from '@/ui/cn';

/**
 * Mobile navigation sidebar with unified search.
 *
 * @param open - Sidebar open state.
 * @param onClose - Sidebar close handler.
 * @param onFocusReturn - Return focus to the menu button on close.
 * @param closeRef - Close button ref for autofocus.
 * @param children - Mobile navigation content.
 * @returns Accessible sidebar portal.
 */
export function DarkNavyMobileSidebar({
  open,
  onClose,
  onFocusReturn,
  closeRef,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onFocusReturn: () => void;
  readonly closeRef: React.RefObject<HTMLButtonElement | null>;
  readonly children: ReactNode;
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

  const submitSidebar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = sidebarQuery.trim().slice(0, 120);
    onClose();
    router.push(value === '' ? '/search' : `/search?q=${encodeURIComponent(value)}`);
  };

  return createPortal(
    <div aria-hidden={!open} inert={!open} className={cn('fixed inset-0 z-[60] lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}>
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
          'absolute inset-y-0 right-0 flex w-[min(19rem,84vw)] flex-col bg-[var(--tpl-card,#0e1a33)] shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--tpl-ring,#1b2c4f)] px-5 py-4">
          <span className="font-sans text-sm font-bold tracking-wide text-[var(--tpl-ink,#eaf0fb)]">Menu</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--tpl-muted,#9aa9c4)] ring-1 ring-[var(--tpl-ring,#1b2c4f)] transition-colors hover:text-[var(--tpl-primary,#2f7bff)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form role="search" onSubmit={submitSidebar} className="flex flex-none items-center gap-2 border-b border-[var(--tpl-ring,#1b2c4f)] px-5 py-3">
          <label htmlFor="dark-navy-sidebar-search" className="sr-only">
            Cari berita
          </label>
          <TemplateInput
            id="dark-navy-sidebar-search"
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
        <div className="flex-none border-t border-[var(--tpl-ring,#1b2c4f)] bg-white/[0.02] px-5 py-4">
          <p className="m-0 font-sans text-xs leading-relaxed text-[#9aa9c4]">
            Semua halaman informasi tersedia di menu <span className="font-semibold text-[#eaf0fb]">Informasi</span> di atas.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
