import { describe, expect, it } from 'vitest';

import { findMatchingCategoryId, generateIdempotencyUuid, normalizeCategoryKey, slugify } from '@/modules/dashboard/components/shared/form-utils';

describe('slugify', () => {
  it('menurunkan huruf dan mengganti spasi dengan strip', () => {
    expect(slugify('Berita Utama Hari Ini')).toBe('berita-utama-hari-ini');
  });

  it('membuang tanda baca dan merapikan tepi', () => {
    expect(slugify('  Liputan: Wonosobo & Sekitarnya!  ')).toBe('liputan-wonosobo-sekitarnya');
  });

  it('menggabungkan spasi beruntun menjadi satu strip', () => {
    expect(slugify('anggaran   daerah   2026')).toBe('anggaran-daerah-2026');
  });

  it('mempertahankan garis bawah dan angka', () => {
    expect(slugify('posko_mudik 2026')).toBe('posko_mudik-2026');
  });

  it('mengembalikan string kosong untuk masukan kosong', () => {
    expect(slugify('')).toBe('');
  });
});

describe('generateIdempotencyUuid', () => {
  it('menghasilkan uuid acak yang unik', () => {
    const first = generateIdempotencyUuid();
    const second = generateIdempotencyUuid();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
  });
});

describe('normalizeCategoryKey', () => {
  it('menyamakan huruf, spasi, dan tanda baca', () => {
    expect(normalizeCategoryKey('Berita Utama')).toBe('berita utama');
    expect(normalizeCategoryKey('  BERITA   utama  ')).toBe('berita utama');
    expect(normalizeCategoryKey('Berita-Utama!')).toBe('berita utama');
  });

  it('membaca & sebagai dan', () => {
    expect(normalizeCategoryKey('R&D')).toBe('r dan d');
    expect(normalizeCategoryKey('Politik & Hukum')).toBe('politik dan hukum');
  });

  it('mengembalikan string kosong untuk masukan kosong', () => {
    expect(normalizeCategoryKey('   ')).toBe('');
  });
});

describe('findMatchingCategoryId', () => {
  const categories = [
    { id: 'c-1', name: 'Berita Utama' },
    { id: 'c-2', name: 'Politik & Hukum' },
  ];

  it('menemukan kategori walau beda huruf dan spasi', () => {
    expect(findMatchingCategoryId(categories, 'berita  UTAMA')).toBe('c-1');
  });

  it('menemukan kategori dengan & yang ditulis dan', () => {
    expect(findMatchingCategoryId(categories, 'politik dan hukum')).toBe('c-2');
  });

  it('mengembalikan null untuk nama baru atau kosong', () => {
    expect(findMatchingCategoryId(categories, 'Olahraga')).toBeNull();
    expect(findMatchingCategoryId(categories, '   ')).toBeNull();
  });
});
