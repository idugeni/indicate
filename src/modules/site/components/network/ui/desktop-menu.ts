'use client';

import { useEffect, useState } from 'react';

/**
 * Open state for one desktop mega menu, auto-closed below the lg breakpoint.
 *
 * @remarks The desktop nav mounts at every width (`hidden lg:flex`) while its
 * popup is portaled, so an open menu would float over the mobile layout after
 * a resize. Closing on breakpoint exit keeps exactly one nav visible.
 * @returns Tuple of current open state and its setter, wired to `onOpenChange`.
 */
export function useDesktopMenuOpen(): readonly [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(min-width: 1024px)');
    const closeBelowDesktop = () => {
      if (!query.matches) setOpen(false);
    };
    query.addEventListener('change', closeBelowDesktop);
    return () => query.removeEventListener('change', closeBelowDesktop);
  }, []);
  return [open, setOpen];
}

/**
 * Auto-close one mobile surface the moment the viewport reaches desktop.
 *
 * @remarks Mobile chrome mounts at every width (`lg:hidden` only hides it),
 * so an open sidebar would keep `body` scroll-locked on desktop and pop back
 * open on the way down. Closing on breakpoint entry keeps exactly one nav.
 * @param open - Current open state of the mobile surface.
 * @param onClose - Close handler invoked on entering the lg breakpoint.
 */
export function useCloseBelowDesktop(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open || typeof window.matchMedia !== 'function') return undefined;
    const desktop = window.matchMedia('(min-width: 1024px)');
    if (desktop.matches) {
      onClose();
      return undefined;
    }
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open, onClose]);
}
