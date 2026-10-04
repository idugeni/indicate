import { describe, expect, it } from 'vitest';

import { TEMPLATE_IDS } from '@/modules/site/components/network/templates/listing-shared';
import { TEMPLATE_AD_MAP } from '@/modules/ads/placement-map';
import { AD_SLOT_IDS } from '@/modules/ads/slots';

describe('TEMPLATE_AD_MAP', () => {
  it('memetakan kesepuluh template tanpa logika kondisional', () => {
    expect(Object.keys(TEMPLATE_AD_MAP).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it('hanya memetakan slot yang terdaftar di katalog', () => {
    for (const templateId of TEMPLATE_IDS) {
      const zones = TEMPLATE_AD_MAP[templateId];
      const mapped = [...zones.header, ...zones.top, ...zones.listing, ...zones.article, ...zones.channel, ...zones.footer];
      for (const slot of mapped) {
        expect(AD_SLOT_IDS).toContain(slot);
      }
    }
  });

  it('memberi setiap template slot atas dan slot bawah', () => {
    for (const templateId of TEMPLATE_IDS) {
      const zones = TEMPLATE_AD_MAP[templateId];
      expect(zones.header.length + zones.top.length).toBeGreaterThan(0);
      expect(zones.footer.length).toBeGreaterThan(0);
    }
  });

  it('membedakan karakter antar-template', () => {
    const signatures = TEMPLATE_IDS.map((templateId) => JSON.stringify(TEMPLATE_AD_MAP[templateId]));
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });
});
