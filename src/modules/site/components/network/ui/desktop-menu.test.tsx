// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCloseBelowDesktop, useDesktopMenuOpen } from '@/modules/site/components/network/ui/desktop-menu';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Probe() {
  const [open, setMenuOpen] = useDesktopMenuOpen();
  return (
    <button type="button" onClick={() => setMenuOpen(true)}>
      {open ? 'terbuka' : 'tertutup'}
    </button>
  );
}

describe('useDesktopMenuOpen', () => {
  let listeners: Array<() => void>;
  let matches: boolean;

  beforeEach(() => {
    listeners = [];
    matches = true;
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({
        get matches() {
          return matches;
        },
        media: '(min-width: 1024px)',
        addEventListener: vi.fn((_: string, listener: () => void) => {
          listeners.push(listener);
        }),
        removeEventListener: vi.fn((_: string, listener: () => void) => {
          listeners = listeners.filter((item) => item !== listener);
        }),
      }),
      configurable: true,
      writable: true,
    });
  });

  it('mulai tertutup', () => {
    render(<Probe />);
    expect(screen.getByRole('button').textContent).toBe('tertutup');
  });

  it('tetap terbuka saat breakpoint tidak berubah', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('terbuka');
    act(() => {
      listeners.forEach((listener) => listener());
    });
    expect(screen.getByRole('button').textContent).toBe('terbuka');
  });

  it('tertutup saat keluar dari breakpoint desktop', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('terbuka');
    matches = false;
    act(() => {
      listeners.forEach((listener) => listener());
    });
    expect(screen.getByRole('button').textContent).toBe('tertutup');
  });
});

function CloseProbe({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  useCloseBelowDesktop(open, onClose);
  return null;
}

describe('useCloseBelowDesktop', () => {
  let closeListeners: Array<(event: MediaQueryListEvent) => void>;
  let closeMatches: boolean;

  beforeEach(() => {
    closeListeners = [];
    closeMatches = false;
    Object.defineProperty(window, 'matchMedia', {
      value: () => ({
        get matches() {
          return closeMatches;
        },
        media: '(min-width: 1024px)',
        addEventListener: vi.fn((_: string, listener: (event: MediaQueryListEvent) => void) => {
          closeListeners.push(listener);
        }),
        removeEventListener: vi.fn((_: string, listener: (event: MediaQueryListEvent) => void) => {
          closeListeners = closeListeners.filter((item) => item !== listener);
        }),
      }),
      configurable: true,
      writable: true,
    });
  });

  it('menutup saat mount terbuka di desktop', () => {
    closeMatches = true;
    const onClose = vi.fn();
    render(<CloseProbe open onClose={onClose} />);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('menutup saat viewport memasuki desktop', () => {
    const onClose = vi.fn();
    render(<CloseProbe open onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    closeMatches = true;
    act(() => {
      closeListeners.forEach((listener) => listener({ matches: closeMatches } as MediaQueryListEvent));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('diam saat tertutup atau tetap mobile', () => {
    const onClose = vi.fn();
    render(<CloseProbe open={false} onClose={onClose} />);
    act(() => {
      closeListeners.forEach((listener) => listener({ matches: closeMatches } as MediaQueryListEvent));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
