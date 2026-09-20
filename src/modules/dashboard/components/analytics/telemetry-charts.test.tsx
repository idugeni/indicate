// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { TelemetryCharts } from '@/modules/dashboard/components/analytics/telemetry-charts';
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

const PROYEKSI: AnalyticsProjection = {
  articlesByRegion: [{ key: 'reg-1', count: 3 }],
  articlesBySite: [],
  articlesByCategory: [{ key: 'kat-1', count: 2 }],
  articlesByPublisher: [],
  articlesByStatus: [{ key: 'active', count: 3 }],
  jobsByState: [{ key: 'queued', count: 5 }],
  jobsBySiteRegionAndState: [],
  outcomesBySiteAndState: [],
  outcomesBySiteRegionAndState: [],
  jendela: { awal: '2026-09-16', akhir: '2026-09-18' },
  tugasHarian: [
    { hari: '2026-09-16', diterbitkan: 1, gagal: 0, antre: 0 },
    { hari: '2026-09-17', diterbitkan: 0, gagal: 1, antre: 0 },
    { hari: '2026-09-18', diterbitkan: 0, gagal: 0, antre: 2 },
  ],
  aktivitasPerJam: [{ hari: 2, jam: 19, jumlah: 1 }],
  aktivitasTerbaru: [{ id: 'job:j-1', label: 'Kabar', status: 'queued', at: '2026-09-18T09:00:00.000Z' }],
  arusPenerbit: [{ penerbit: 'p-1', situs: 's-1', hasil: 'published', jumlah: 2 }],
};

const KOSONG: AnalyticsProjection = {
  articlesByRegion: [],
  articlesBySite: [],
  articlesByCategory: [],
  articlesByPublisher: [],
  articlesByStatus: [],
  jobsByState: [],
  jobsBySiteRegionAndState: [],
  outcomesBySiteAndState: [],
  outcomesBySiteRegionAndState: [],
  jendela: { awal: '2026-09-18', akhir: '2026-09-18' },
  tugasHarian: [],
  aktivitasPerJam: [],
  aktivitasTerbaru: [],
  arusPenerbit: [],
};

describe('Diagram telemetri', () => {
  it('merender kartu dimensi yang berisi data', () => {
    render(<TelemetryCharts data={PROYEKSI} />);
    expect(screen.getByText('Artikel per wilayah')).toBeDefined();
    expect(screen.getByText('Tugas per status')).toBeDefined();
    expect(screen.getAllByText('Belum ada data.')).toHaveLength(2);
  });

  it('mengembalikan null saat seluruh dimensi kosong', () => {
    const { container } = render(<TelemetryCharts data={KOSONG} />);
    expect(container.firstChild).toBe(null);
  });
});
