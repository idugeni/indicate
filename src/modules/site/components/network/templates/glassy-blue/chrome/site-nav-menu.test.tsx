// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { GlassyBlueDesktopNav, GlassyBlueMobileNav } from '@/modules/site/components/network/templates/glassy-blue/chrome/site-nav-menu';

afterEach(() => {
  cleanup();
});

function kanal(n: number) {
  return Array.from({ length: n }, (_, i) => ({ label: `Kat ${i + 1}`, href: `/kat-${i + 1}` }));
}

describe('GlassyBlueDesktopNav', () => {
  it('menampilkan beranda, lima kategori, dan pemicu lainnya', () => {
    render(<GlassyBlueDesktopNav categories={kanal(7)} path="/" />);
    expect(screen.getByRole('link', { name: 'Beranda' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Kat 5' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Kat 6' })).toBe(null);
    expect(screen.getByRole('button', { name: /kategori lainnya \(2\)/i })).toBeDefined();
  });

  it('menandai path aktif', () => {
    render(<GlassyBlueDesktopNav categories={kanal(3)} path="/kat-2" />);
    expect(screen.getByRole('link', { name: 'Kat 2' }).getAttribute('aria-current')).toBe('page');
  });

  it('membuka menu lainnya dan menampilkan sisa kategori', async () => {
    render(<GlassyBlueDesktopNav categories={kanal(7)} path="/" />);
    fireEvent.click(screen.getByRole('button', { name: /kategori lainnya/i }));
    expect(await screen.findByRole('menuitem', { name: 'Kat 6' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Kat 7' })).toBeDefined();
  });
});

describe('GlassyBlueMobileNav', () => {
  it('menampilkan seluruh kategori dan tautan informasi', () => {
    render(<GlassyBlueMobileNav categories={kanal(3)} path="/" />);
    expect(screen.getByRole('link', { name: 'Beranda' })).toBeDefined();
    expect(screen.getByText('Kategori')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Kat 3' })).toBeDefined();
    expect(screen.getByText('Informasi')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Profil' }).getAttribute('href')).toBe('/tentang');
    expect(screen.getByRole('link', { name: 'Kontak' })).toBeDefined();
  });

  it('menandai path aktif', () => {
    render(<GlassyBlueMobileNav categories={kanal(3)} path="/tentang" />);
    expect(screen.getByRole('link', { name: 'Profil' }).getAttribute('aria-current')).toBe('page');
  });
});
