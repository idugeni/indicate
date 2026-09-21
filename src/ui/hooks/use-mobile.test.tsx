// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { useIsMobile } from '@/ui/hooks/use-mobile';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function installMatchMedia(width: number) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: width < 768,
    addEventListener: vi.fn((_type: string, handler: () => void) => {
      listeners.add(handler);
    }),
    removeEventListener: vi.fn((_type: string, handler: () => void) => {
      listeners.delete(handler);
    }),
  };
  Object.defineProperty(window, 'matchMedia', { value: () => mql, configurable: true, writable: true });
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
  return { mql, listeners };
}

function Probe() {
  const mobile = useIsMobile();
  return <p>{mobile ? 'seluler' : 'desktop'}</p>;
}

describe('useIsMobile', () => {
  it('mengembalikan false pada viewport desktop', () => {
    installMatchMedia(1024);
    render(<Probe />);
    expect(screen.getByText('desktop')).toBeDefined();
  });

  it('mengembalikan true pada viewport mobile', () => {
    installMatchMedia(375);
    render(<Probe />);
    expect(screen.getByText('seluler')).toBeDefined();
  });

  it('memperbarui status saat media query berubah dan berhenti saat unmount', () => {
    const { mql, listeners } = installMatchMedia(1024);
    const { unmount } = render(<Probe />);
    expect(screen.getByText('desktop')).toBeDefined();
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true, writable: true });
      for (const handler of listeners) handler();
    });
    expect(screen.getByText('seluler')).toBeDefined();
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
