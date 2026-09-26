'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Own the open state of the marketing mobile menu.
 *
 * @returns Open state, its setter, the current pathname, and the refs the menu
 * panel, its toggle, and its close button need.
 * @remarks Openness is derived, not stored: the state holds the pathname the
 * panel was opened on, so any navigation closes it without a setState. A stored
 * boolean cannot do that here — closing it from an effect is a cascading render
 * the project lint bans, and adjusting it during render left the committed
 * pathname stale whenever the router replayed a transition, after which every
 * click was overwritten by the reset and the toggle stopped responding. History
 * navigation closes the panel through a `popstate` subscription, and the toggle
 * regains focus only when the close came from the panel itself.
 */
export function useMobileMenu() {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;
  const setOpen = useCallback((next: boolean) => setOpenedOn(next ? pathname : null), [pathname]);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const closeOnHistory = () => setOpen(false);
    window.addEventListener('popstate', closeOnHistory);
    return () => window.removeEventListener('popstate', closeOnHistory);
  }, [setOpen]);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };
    query.addEventListener('change', closeOnDesktop);
    return () => query.removeEventListener('change', closeOnDesktop);
  }, [setOpen]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        if (openedOn === null) menuButtonRef.current?.focus();
      }
      return undefined;
    }
    wasOpenRef.current = true;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    const panel = panelRef.current;
    const handleTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    panel?.addEventListener('keydown', handleTrap);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      panel?.removeEventListener('keydown', handleTrap);
    };
  }, [open, openedOn, setOpen]);

  return { open, setOpen, pathname, menuButtonRef, panelRef, closeButtonRef };
}
