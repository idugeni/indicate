import { describe, expect, it } from 'vitest';

import { allocateUniqueSlug, normalizeSlugCandidate } from '@/modules/site/slug-allocator';

describe('normalizeSlugCandidate', () => {
  it('menormalkan judul ke kebab-case', () => {
    expect(normalizeSlugCandidate('Rutan Wonosobo Siap WBK')).toBe('rutan-wonosobo-siap-wbk');
  });

  it('membuang karakter khusus dan underscore', () => {
    expect(normalizeSlugCandidate('Halo_Dunia! @2026')).toBe('halo-dunia-2026');
  });

  it('jatuh ke artikel untuk input kosong', () => {
    expect(normalizeSlugCandidate('   !!!   ')).toBe('artikel');
  });

  it('memotong ke batas maksimum tanpa ekor strip', () => {
    const slug = normalizeSlugCandidate(`${'a'.repeat(120)} ---`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('allocateUniqueSlug', () => {
  it('mengembalikan slug dasar bila bebas', () => {
    expect(allocateUniqueSlug(['lain'], 'Rutan Wonosobo')).toBe('rutan-wonosobo');
  });

  it('menambah akhiran numerik berurutan', () => {
    expect(allocateUniqueSlug(['rutan-wonosobo', 'rutan-wonosobo-2'], 'Rutan Wonosobo')).toBe('rutan-wonosobo-3');
  });

  it('membandingkan case-insensitive', () => {
    expect(allocateUniqueSlug(['RUTAN-WONOSOBO'], 'rutan-wonosobo')).toBe('rutan-wonosobo-2');
  });

  it('menghormati batas panjang kustom', () => {
    const slug = allocateUniqueSlug(['pendek'], 'slug-yang-sangat-panjang-sekali', 12);
    expect(slug.length).toBeLessThanOrEqual(12);
  });
});
