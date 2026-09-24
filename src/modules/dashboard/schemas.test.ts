import { describe, expect, it } from 'vitest';

import { siteCachePurgeSchema, siteSettingsSchema } from '@/modules/dashboard/schemas';

const SETTINGS_BASE = {
  siteId: '0199a2b3-4c5d-7e8f-9012-3456789abcde',
  name: 'Portal Contoh',
  description: 'Deskripsi portal contoh yang cukup panjang untuk lolos validasi minimal.',
};

describe('siteCachePurgeSchema', () => {
  it('menolak purge massal tanpa konfirmasi eksplisit', () => {
    expect(siteCachePurgeSchema.safeParse({}).success).toBe(false);
  });

  it('menerima purge massal dengan konfirmasi eksplisit', () => {
    expect(siteCachePurgeSchema.safeParse({ confirmBulk: true }).success).toBe(true);
  });

  it('menerima purge satu situs tanpa konfirmasi massal', () => {
    expect(siteCachePurgeSchema.safeParse({ siteId: '0199a2b3-4c5d-7e8f-9012-3456789abcde' }).success).toBe(true);
  });
});

describe('siteSettingsSchema seoDefaultDescription', () => {
  it('menerima deskripsi unik tanpa pola template', () => {
    const result = siteSettingsSchema.safeParse({
      ...SETTINGS_BASE,
      seoDefaultDescription: 'Kabar terkini dari ruang redaksi kami untuk pembaca setia setiap hari',
    });
    expect(result.success).toBe(true);
  });

  it('menolak pola template portal berita', () => {
    const result = siteSettingsSchema.safeParse({
      ...SETTINGS_BASE,
      seoDefaultDescription: 'Portal berita X yang menyajikan kabar terkini setiap hari untuk pembaca',
    });
    expect(result.success).toBe(false);
  });

  it('menolak deskripsi bertitik dua', () => {
    const result = siteSettingsSchema.safeParse({
      ...SETTINGS_BASE,
      seoDefaultDescription: 'Liputan: kabar terkini dari redaksi kami untuk pembaca setia setiap hari',
    });
    expect(result.success).toBe(false);
  });
});
