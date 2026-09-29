// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { ConversionFunnel, TopRanked } from '@/modules/dashboard/components/analytics/summary-insights';

afterEach(() => {
  cleanup();
});

describe('Corong konversi', () => {
  it('merender tiga tahap dengan fan-out portal, bukan persen artikel', () => {
    render(<ConversionFunnel active={10} deliveries={1340} succeeded={1340} />);
    expect(screen.getByText('Corong konversi')).toBeDefined();
    expect(screen.getByText('Artikel aktif')).toBeDefined();
    expect(screen.getByText('Portal tujuan')).toBeDefined();
    expect(screen.getByText('Rata-rata 134 portal per artikel')).toBeDefined();
    expect(screen.getByText('100% dari portal')).toBeDefined();
    expect(screen.queryByText(/dari artikel$/)).toBeNull();
  });

  it('menyembunyikan rasio saat belum ada artikel aktif', () => {
    render(<ConversionFunnel active={0} deliveries={0} succeeded={0} />);
    expect(screen.queryByText('Rata-rata 134 portal per artikel')).toBeNull();
    expect(screen.getByText('— dari portal')).toBeDefined();
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
