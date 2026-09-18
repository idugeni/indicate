import { describe, expect, it } from 'vitest';

import { humanizeSlug } from '@/app/(network)/[slug]/opengraph-image';

describe('humanizeSlug', () => {
  it('mengubah slug menjadi judul title-case', () => {
    expect(humanizeSlug('banjir-wonosobo-meluap')).toBe('Banjir Wonosobo Meluap');
  });

  it('membatasi 12 kata dan 110 karakter', () => {
    expect(humanizeSlug('a-b-c-d-e-f-g-h-i-j-k-l-m-n')).toBe('A B C D E F G H I J K L');
    const long = humanizeSlug(`${'kata'.repeat(40)}-akhir`);
    expect(long.endsWith('…')).toBe(true);
    expect(long.length).toBe(108);
  });

  it('jatuh ke Artikel saat slug kosong', () => {
    expect(humanizeSlug('---')).toBe('Artikel');
  });
});
