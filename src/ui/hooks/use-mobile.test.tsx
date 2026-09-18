// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

import { useIsMobile } from '@/ui/hooks/use-mobile';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function pasangMatchMedia(lebar: number) {
  const pendengar = new Set<() => void>();
  const mql = {
    matches: lebar < 768,
    addEventListener: vi.fn((_jenis: string, rawat: () => void) => {
      pendengar.add(rawat);
    }),
    removeEventListener: vi.fn((_jenis: string, rawat: () => void) => {
      pendengar.delete(rawat);
    }),
  };
  Object.defineProperty(window, 'matchMedia', { value: () => mql, configurable: true, writable: true });
  Object.defineProperty(window, 'innerWidth', { value: lebar, configurable: true, writable: true });
  return { mql, pendengar };
}

function Probe() {
  const mobil = useIsMobile();
  return <p>{mobil ? 'seluler' : 'desktop'}</p>;
}

describe('useIsMobile', () => {
  it('mengembalikan false pada viewport desktop', () => {
    pasangMatchMedia(1024);
    render(<Probe />);
    expect(screen.getByText('desktop')).toBeDefined();
  });

  it('mengembalikan true pada viewport mobile', () => {
    pasangMatchMedia(375);
    render(<Probe />);
    expect(screen.getByText('seluler')).toBeDefined();
  });

  it('memperbarui status saat media query berubah dan berhenti saat unmount', () => {
    const { mql, pendengar } = pasangMatchMedia(1024);
    const { unmount } = render(<Probe />);
    expect(screen.getByText('desktop')).toBeDefined();
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true, writable: true });
      for (const rawat of pendengar) rawat();
    });
    expect(screen.getByText('seluler')).toBeDefined();
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
