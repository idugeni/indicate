import { describe, expect, it } from 'vitest';

import {
  findDuplicateOverrides,
  validateTenantMetadata,
} from '@/modules/site/seo-validation';

const TITLE = 'Judul Artikel Yang Cukup Panjang Untuk Lolos';
const DESCRIPTION = 'Deskripsi artikel yang cukup panjang untuk melewati batas minimal lima puluh karakter validasi SEO.';

describe('validateTenantMetadata', () => {
  it('lolos untuk pasangan valid tanpa sibling', () => {
    expect(validateTenantMetadata(TITLE, DESCRIPTION)).toEqual([]);
  });

  it('menandai judul dan deskripsi yang hilang', () => {
    expect(validateTenantMetadata(null, undefined)).toEqual([
      { field: 'title', code: 'missing' },
      { field: 'description', code: 'missing' },
    ]);
  });

  it('menandai terlalu pendek dan terlalu panjang', () => {
    const short = validateTenantMetadata('Pendek', 'Singkat');
    expect(short).toContainEqual({ field: 'title', code: 'too_short' });
    expect(short).toContainEqual({ field: 'description', code: 'too_short' });
    const long = validateTenantMetadata('t'.repeat(161), 'd'.repeat(501));
    expect(long).toContainEqual({ field: 'title', code: 'too_long' });
    expect(long).toContainEqual({ field: 'description', code: 'too_long' });
  });

  it('menandai duplikat case-insensitive terhadap sibling', () => {
    const issues = validateTenantMetadata(TITLE.toUpperCase(), DESCRIPTION, [TITLE], [DESCRIPTION.toUpperCase()]);
    expect(issues).toContainEqual({ field: 'title', code: 'duplicate' });
    expect(issues).toContainEqual({ field: 'description', code: 'duplicate' });
  });
});

describe('findDuplicateOverrides', () => {
  it('lolos untuk override terdiferensiasi', () => {
    expect(
      findDuplicateOverrides({
        a: { title: 'Judul Pertama Yang Unik Sekali', description: DESCRIPTION },
        b: { title: 'Judul Kedua Yang Jelas Berbeda', description: `${DESCRIPTION} Tambahan.` },
      }),
    ).toEqual([]);
  });

  it('menandai judul dan deskripsi duplikat', () => {
    const issues = findDuplicateOverrides({
      a: { title: TITLE, description: DESCRIPTION },
      b: { title: TITLE, description: DESCRIPTION },
    });
    expect(issues).toContainEqual({ field: 'title', code: 'duplicate' });
    expect(issues).toContainEqual({ field: 'description', code: 'duplicate' });
  });

  it('mengabaikan field kosong', () => {
    expect(findDuplicateOverrides({ a: {}, b: {} })).toEqual([]);
  });
});
