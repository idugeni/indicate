import { describe, expect, it } from 'vitest';

import { normalizeQuery } from '@/app/(network)/search/page';

describe('normalizeQuery', () => {
  it('memotong kueri hingga 120 karakter', () => {
    expect(normalizeQuery('berita')).toBe('berita');
    expect(normalizeQuery('x'.repeat(200)).length).toBe(120);
    expect(normalizeQuery(undefined)).toBe('');
  });

  it('memakai entri pertama saat berulang', () => {
    expect(normalizeQuery(['satu', 'dua'])).toBe('satu');
  });
});
