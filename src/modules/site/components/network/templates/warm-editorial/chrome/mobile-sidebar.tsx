'use client';

import type { ReactNode } from 'react';

import { SiteMobileSidebar } from '@/modules/site/components/network/ui/site-mobile-sidebar';

/**
 * Drawer seluler WarmEditorial: penerus mode bersama.
 *
 * @param open - Status terbuka drawer.
 * @param onClose - Penutup drawer.
 * @param onFocusReturn - Kembalikan fokus ke tombol menu saat drawer tutup.
 * @param closeRef - Ref tombol tutup untuk autofocus.
 * @param children - Konten navigasi seluler.
 * @returns Portal drawer aksesibel.
 */
export function WarmEditorialMobileSidebar({
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
  return (
    <SiteMobileSidebar
      open={open}
      onClose={onClose}
      onFocusReturn={onFocusReturn}
      closeRef={closeRef}
      inputId="warm-editorial-sidebar-search"
      placement="right"
    >
      {children}
    </SiteMobileSidebar>
  );
}
