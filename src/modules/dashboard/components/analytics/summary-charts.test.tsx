// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { SummaryCharts, TingkatKeberhasilan } from '@/modules/dashboard/components/analytics/summary-charts';

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe(): void {
      return undefined;
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
  },
);

afterEach(() => {
  cleanup();
});

describe('Visual ringkasan', () => {
  it('merender legenda antrean dan hasil', () => {
    render(<SummaryCharts jobs={{ queued: 2, published: 1 }} berhasil={4} gagal={1} aktif={7} arsip={2} />);
    expect(screen.getByText('Distribusi antrean')).toBeDefined();
    expect(screen.getByText('Komposisi hasil')).toBeDefined();
    expect(screen.getByText('Komposisi artikel')).toBeDefined();
    expect(screen.getByText('queued')).toBeDefined();
    expect(screen.getByText('berhasil')).toBeDefined();
  });

  it('menampilkan pesan kosong saat total nol', () => {
    render(<SummaryCharts jobs={{}} berhasil={0} gagal={0} aktif={0} arsip={0} />);
    expect(screen.getByText(/Belum ada tugas penerbitan/)).toBeDefined();
    expect(screen.getByText(/Belum ada hasil penyaluran/)).toBeDefined();
    expect(screen.getByText(/Belum ada artikel/)).toBeDefined();
  });
});

describe('Cincin keberhasilan', () => {
  it('merender kadar persen dari hasil', () => {
    render(<TingkatKeberhasilan berhasil={3} gagal={1} />);
    expect(screen.getByText('Tingkat keberhasilan')).toBeDefined();
    expect(screen.getByText('75')).toBeDefined();
  });

  it('menampilkan pesan kosong saat nihil', () => {
    render(<TingkatKeberhasilan berhasil={0} gagal={0} />);
    expect(screen.getByText(/Belum ada hasil penyaluran/)).toBeDefined();
  });
});
