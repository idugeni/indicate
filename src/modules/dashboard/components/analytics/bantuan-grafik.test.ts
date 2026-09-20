import { describe, expect, it } from 'vitest';

import { PALET_KATEGORI, labelHari, potongLabel, warnaKategori } from '@/modules/dashboard/components/analytics/bantuan-grafik';

describe('Fondasi warna dashboard', () => {
  it('menyediakan 12 warna kategorikal unik yang valid', () => {
    expect(PALET_KATEGORI).toHaveLength(12);
    expect(new Set(PALET_KATEGORI).size).toBe(12);
    for (const warna of PALET_KATEGORI) {
      expect(warna).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('membungkus indeks di luar rentang secara deterministik', () => {
    expect(warnaKategori(0)).toBe(PALET_KATEGORI[0]);
    expect(warnaKategori(11)).toBe(PALET_KATEGORI[11]);
    expect(warnaKategori(12)).toBe(PALET_KATEGORI[0]);
    expect(warnaKategori(-1)).toBe(PALET_KATEGORI[11]);
  });

  it('memformat label hari dan potongan label', () => {
    expect(labelHari('2026-09-18')).toBe('18 Sep');
    expect(labelHari('bukan-tanggal')).toBe('bukan-tanggal');
    expect(potongLabel('portal.example')).toBe('portal.example');
    expect(potongLabel('wonosobo.wartakini7.web.id', 18)).toBe('wonosobo.wartakin…');
  });
});
