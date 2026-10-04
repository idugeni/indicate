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
});
