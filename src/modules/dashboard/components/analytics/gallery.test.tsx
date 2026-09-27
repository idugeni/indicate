// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { TelemetryGallery } from '@/modules/dashboard/components/analytics/gallery';
import type { AnalyticsProjection } from '@/modules/dashboard/models';

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

const QUIET: AnalyticsProjection = {
  articlesByRegion: [],
  articlesBySite: [],
  articlesByCategory: [],
  articlesByPublisher: [],
  articlesByStatus: [],
  jobsByState: [],
  jobsBySiteRegionAndState: [],
  outcomesBySiteAndState: [],
  outcomesBySiteRegionAndState: [],
  jendela: { awal: '2026-09-16', akhir: '2026-09-18' },
  tugasHarian: [
    { hari: '2026-09-16', diterbitkan: 0, gagal: 0, antre: 0 },
    { hari: '2026-09-17', diterbitkan: 0, gagal: 0, antre: 0 },
  ],
  aktivitasPerJam: [],
  aktivitasTerbaru: [],
  arusPenerbit: [],
};

describe('Galeri telemetri', () => {
  it('menyaliensihkan seluruh tab grafik saat belum ada satu pun pengukuran', () => {
    render(<TelemetryGallery data={QUIET} />);
    expect(screen.getByText('Belum ada satu pun terpublikasi.')).toBeDefined();
    expect(screen.queryByRole('tab', { name: 'Ringkasan' })).toBe(null);
    expect(screen.queryByText('Tren publikasi')).toBe(null);
  });

  it('menyampilkan tab grafik begitu ada baris dimensi', () => {
    render(<TelemetryGallery data={{ ...QUIET, articlesByRegion: [{ key: 'reg-1', count: 4 }] }} />);
    expect(screen.queryByText('Belum ada satu pun terpublikasi.')).toBe(null);
    expect(screen.getByRole('tab', { name: 'Ringkasan' })).toBeDefined();
    expect(screen.getByText('Tren publikasi')).toBeDefined();
  });
});
