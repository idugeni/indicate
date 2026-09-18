import { describe, expect, it } from 'vitest';

import { generateIdempotencyUuid, slugify } from '@/modules/dashboard/components/shared/form-utils';

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
    const pertama = generateIdempotencyUuid();
    const kedua = generateIdempotencyUuid();
    expect(pertama).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(kedua).not.toBe(pertama);
  });
});
