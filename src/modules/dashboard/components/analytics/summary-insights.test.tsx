// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { FunnelKonversi, PeringkatTeratas } from '@/modules/dashboard/components/analytics/summary-insights';

afterEach(() => {
  cleanup();
});

describe('Corong konversi', () => {
  it('merender tiga tahap dengan laju konversi', () => {
    render(<FunnelKonversi aktif={10} tugas={8} sukses={6} />);
    expect(screen.getByText('Corong konversi')).toBeDefined();
    expect(screen.getByText('Artikel aktif')).toBeDefined();
    expect(screen.getByText('80% dari artikel')).toBeDefined();
    expect(screen.getByText('75% dari tugas')).toBeDefined();
  });
});

describe('Peringkat teratas', () => {
  it('mengurutkan menurun dan membatasi lima baris', () => {
    render(
      <PeringkatTeratas
        judul="Wilayah teratas"
        baris={[
          { key: 'a', count: 1 },
          { key: 'b', count: 9 },
          { key: 'c', count: 4 },
        ]}
      />,
    );
    const urutan = screen.getAllByText(/^[abc]$/).map((el) => el.textContent);
    expect(urutan).toEqual(['b', 'c', 'a']);
  });

  it('menampilkan pesan kosong saat nihil', () => {
    render(<PeringkatTeratas judul="Wilayah teratas" baris={[]} />);
    expect(screen.getByText('Belum ada data.')).toBeDefined();
  });
});
