// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { SankeyFlow } from '@/modules/dashboard/components/analytics/sankey';
import { StackedTasks } from '@/modules/dashboard/components/analytics/stack';
import { MetricComparison, PublicationTrend } from '@/modules/dashboard/components/analytics/trend';
import type { PublisherFlow, TaskDay } from '@/modules/dashboard/models';

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

function days(count: number): TaskDay[] {
  return Array.from({ length: count }, (slot, index) => ({
    hari: `2026-09-${String(index + 1).padStart(2, '0')}`,
    diterbitkan: 1,
    gagal: 0,
    antre: 2,
  }));
}

describe('Alur penerbit', () => {
  it('menampilkan pesan kosong tanpa arus', () => {
    render(<SankeyFlow flows={[]} />);
    expect(screen.getByText('Belum ada arus penerbit.')).toBeDefined();
  });

  it('merender kartu grafik begitu ada arus', () => {
    const flows: readonly PublisherFlow[] = [
      { penerbit: 'p-1', situs: 's-1', hasil: 'published', jumlah: 3 },
      { penerbit: 'p-1', situs: 's-2', hasil: 'failed', jumlah: 1 },
    ];
    render(<SankeyFlow flows={flows} />);
    expect(screen.queryByText('Belum ada arus penerbit.')).toBeNull();
    expect(screen.getByText('Alur penerbit')).toBeDefined();
  });
});

describe('Tugas bertumpuk', () => {
  it('menampilkan pesan kosong tanpa deret waktu', () => {
    render(<StackedTasks series={[]} />);
    expect(screen.getByText('Belum ada data deret waktu.')).toBeDefined();
  });

  it('merender batang bertumpuk begitu ada deret waktu', () => {
    render(<StackedTasks series={days(3)} />);
    expect(screen.queryByText('Belum ada data deret waktu.')).toBeNull();
    expect(screen.getByText('Diterbitkan, gagal, dan antre per hari')).toBeDefined();
  });
});

describe('Tren publikasi', () => {
  it('memakai rentang 30 hari sebagai bawaan', () => {
    render(<PublicationTrend series={days(3)} />);
    expect(screen.getByRole('button', { name: '30 hari' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '7 hari' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('berpindah rentang saat tombol lain ditekan', () => {
    render(<PublicationTrend series={days(3)} />);
    fireEvent.click(screen.getByRole('button', { name: '7 hari' }));
    expect(screen.getByRole('button', { name: '7 hari' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '30 hari' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('menampilkan pesan kosong tanpa deret waktu', () => {
    render(<PublicationTrend series={[]} />);
    expect(screen.getByText('Belum ada data deret waktu.')).toBeDefined();
  });
});

describe('Perbandingan metrik', () => {
  it('merender tiga metrik harian untuk 30 hari terakhir', () => {
    render(<MetricComparison series={days(3)} />);
    expect(screen.getByText('Tiga metrik harian, 30 hari terakhir')).toBeDefined();
  });

  it('menampilkan pesan kosong tanpa deret waktu', () => {
    render(<MetricComparison series={[]} />);
    expect(screen.getByText('Belum ada data deret waktu.')).toBeDefined();
  });
});
