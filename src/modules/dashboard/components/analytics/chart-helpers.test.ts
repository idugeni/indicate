import { describe, expect, it } from 'vitest';

import { CATEGORY_PALETTE, weekdayLabel, truncateLabel, categoryColor, hasAnalyticsSignal } from '@/modules/dashboard/components/analytics/chart-helpers';
import type { AnalyticsProjection, TaskDay } from '@/modules/dashboard/models';

describe('Fondasi warna dashboard', () => {
  it('menyediakan 12 warna kategorikal unik yang valid', () => {
    expect(CATEGORY_PALETTE).toHaveLength(12);
    expect(new Set(CATEGORY_PALETTE).size).toBe(12);
    for (const warna of CATEGORY_PALETTE) {
      expect(warna).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('membungkus indeks di luar rentang secara deterministik', () => {
    expect(categoryColor(0)).toBe(CATEGORY_PALETTE[0]);
    expect(categoryColor(11)).toBe(CATEGORY_PALETTE[11]);
    expect(categoryColor(12)).toBe(CATEGORY_PALETTE[0]);
    expect(categoryColor(-1)).toBe(CATEGORY_PALETTE[11]);
  });

  it('memformat label hari dan potongan label', () => {
    expect(weekdayLabel('2026-09-18')).toBe('18 Sep');
    expect(weekdayLabel('bukan-tanggal')).toBe('bukan-tanggal');
    expect(truncateLabel('portal.example')).toBe('portal.example');
    expect(truncateLabel('wonosobo.wartakini7.web.id', 18)).toBe('wonosobo.wartakin…');
  });
});

const quietDay = (hari: string): TaskDay => ({ hari, diterbitkan: 0, gagal: 0, antre: 0 });

function projection(overrides: Partial<AnalyticsProjection> = {}): AnalyticsProjection {
  return {
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
    tugasHarian: [quietDay('2026-09-16'), quietDay('2026-09-17'), quietDay('2026-09-18')],
    aktivitasPerJam: [],
    aktivitasTerbaru: [],
    arusPenerbit: [],
    ...overrides,
  };
}

describe('Deteksi sinyal analitik', () => {
  it('menyatakan tidak ada sinyal saat deret harian padat bernilai nol', () => {
    expect(hasAnalyticsSignal(projection())).toBe(false);
  });

  it('menerima satu bucket harian yang tidak nol sebagai sinyal', () => {
    const withTask = projection({
      tugasHarian: [quietDay('2026-09-16'), { hari: '2026-09-17', diterbitkan: 1, gagal: 0, antre: 0 }],
    });
    expect(hasAnalyticsSignal(withTask)).toBe(true);
  });

  it('menerima satu baris dimensi sebagai sinyal', () => {
    expect(hasAnalyticsSignal(projection({ articlesByRegion: [{ key: 'reg-1', count: 1 }] }))).toBe(true);
    expect(hasAnalyticsSignal(projection({ jobsByState: [{ key: 'queued', count: 1 }] }))).toBe(true);
  });

  it('tidak melempar pada proyeksi parsial yang tertanam di snapshot cached', () => {
    const partial = { articlesByRegion: [] } as unknown as AnalyticsProjection;
    expect(hasAnalyticsSignal(partial)).toBe(false);
  });
});
