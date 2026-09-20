// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { DarkNavyDesktopNav, DarkNavyMobileNav } from '@/modules/site/components/network/templates/dark-navy/chrome/site-nav-menu';

afterEach(() => {
  cleanup();
});

function kanal(n: number) {
  return Array.from({ length: n }, (_, i) => ({ label: `Kat ${i + 1}`, href: `/kat-${i + 1}` }));
}

describe('DarkNavyDesktopNav', () => {
  it('menampilkan beranda, empat kategori, dan pemicu lainnya', () => {
    render(<DarkNavyDesktopNav categories={kanal(7)} path="/" />);
    expect(screen.getByRole('link', { name: 'Beranda' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Kat 4' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Kat 5' })).toBe(null);
    expect(screen.getByRole('button', { name: /kategori lainnya \(3\)/i })).toBeDefined();
  });

  it('menandai path aktif', () => {
    render(<DarkNavyDesktopNav categories={kanal(3)} path="/kat-2" />);
    expect(screen.getByRole('link', { name: 'Kat 2' }).getAttribute('aria-current')).toBe('page');
  });

  it('membuka menu lainnya dan menampilkan sisa kategori', async () => {
    render(<DarkNavyDesktopNav categories={kanal(7)} path="/" />);
    fireEvent.click(screen.getByRole('button', { name: /kategori lainnya/i }));
    expect(await screen.findByRole('menuitem', { name: 'Kat 5' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Kat 7' })).toBeDefined();
  });
});

describe('DarkNavyMobileNav', () => {
  it('menyembunyikan kategori dan informasi hingga dibuka', async () => {
    render(<DarkNavyMobileNav categories={kanal(3)} path="/" />);
    expect(screen.getByRole('link', { name: 'Beranda' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Kat 3' })).toBe(null);
    expect(screen.queryByRole('link', { name: 'Profil' })).toBe(null);
    fireEvent.click(screen.getByRole('button', { name: 'Kategori' }));
    expect(await screen.findByRole('link', { name: 'Kat 3' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Informasi' }));
    expect(await screen.findByRole('link', { name: 'Profil' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Profil' }).getAttribute('href')).toBe('/tentang');
    expect(screen.getByRole('link', { name: 'Kontak' })).toBeDefined();
  });

  it('menandai path aktif', async () => {
    render(<DarkNavyMobileNav categories={kanal(3)} path="/tentang" />);
    fireEvent.click(screen.getByRole('button', { name: 'Informasi' }));
    expect((await screen.findByRole('link', { name: 'Profil' })).getAttribute('aria-current')).toBe('page');
  });
});
