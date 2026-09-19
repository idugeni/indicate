// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { LandingHeader } from '@/modules/site/components/landing/landing-header';

const jalur = vi.hoisted(() => ({ saatIni: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => jalur.saatIni,
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  jalur.saatIni = '/';
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(Element.prototype, 'animate', {
    value: vi.fn(() => ({ finished: Promise.resolve(), cancel: () => {} })),
    configurable: true,
    writable: true,
  });
});

describe('LandingHeader', () => {
  it('menampilkan brand dan tombol menu', () => {
    render(<LandingHeader />);
    expect(screen.getByRole('link', { name: 'Indicate beranda' })).toBeDefined();
    expect(screen.getAllByRole('link', { name: 'Harga' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Buka menu navigasi' })).toBeDefined();
  });

  it('membuka dan menutup menu seluler', () => {
    render(<LandingHeader />);
    const buka = screen.getByRole('button', { name: 'Buka menu navigasi' });
    fireEvent.click(buka);
    expect(buka.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Tutup menu navigasi' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu navigasi' }));
    expect(buka.getAttribute('aria-expanded')).toBe('false');
  });

  it('tidak memutar animasi tutup saat mount awal, tapi tetap beranimasi saat dibuka', () => {
    render(<LandingHeader />);
    const animasikan = vi.mocked(Element.prototype.animate);
    expect(animasikan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu navigasi' }));
    expect(animasikan).toHaveBeenCalled();
  });

  it('menandai tautan aktif sesuai pathname', () => {
    jalur.saatIni = '/pricing';
    render(<LandingHeader />);
    const tautan = screen.getAllByRole('link', { name: 'Harga' });
    expect(tautan.some((el) => el.getAttribute('aria-current') === 'page')).toBe(true);
  });
});
