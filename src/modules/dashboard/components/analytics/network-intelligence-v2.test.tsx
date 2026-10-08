// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { NetworkIntelligenceV2 } from '@/modules/dashboard/components/analytics/network-intelligence-v2';
import type { AnalyticsProjection } from '@/modules/dashboard/models';

afterEach(() => cleanup());

const BASE: AnalyticsProjection = {
  articlesByRegion: [{ key: 'reg-1', count: 4 }],
  articlesBySite: [{ key: 'site-1', count: 3 }],
  articlesByCategory: [{ key: 'cat-1', count: 2 }],
  articlesByPublisher: [{ key: 'pub-1', count: 5 }],
  articlesByStatus: [],
  jobsByState: [{ key: 'published', count: 5 }],
  jobsBySiteRegionAndState: [],
  outcomesBySiteAndState: [{ key: 'site-1:published', count: 5 }],
  outcomesBySiteRegionAndState: [],
  jendela: { awal: '2026-10-01', akhir: '2026-10-08' },
  tugasHarian: [{ hari: '2026-10-01', diterbitkan: 2, gagal: 1, antre: 1 }, { hari: '2026-10-02', diterbitkan: 3, gagal: 0, antre: 0 }],
  penyaluranHarian: [{ hari: '2026-10-01', diterbitkan: 2, gagal: 1, antre: 1 }, { hari: '2026-10-02', diterbitkan: 3, gagal: 0, antre: 0 }],
  viewsHarian: [{ hari: '2026-10-01', views: 11, penyaluran: 2 }, { hari: '2026-10-02', views: 7, penyaluran: 3 }],
  aktivitasPerJam: [],
  aktivitasTerbaru: [],
  arusPenerbit: [{ penerbit: 'pub-1', situs: 'site-1', hasil: 'published', jumlah: 5 }],
  publisherLabels: { 'pub-1': 'Publisher A' },
  siteLabels: { 'site-1': 'portal.example' },
  regionLabels: { 'reg-1': 'Jawa Tengah' },
  categoryLabels: { 'cat-1': 'Berita' },
};

describe('NetworkIntelligenceV2', () => {
  it('renders production-derived network metrics and workspace sections', () => {
    render(<NetworkIntelligenceV2 data={BASE} />);
    expect(screen.getByRole('region', { name: 'Network Intelligence' })).toBeDefined();
    expect(screen.getByText('Published deliveries')).toBeDefined();
    expect(screen.getByText('Published deliveries').parentElement?.textContent).toContain('5');
    expect(screen.getByText('Reader views').parentElement?.textContent).toContain('18');
    expect(screen.getByRole('tab', { name: 'Network' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Content' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeDefined();
    expect(screen.getByText('Regional coverage')).toBeDefined();
  });
  it('shows an honest empty state when telemetry has no signal', () => {
    const empty = { ...BASE, articlesByRegion: [], articlesBySite: [], articlesByCategory: [], articlesByPublisher: [], articlesByStatus: [], jobsByState: [], jobsBySiteRegionAndState: [], outcomesBySiteAndState: [], outcomesBySiteRegionAndState: [], arusPenerbit: [], aktivitasPerJam: [], aktivitasTerbaru: [], tugasHarian: [{ hari: '2026-10-01', diterbitkan: 0, gagal: 0, antre: 0 }], penyaluranHarian: [], viewsHarian: [] };
    render(<NetworkIntelligenceV2 data={empty} />);
    expect(screen.getByText('Belum ada telemetry jaringan.')).toBeDefined();
  });
});
