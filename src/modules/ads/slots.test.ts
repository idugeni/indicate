import { describe, expect, it } from 'vitest';

import { AD_SLOT_IDS, AD_SLOTS } from '@/modules/ads/slots';

describe('AD_SLOTS', () => {
  it('mendefinisikan setiap slot katalog tepat satu kali', () => {
    expect(new Set(AD_SLOT_IDS).size).toBe(AD_SLOT_IDS.length);
    for (const id of AD_SLOT_IDS) {
      expect(AD_SLOTS[id].id).toBe(id);
    }
  });

  it('memberi setiap slot minimal satu ukuran dan satu format', () => {
    for (const id of AD_SLOT_IDS) {
      expect(AD_SLOTS[id].sizes.length).toBeGreaterThan(0);
      expect(AD_SLOTS[id].allowedFormats.length).toBeGreaterThan(0);
      expect(AD_SLOTS[id].devices.length).toBeGreaterThan(0);
      expect(AD_SLOTS[id].maxWidthPx).toBeGreaterThan(0);
    }
  });

  it('memakai kelas aspect-ratio statis untuk ruang yang dicadangkan', () => {
    for (const id of AD_SLOT_IDS) {
      expect(AD_SLOTS[id].reserveClass).toMatch(/aspect-\[/);
    }
  });

  it('membatasi slot sidebar ke desktop dan spanduk seluler ke ponsel', () => {
    expect(AD_SLOTS['sidebar-top'].visibilityClass).toContain('lg:block');
    expect(AD_SLOTS['sidebar-bottom'].visibilityClass).toContain('lg:block');
    expect(AD_SLOTS['mobile-banner'].visibilityClass).toContain('md:hidden');
    expect(AD_SLOTS['mobile-banner'].devices).toEqual(['mobile']);
  });

  it('mencadangkan rasio billboard desktop untuk top-banner', () => {
    const top = AD_SLOTS['top-banner'];
    expect(top.sizes).toContainEqual({ width: 970, height: 250 });
    expect(top.sizes).toContainEqual({ width: 728, height: 90 });
    expect(top.sizes).toContainEqual({ width: 320, height: 100 });
    expect(top.reserveClass).toContain('aspect-[320/100]');
    expect(top.reserveClass).toContain('md:aspect-[728/90]');
    expect(top.reserveClass).toContain('lg:aspect-[970/250]');
  });

  it('menjaga sidebar-bottom khusus unit tinggi', () => {
    const bottom = AD_SLOTS['sidebar-bottom'];
    expect(bottom.sizes).toContainEqual({ width: 300, height: 600 });
    expect(bottom.sizes).not.toContainEqual({ width: 300, height: 250 });
    expect(bottom.reserveClass).toContain('aspect-[300/600]');
  });
});
