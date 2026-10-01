// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { CategoryNavStrip } from '@/modules/site/components/network/ui/category-nav-strip';

afterEach(() => {
  cleanup();
});

function kanal(n: number) {
  return Array.from({ length: n }, (_, i) => ({ label: `Kat ${i + 1}`, href: `/kat-${i + 1}`, slug: `kat-${i + 1}` }));
}

describe('CategoryNavStrip', () => {
  it('geser horizontal snap dan tutup dengan indeks', () => {
    render(<CategoryNavStrip categories={kanal(7)} path="/" />);
    const nav = screen.getByRole('navigation', { name: 'Kanal liputan' });
    expect(nav.querySelector('ul')?.getAttribute('class')).toMatch(/snap-x/);
    const links = within(nav).getAllByRole('link');
    expect(links[links.length - 1]?.textContent).toBe('Indeks');
    expect(links[links.length - 1]?.getAttribute('href')).toBe('/indeks');
  });

  it('tandai kanal aktif dengan underline dan aria-current', () => {
    render(<CategoryNavStrip categories={kanal(3)} path="/kat-2" />);
    const active = screen.getByRole('link', { name: 'Kat 2' });
    expect(active.getAttribute('aria-current')).toBe('page');
    expect(active.getAttribute('class')).toMatch(/underline/);
  });

  it('tanpa indikator dot warna', () => {
    render(<CategoryNavStrip categories={kanal(2)} path="/" />);
    const nav = screen.getByRole('navigation', { name: 'Kanal liputan' });
    const dots = nav.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(0);
  });

  it('tersembunyi pada sm ke atas', () => {
    render(<CategoryNavStrip categories={kanal(2)} path="/" />);
    const nav = screen.getByRole('navigation', { name: 'Kanal liputan' });
    expect(nav.getAttribute('class')).toMatch(/sm:hidden/);
  });
});
