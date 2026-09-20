import { describe, expect, it } from 'vitest';

import {
  formatRelatif,
  formatTanggal,
  formatTanggalWaktu,
  presetRentang,
} from '@/modules/dashboard/components/shared/dashboard-dates';

describe('Util tanggal dasbor', () => {
  it('memformat tanggal kalender Indonesia', () => {
    expect(formatTanggal('2026-09-18T14:00:00.000Z')).toBe('18 Sep 2026');
  });

  it('mengembalikan input tak valid apa adanya', () => {
    expect(formatTanggal('bukan-tanggal')).toBe('bukan-tanggal');
    expect(formatTanggalWaktu('bukan-tanggal')).toBe('bukan-tanggal');
    expect(formatRelatif('bukan-tanggal')).toBe('bukan-tanggal');
  });

  it('memformat jarak relatif terhadap acuan', () => {
    const acuan = new Date('2026-09-18T14:00:00.000Z');
    expect(formatRelatif('2026-09-18T11:00:00.000Z', acuan)).toContain('3 jam');
  });

  it('menghasilkan rentang preset yang konsisten', () => {
    const acuan = new Date('2026-09-18T14:00:00.000Z');
    const hariIni = presetRentang('hari-ini', acuan);
    expect(hariIni.to).toBe(acuan.toISOString());
    expect(hariIni.from < hariIni.to).toBe(true);
    const tujuh = presetRentang('7-hari', acuan);
    const tigaPuluh = presetRentang('30-hari', acuan);
    expect(tujuh.from > tigaPuluh.from).toBe(true);
  });
});
