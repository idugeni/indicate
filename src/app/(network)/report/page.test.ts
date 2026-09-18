import { describe, expect, it } from 'vitest';

import { normalizeSlug } from '@/app/(network)/report/page';

describe('normalizeSlug', () => {
  it('menormalkan huruf kecil dan memotong 200 karakter', () => {
    expect(normalizeSlug('Judul-Berita')).toBe('judul-berita');
    expect(normalizeSlug(`  ${'x'.repeat(300)}  `)?.length).toBe(200);
  });

  it('mengembalikan null saat kosong dan memakai entri pertama', () => {
    expect(normalizeSlug(undefined)).toBe(null);
    expect(normalizeSlug('   ')).toBe(null);
    expect(normalizeSlug(['Satu', 'Dua'])).toBe('satu');
  });
});
