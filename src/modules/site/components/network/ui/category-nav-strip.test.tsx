// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within, act } from '@testing-library/react';

import { CategoryNavStrip } from '@/modules/site/components/network/ui/category-nav-strip';

afterEach(() => {
  geser(0);
  cleanup();
});

function kanal(n: number) {
  return Array.from({ length: n }, (_, i) => ({ label: `Kat ${i + 1}`, href: `/kat-${i + 1}`, slug: `kat-${i + 1}` }));
}

function geser(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  });
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

  it('tersembunyi pada lg ke atas', () => {
    render(<CategoryNavStrip categories={kanal(2)} path="/" />);
    const nav = screen.getByRole('navigation', { name: 'Kanal liputan' });
    expect(nav.getAttribute('class')).toMatch(/lg:hidden/);
  });

  it('tertutup begitu halaman digulir dan terbuka lagi di puncak', () => {
    render(<CategoryNavStrip categories={kanal(2)} path="/" />);
    const nav = screen.getByRole('navigation', { name: 'Kanal liputan' });

    expect(nav.getAttribute('class')).toMatch(/grid-rows-\[1fr\]/);

    geser(400);
    expect(nav.getAttribute('class')).toMatch(/grid-rows-\[0fr\]/);
    expect(nav.getAttribute('inert')).not.toBeNull();
    expect(nav.getAttribute('aria-hidden')).toBe('true');

    geser(0);
    expect(nav.getAttribute('class')).toMatch(/grid-rows-\[1fr\]/);
    expect(nav.getAttribute('inert')).toBeNull();
    expect(nav.getAttribute('aria-hidden')).toBe('false');
  });

  it('tahan guncangan kecil di sekitar puncak', () => {
    render(<CategoryNavStrip categories={kanal(2)} path="/" />);
    const nav = screen.getByRole('navigation', { name: 'Kanal liputan' });

    geser(12);
    expect(nav.getAttribute('class')).toMatch(/grid-rows-\[1fr\]/);
  });
});
