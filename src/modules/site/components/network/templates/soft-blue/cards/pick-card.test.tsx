// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { SoftBluePickCard } from '@/modules/site/components/network/templates/soft-blue/cards/pick-card';

afterEach(() => {
  cleanup();
});

const artikel = makeNetworkArticle({
  id: 'a-1',
  slug: 'berita',
  title: 'Judul berita',
  attribution: 'Redaksi Mediaindomedia',
  categoryName: 'Politik',
  viewCount: 1234567,
});

/** Baris bawah card: ArticleMeta berdampingan tombol panah. */
function barisMeta(): HTMLElement {
  const panah = screen.getByRole('link', { name: /^Baca:/ });
  const baris = panah.parentElement;
  if (baris === null) throw new Error('baris meta tidak ditemukan');
  return baris;
}

describe('SoftBluePickCard pembungkusan', () => {
  it('ArticleMeta boleh menyusut — tanpa min-w-0 ia mendorong tombol keluar', () => {
    render(<SoftBluePickCard article={artikel} index={0} />);
    const meta = barisMeta().firstElementChild;
    expect(meta?.getAttribute('class') ?? '').toMatch(/min-w-0/);
  });

  it('badge kategori punya batas lebar dan truncate, bukan w-fit', () => {
    render(<SoftBluePickCard article={artikel} index={0} />);
    // getByText mengembalikan <span> dalam; kotaknya adalah induknya.
    const kotak = screen.getByText('Politik').parentElement;
    expect(kotak?.getAttribute('class') ?? '').toMatch(/max-w-full/);
    expect(kotak?.getAttribute('class') ?? '').not.toMatch(/w-fit/);
    expect(screen.getByText('Politik').getAttribute('class') ?? '').toMatch(/truncate/);
  });

  it('kolom teks dan judul tetap punya pembungkusan yang benar', () => {
    render(<SoftBluePickCard article={artikel} index={0} />);
    const judul = screen.getByRole('heading', { level: 3 });
    expect(judul.getAttribute('class') ?? '').toMatch(/line-clamp/);
    expect(judul.parentElement?.getAttribute('class') ?? '').toMatch(/min-w-0/);
  });

  it('gambar tidak ikut melar (flex-none + lebar tetap)', () => {
    const { container } = render(<SoftBluePickCard article={artikel} index={0} />);
    // Dua link berbagi nama "Judul berita"; yang dicari adalah pembungkus <img>.
    const gambar = container.querySelector('a:has(img)');
    const kelas = gambar?.getAttribute('class') ?? '';
    expect(kelas).toMatch(/\bw-32\b/);
    expect(kelas).toMatch(/flex-none/);
  });
});