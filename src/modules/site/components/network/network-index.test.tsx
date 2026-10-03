// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { IndexContent } from '@/modules/site/components/network/network-index';

afterEach(() => {
  cleanup();
});

function siteWith(...slugs: readonly string[]) {
  return makeNetworkSite(
    slugs.map((slug, index) => makeNetworkArticle({ id: `a-${index}`, slug: `berita-${index}`, title: `Berita ${index}`, categorySlug: slug, categoryName: slug })),
  );
}

const CATEGORIES = [
  { label: 'Agama', href: '/categories/agama', slug: 'agama' },
  { label: 'Berita', href: '/categories/berita', slug: 'berita' },
];

describe('IndexPage', () => {
  it('menampilkan seluruh kanal aktif tanpa menyaring dari artikel halaman', () => {
    render(<IndexContent site={siteWith('berita', 'berita')} categories={CATEGORIES} />);
    expect(screen.getByRole('link', { name: 'Agama' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Berita' })).toBeDefined();
  });

  it('tidak mengklaim jumlah artikel per kanal', () => {
    render(<IndexContent site={siteWith('berita', 'berita')} categories={CATEGORIES} />);
    expect(screen.queryByText(/\d+ artikel/)).toBeNull();
  });

  it('tidak menyatakan kanal sebagai kosong', () => {
    render(<IndexContent site={siteWith('berita')} categories={CATEGORIES} />);
    expect(screen.queryByText(/belum memiliki artikel/)).toBeNull();
    expect(screen.queryByText(/Belum ada kanal .* berisi artikel/)).toBeNull();
  });

  it('menyatakan jumlah kanal sebenarnya, bukan jumlah kanal terisi', () => {
    render(<IndexContent site={siteWith()} categories={CATEGORIES} />);
    expect(screen.getByText(/Jelajahi 2 kanal liputan/)).toBeDefined();
  });

  it('menampilkan huruf sekali tanpa duplikat terlihat', () => {
    render(<IndexContent site={siteWith('berita')} categories={CATEGORIES} />);
    const section = screen.getByRole('region', { name: 'Kanal huruf B' });
    const heading = within(section).getByRole('heading', { name: 'Kanal huruf B' });
    expect(heading.querySelector('span[aria-hidden="true"]')?.textContent).toBe('B');
    expect(heading.querySelector('span.sr-only')?.textContent).toBe('Kanal huruf B');
    expect(heading.textContent).toBe('BKanal huruf B');
  });

  it('menyatakan kosong hanya saat memang tidak ada kanal', () => {
    render(<IndexContent site={siteWith('berita')} categories={[]} />);
    expect(screen.queryByRole('link', { name: /Berita/ })).toBeNull();
    expect(screen.getByText(/Belum ada kanal .* yang diterbitkan/)).toBeDefined();
  });
});