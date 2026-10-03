// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { SoftBlueArchivePager } from '@/modules/site/components/network/templates/soft-blue/cards/archive-pager';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

afterEach(() => {
  cleanup();
});

function artikel(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeNetworkArticle({ id: `a-${i}`, slug: `b-${i}`, title: `Berita ${i}`, attribution: 'Redaksi' }),
  );
}

const kelasGrid = () => screen.getByRole('region', { name: 'Kabar Lainnya' }).querySelector('.grid')?.getAttribute('class') ?? '';

describe('SoftBlueArchivePager', () => {
  it('tidak 2-kolom sebelum lg — kartu horizontal butuh lebar per kolom', () => {
    render(<SoftBlueArchivePager articles={artikel(6)} heading="Kabar Lainnya" description="Jelajahi" />);
    const kelas = kelasGrid();
    // `sm:grid-cols-2` menyisakan kolom teks ~70px di 640px sehingga baris meta
    // meluber keluar grid dan halaman bergeser horizontal.
    expect(kelas).not.toMatch(/sm:grid-cols-2/);
    expect(kelas).toMatch(/lg:grid-cols-2/);
  });

  it('tetap merender kartu dan heading', () => {
    render(<SoftBlueArchivePager articles={artikel(3)} heading="Kabar Lainnya" description="Jelajahi" />);
    expect(screen.getByRole('region', { name: 'Kabar Lainnya' })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Kabar Lainnya/ })).toBeDefined();
  });

  it('tidak merender apa pun saat kosong', () => {
    const { container } = render(<SoftBlueArchivePager articles={[]} heading="Kabar Lainnya" description="Jelajahi" />);
    expect(container.textContent).toBe('');
  });
});