import { describe, expect, it } from 'vitest';

import { SHOWCASE_BRANDS, SHOWCASE_REGIONAL_EDITIONS } from '@/ui/site/showcase-brands';

describe('SHOWCASE_BRANDS', () => {
  it('menampilkan tepat sembilan brand dengan nama unik', () => {
    expect(SHOWCASE_BRANDS).toHaveLength(9);
    expect(new Set(SHOWCASE_BRANDS.map((brand) => brand.name)).size).toBe(9);
  });

  it('menurunkan inisial dari nama setiap brand', () => {
    for (const brand of SHOWCASE_BRANDS) {
      const inisial = brand.name
        .split(' ')
        .map((kata) => kata[0])
        .join('');
      expect(brand.initials).toBe(inisial);
    }
  });

  it('menyusun nama dari head dan tail dengan aksen hex dan wordmark terisi', () => {
    for (const brand of SHOWCASE_BRANDS) {
      const gabung = `${brand.head}${brand.tail}`.toLowerCase().replace(/[^a-z]/g, '');
      const nama = brand.name.toLowerCase().replace(/[^a-z]/g, '');
      expect(gabung).toBe(nama);
      expect(brand.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(brand.wordmarkClass.length).toBeGreaterThan(0);
      expect(brand.category.length).toBeGreaterThan(0);
      expect(brand.tagline.length).toBeGreaterThan(0);
    }
  });
});

describe('SHOWCASE_REGIONAL_EDITIONS', () => {
  it('mencantumkan empat edisi daerah plus penutup', () => {
    expect(SHOWCASE_REGIONAL_EDITIONS).toHaveLength(5);
    expect(SHOWCASE_REGIONAL_EDITIONS.slice(0, 4).every((edisi) => edisi.startsWith('Edisi '))).toBe(true);
    expect(SHOWCASE_REGIONAL_EDITIONS[4]).toContain('daerah lain');
  });
});
