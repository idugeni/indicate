import { describe, expect, it } from 'vitest';

import { slugify } from '@/modules/site/slugify';

describe('slugify', () => {
  it('mempertahankan garis bawah agar slug lama tetap cocok', () => {
    expect(slugify('posko_mudik 2026')).toBe('posko_mudik-2026');
  });

  it('menterjemahkan huruf beraksen ke huruf dasarnya', () => {
    expect(slugify('Hôtel')).toBe('hotel');
    expect(slugify('Curaçao')).toBe('curacao');
    expect(slugify('Đà Nẵng')).toBe('da-nang');
  });

  it('menterjemahkan huruf yang tidak punya dekomposisi NFKD', () => {
    expect(slugify('Łódź')).toBe('lodz');
    expect(slugify('Østerbro')).toBe('osterbro');
    expect(slugify('Straße')).toBe('strasse');
  });

  it('merapikan tanda hubung di tepi', () => {
    expect(slugify('-leading')).toBe('leading');
    expect(slugify('trailing---')).toBe('trailing');
  });

  it('mengembalikan string kosong untuk masukan kosong', () => {
    expect(slugify('')).toBe('');
  });
});
