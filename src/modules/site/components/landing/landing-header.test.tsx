// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { LandingHeader } from '@/modules/site/components/landing/landing-header';

const pathState = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathState.current,
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  pathState.current = '/';
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
    const openButton = screen.getByRole('button', { name: 'Buka menu navigasi' });
    fireEvent.click(openButton);
    expect(openButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Tutup menu navigasi' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Tutup menu navigasi' }));
    expect(openButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('tidak memutar animasi tutup saat mount awal, tapi tetap beranimasi saat dibuka', () => {
    render(<LandingHeader />);
    const animateMock = vi.mocked(Element.prototype.animate);
    expect(animateMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Buka menu navigasi' }));
    expect(animateMock).toHaveBeenCalled();
  });

  it('menandai tautan aktif sesuai pathname', () => {
    pathState.current = '/pricing';
    render(<LandingHeader />);
    const links = screen.getAllByRole('link', { name: 'Harga' });
    expect(links.some((el) => el.getAttribute('aria-current') === 'page')).toBe(true);
  });
});
