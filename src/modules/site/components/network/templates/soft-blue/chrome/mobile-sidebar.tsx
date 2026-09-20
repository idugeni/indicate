'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { TemplateButton, TemplateInput } from '@/modules/site/components/network/ui/field';
import { cn } from '@/ui/cn';

/**
 * Sidebar navigasi seluler dengan pencarian terpadu.
 *
 * @param open - Status terbuka sidebar.
 * @param onClose - Handler tutup sidebar.
 * @param onFocusReturn - Kembalikan fokus ke tombol menu saat tutup.
 * @param closeRef - Ref tombol tutup untuk autofocus.
 * @param children - Isi navigasi seluler.
 * @returns Portal sidebar aksesibel.
 */
export function SoftBlueMobileSidebar({
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
          'absolute inset-y-0 right-0 flex w-[min(19rem,84vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <span className="font-sans text-sm font-bold tracking-wide text-slate-900">Menu</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#2563eb)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form role="search" onSubmit={submitSidebar} className="flex flex-none items-center gap-2 border-b border-slate-100 px-5 py-3">
          <label htmlFor="soft-blue-sidebar-search" className="sr-only">
            Cari berita
          </label>
          <TemplateInput
            id="soft-blue-sidebar-search"
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
        <div className="flex-none border-t border-slate-100 px-5 py-4" onClick={onClose}>
          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-2 p-0 font-sans text-xs">
            <li><Link href="/tentang" className="text-slate-500 transition-colors hover:text-[var(--tpl-primary,#2563eb)]">Tentang</Link></li>
            <li><Link href="/kontak" className="text-slate-500 transition-colors hover:text-[var(--tpl-primary,#2563eb)]">Kontak</Link></li>
            <li><Link href="/kebijakan-privasi" className="text-slate-500 transition-colors hover:text-[var(--tpl-primary,#2563eb)]">Kebijakan Privasi</Link></li>
            <li><Link href="/syarat-ketentuan" className="text-slate-500 transition-colors hover:text-[var(--tpl-primary,#2563eb)]">Syarat & Ketentuan</Link></li>
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
