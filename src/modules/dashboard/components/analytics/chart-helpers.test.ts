import { describe, expect, it } from 'vitest';

import { CATEGORY_PALETTE, weekdayLabel, truncateLabel, categoryColor } from '@/modules/dashboard/components/analytics/chart-helpers';

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
