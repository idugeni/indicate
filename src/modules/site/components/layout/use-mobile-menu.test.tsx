// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { useMobileMenu } from '@/modules/site/components/layout/use-mobile-menu';

const jalur = vi.hoisted(() => ({ saatIni: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => jalur.saatIni,
}));

type DesktopHandler = (event: { matches: boolean }) => void;

let tanganiDesktop: DesktopHandler | null = null;

function Probe() {
  const { open, setOpen, menuButtonRef, panelRef, closeButtonRef } = useMobileMenu();
  return (
    <>
      <button ref={menuButtonRef} type="button" onClick={() => setOpen(true)}>
        buka menu
      </button>
      <p>{open ? 'terbuka' : 'tertutup'}</p>
      {open ? (
        <div ref={panelRef}>
          <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)}>
            tutup menu
          </button>
          <button type="button">layanan</button>
        </div>
      ) : null}
    </>
  );
}

beforeEach(() => {
  jalur.saatIni = '/';
  tanganiDesktop = null;
  const mql = {
    matches: false,
    addEventListener: vi.fn((_jenis: string, rawat: DesktopHandler) => {
      tanganiDesktop = rawat;
    }),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, 'matchMedia', { value: () => mql, configurable: true, writable: true });
  document.body.style.overflow = '';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useMobileMenu', () => {
  it('membuka menu, mengunci scroll body, dan fokus ke tombol tutup', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'buka menu' }));
    expect(screen.getByText('terbuka')).toBeDefined();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'tutup menu' }));
  });

  it('menutup lewat Escape dan mengembalikan fokus ke tombol buka', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'buka menu' }));
    act(() => {
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.getByText('tertutup')).toBeDefined();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'buka menu' }));
  });

  it('menutup otomatis saat pathname berubah', () => {
    const { rerender } = render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'buka menu' }));
    expect(screen.getByText('terbuka')).toBeDefined();
    jalur.saatIni = '/layanan';
    rerender(<Probe />);
    expect(screen.getByText('tertutup')).toBeDefined();
  });

  it('menutup saat viewport menjadi desktop', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'buka menu' }));
    act(() => {
      tanganiDesktop?.({ matches: true });
    });
    expect(screen.getByText('tertutup')).toBeDefined();
  });

  it('menjebak fokus Tab di dalam panel', () => {
    render(<Probe />);
    fireEvent.click(screen.getByRole('button', { name: 'buka menu' }));
    const pertama = screen.getByRole('button', { name: 'tutup menu' });
    const terakhir = screen.getByRole('button', { name: 'layanan' });
    pertama.focus();
    act(() => {
      pertama.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    });
    expect(document.activeElement).toBe(terakhir);
  });
});
