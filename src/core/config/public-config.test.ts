import { describe, expect, it } from 'vitest';

import { getPublicConfig } from '@/core/config/public-config';

describe('getPublicConfig', () => {
  it('memetakan env situs ke konfigurasi beku', () => {
    const config = getPublicConfig({ NEXT_PUBLIC_SITE_URL: 'https://berita.example' });
    expect(config).toEqual({ siteUrl: 'https://berita.example' });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('menolak URL situs dengan format tidak valid', () => {
    expect(() => getPublicConfig({ NEXT_PUBLIC_SITE_URL: 'invalid url' })).toThrow();
  });
});
