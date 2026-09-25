import { describe, expect, it } from 'vitest';

import { regionCreateSchema, regionUpdateSchema, siteCachePurgeSchema, siteSettingsSchema } from '@/modules/dashboard/schemas';

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

describe('region shortName', () => {
  const REGION_BASE = { externalKey: 'jawa-timur', name: 'Jawa Timur', slug: 'jawa-timur' };

  it('menyimpan nama singkat dan memangkas spasi tepi', () => {
    const result = regionCreateSchema.safeParse({ ...REGION_BASE, shortName: '  Jatim  ' });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected ok');
    expect(result.data.shortName).toBe('Jatim');
  });

  it('menerima wilayah tanpa nama singkat', () => {
    const result = regionCreateSchema.safeParse(REGION_BASE);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected ok');
    expect(result.data.shortName).toBeNull();
  });

  it('menolak nama singkat kosong atau lebih dari 40 karakter', () => {
    expect(regionCreateSchema.safeParse({ ...REGION_BASE, shortName: '   ' }).success).toBe(false);
    expect(regionCreateSchema.safeParse({ ...REGION_BASE, shortName: 'a'.repeat(41) }).success).toBe(false);
  });

  it('membiarkan pembaruan tanpa nama singkat mempertahankan nilai lama', () => {
    const result = regionUpdateSchema.safeParse({
      ...REGION_BASE,
      id: '0199a2b3-4c5d-7e8f-9012-3456789abcde',
      expectedVersion: 1,
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('expected ok');
    expect(result.data.shortName).toBeUndefined();
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
