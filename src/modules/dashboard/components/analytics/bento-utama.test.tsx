// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { BarTayanganSitus, BentoUtama, GarisTayangan, GelembungTayangan, TumpukanSitus } from '@/modules/dashboard/components/analytics/bento-utama';
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

const ANALYTICS: AnalyticsProjection = {
  articlesByRegion: [{ key: 'r-1', count: 2 }],
  articlesBySite: [{ key: 's-1', count: 2 }],
  articlesByCategory: [{ key: 'c-1', count: 2 }],
  articlesByPublisher: [{ key: 'p-1', count: 2 }],
  articlesByStatus: [{ key: 'active', count: 2 }],
  jobsByState: [],
  jobsBySiteRegionAndState: [],
  outcomesBySiteAndState: [{ key: 's-1:published', count: 2 }],
  outcomesBySiteRegionAndState: [],
  jendela: { awal: '2026-09-16', akhir: '2026-09-18' },
  tugasHarian: [
    { hari: '2026-09-16', diterbitkan: 0, gagal: 0, antre: 0 },
    { hari: '2026-09-17', diterbitkan: 0, gagal: 0, antre: 0 },
    { hari: '2026-09-18', diterbitkan: 0, gagal: 0, antre: 0 },
  ],
  penyaluranHarian: [
    { hari: '2026-09-16', diterbitkan: 1, gagal: 0, antre: 0 },
    { hari: '2026-09-17', diterbitkan: 1, gagal: 0, antre: 0 },
    { hari: '2026-09-18', diterbitkan: 0, gagal: 0, antre: 0 },
  ],
  viewsHarian: [
    { hari: '2026-09-16', penyaluran: 1, views: 600 },
    { hari: '2026-09-17', penyaluran: 1, views: 400 },
    { hari: '2026-09-18', penyaluran: 0, views: 0 },
  ],
  viewsBySite: [{ key: 's-1', count: 2, views: 1000 }],
  viewsByArticle: [{ key: 'a-1', count: 2, views: 1000 }],
  totalViews: 1000,
  totalPenyaluran: 2,
  siteLabels: { 's-1': 'portal.example' },
  categoryLabels: { 'c-1': 'Nasional' },
  publisherLabels: { 'p-1': 'Redaksi' },
  regionLabels: { 'r-1': 'Jawa' },
  articleLabels: { 'a-1': 'Kabar' },
  aktivitasPerJam: [{ hari: 2, jam: 19, jumlah: 2 }],
  aktivitasTerbaru: [{ id: 'hasil:x', label: 'Kabar', status: 'published', at: '2026-09-18T09:00:00.000Z' }],
  arusPenerbit: [{ penerbit: 'p-1', situs: 's-1', hasil: 'published', jumlah: 2 }],
};

describe('Bento utama', () => {
  it('merender sebagai satu sel penuh grid induk', () => {
    const { container } = render(<BentoUtama jobs={{}} berhasil={0} gagal={0} aktif={0} arsip={0} analytics={null} />);
    expect((container.firstChild as HTMLElement | null)?.className ?? '').toContain('col-span-full');
  });

  it('merender lima belas jenis visual dalam satu grid', { timeout: 30000 }, () => {
    render(<BentoUtama jobs={{}} berhasil={2} gagal={0} aktif={2} arsip={0} analytics={ANALYTICS} />);
    expect(screen.getByText('Sukses 7 hari')).toBeDefined();
    expect(screen.getByText('Distribusi antrean')).toBeDefined();
    expect(screen.getByText('Corong konversi')).toBeDefined();
    expect(screen.getByText('Tingkat keberhasilan')).toBeDefined();
    expect(screen.getByText('Tren publikasi')).toBeDefined();
    expect(screen.getByText('Tren tayangan')).toBeDefined();
    expect(screen.getByText('Komposisi situs')).toBeDefined();
    expect(screen.getByText('Tayangan per situs')).toBeDefined();
    expect(screen.getByText('Peta panas')).toBeDefined();
    expect(screen.getByText('Kalender aktivitas')).toBeDefined();
    expect(screen.getByText('Alur penerbit')).toBeDefined();
    expect(screen.getByText('Pohon artikel')).toBeDefined();
    expect(screen.getByText('Gelembung tayangan')).toBeDefined();
    expect(screen.getByText('Matriks status')).toBeDefined();
    expect(screen.getByText('Lini masa')).toBeDefined();
    expect(screen.getByText('Wilayah teratas')).toBeDefined();
    expect(screen.getAllByText('portal.example').length).toBeGreaterThan(0);
  });

  it('menampilkan status kosong tanpa gagal saat analitik null', () => {
    render(<BentoUtama jobs={{}} berhasil={0} gagal={0} aktif={0} arsip={0} analytics={null} />);
    expect(screen.getByText('Belum ada data tayangan.')).toBeDefined();
    expect(screen.getByText('Belum ada data tayangan situs.')).toBeDefined();
    expect(screen.getByText('Belum ada data sebar tayangan.')).toBeDefined();
    expect(screen.getByText('Belum ada arus penerbit.')).toBeDefined();
    expect(screen.getByText('Belum ada aktivitas tercatat.')).toBeDefined();
  });

  it('merender visual tayangan mandiri', () => {
    render(<GarisTayangan series={ANALYTICS.viewsHarian ?? []} />);
    expect(screen.getByText('Tren tayangan')).toBeDefined();
    const { unmount } = render(<BarTayanganSitus baris={ANALYTICS.viewsBySite ?? []} label={(id) => ANALYTICS.siteLabels?.[id] ?? id} />);
    expect(screen.getByText('Tayangan per situs')).toBeDefined();
    unmount();
    render(<TumpukanSitus hasil={ANALYTICS.outcomesBySiteAndState} label={(id) => ANALYTICS.siteLabels?.[id] ?? id} />);
    expect(screen.getByText('Komposisi situs')).toBeDefined();
    render(<GelembungTayangan baris={ANALYTICS.viewsBySite ?? []} label={(id) => ANALYTICS.siteLabels?.[id] ?? id} />);
    expect(screen.getByText('Gelembung tayangan')).toBeDefined();
  });
});
