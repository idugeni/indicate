import { describe, expect, it } from 'vitest';

import { getPublicConfig } from '@/core/config/public-config';

const VALID = {
  NEXT_PUBLIC_SITE_URL: 'https://berita.example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://ref.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key-123',
};

describe('getPublicConfig', () => {
  it('memetakan env publik ke konfigurasi beku', () => {
    const config = getPublicConfig(VALID);
    expect(config).toEqual({
      siteUrl: 'https://berita.example',
      supabaseUrl: 'https://ref.supabase.co',
      supabasePublishableKey: 'publishable-key-123',
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('menolak supabase http non-tls dan kunci pendek', () => {
    expect(() => getPublicConfig({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: 'http://ref.supabase.co' })).toThrow();
    expect(() => getPublicConfig({ ...VALID, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'pendek' })).toThrow();
  });
});
