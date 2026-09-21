// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ConversionFunnel, TopRanked } from '@/modules/dashboard/components/analytics/summary-insights';

afterEach(() => {
  cleanup();
});

describe('Corong konversi', () => {
  it('merender tiga tahap dengan laju konversi', () => {
    render(<ConversionFunnel active={10} tasks={8} succeeded={6} />);
    expect(screen.getByText('Corong konversi')).toBeDefined();
    expect(screen.getByText('Artikel aktif')).toBeDefined();
    expect(screen.getByText('80% dari artikel')).toBeDefined();
    expect(screen.getByText('75% dari tugas')).toBeDefined();
  });
});

describe('Peringkat teratas', () => {
  it('mengurutkan menurun dan membatasi lima baris', () => {
    render(
      <TopRanked
        title="Wilayah teratas"
        rows={[
          { key: 'a', count: 1 },
          { key: 'b', count: 9 },
          { key: 'c', count: 4 },
        ]}
      />,
    );
    const order = screen.getAllByText(/^[abc]$/).map((el) => el.textContent);
    expect(order).toEqual(['b', 'c', 'a']);
  });

  it('menampilkan pesan kosong saat nihil', () => {
    render(<TopRanked title="Wilayah teratas" rows={[]} />);
    expect(screen.getByText('Belum ada data.')).toBeDefined();
  });
});
