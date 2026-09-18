import { describe, expect, it } from 'vitest';

import { terbilangIdr } from '@/modules/billing/terbilang';

describe('terbilangIdr', () => {
  it('mengeja nol', () => {
    expect(terbilangIdr(0)).toBe('Nol Rupiah');
  });

  it('mengeja satuan dan belasan khusus', () => {
    expect(terbilangIdr(1)).toBe('Satu Rupiah');
    expect(terbilangIdr(10)).toBe('Sepuluh Rupiah');
    expect(terbilangIdr(11)).toBe('Sebelas Rupiah');
    expect(terbilangIdr(12)).toBe('Dua Belas Rupiah');
    expect(terbilangIdr(19)).toBe('Sembilan Belas Rupiah');
  });

  it('mengeja puluhan dan ratusan', () => {
    expect(terbilangIdr(20)).toBe('Dua Puluh Rupiah');
    expect(terbilangIdr(21)).toBe('Dua Puluh Satu Rupiah');
    expect(terbilangIdr(100)).toBe('Seratus Rupiah');
    expect(terbilangIdr(101)).toBe('Seratus Satu Rupiah');
    expect(terbilangIdr(200)).toBe('Dua Ratus Rupiah');
  });

  it('memakai seribu untuk seribuan', () => {
    expect(terbilangIdr(1000)).toBe('Seribu Rupiah');
    expect(terbilangIdr(1100)).toBe('Seribu Seratus Rupiah');
    expect(terbilangIdr(2000)).toBe('Dua Ribu Rupiah');
  });

  it('mengeja nominal faktur preview', () => {
    expect(terbilangIdr(550000)).toBe('Lima Ratus Lima Puluh Ribu Rupiah');
  });

  it('mengeja skala juta ke atas', () => {
    expect(terbilangIdr(1500000)).toBe('Satu Juta Lima Ratus Ribu Rupiah');
    expect(terbilangIdr(1000000000)).toBe('Satu Miliar Rupiah');
  });

  it('menolak nominal tak valid', () => {
    expect(() => terbilangIdr(-1)).toThrow(RangeError);
    expect(() => terbilangIdr(1.5)).toThrow(RangeError);
    expect(() => terbilangIdr(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
