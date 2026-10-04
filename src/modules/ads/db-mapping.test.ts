import { describe, expect, it } from 'vitest';

import { mapPlacementRows, mapTenantAdRows, toAdCreative } from '@/modules/ads/db-mapping';

const IMAGE = {
  kind: 'image',
  imageUrl: 'https://cdn.example/a.png',
  href: null,
  altText: 'Promo',
  widthPx: null,
  heightPx: null,
  html: null,
  provider: null,
  providerClientId: null,
  providerSlotId: null,
};

describe('toAdCreative', () => {
  it('mengembalikan null untuk kolom kosong atau rusak', () => {
    expect(toAdCreative(null)).toBeNull();
    expect(toAdCreative({ ...IMAGE, kind: null })).toBeNull();
    expect(toAdCreative({ ...IMAGE, imageUrl: 'javascript:rusak' })).toBeNull();
  });

  it('memetakan kolom snake_case ke kreatif gambar', () => {
    expect(toAdCreative(IMAGE)).toEqual({ kind: 'image', imageUrl: 'https://cdn.example/a.png', alt: 'Promo' });
  });
});

describe('mapTenantAdRows', () => {
  it('melipat baris per slot dan mengabaikan slot asing', () => {
    expect(
      mapTenantAdRows([
        { slotId: 'leaderboard', enabled: false, creative: { ...IMAGE } },
        { slotId: 'slot-asing', enabled: true, creative: null },
      ]),
    ).toEqual({
      leaderboard: {
        enabled: false,
        creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png', alt: 'Promo' },
      },
    });
  });
});

describe('mapPlacementRows', () => {
  it('memenangkan baris pertama per slot dan melewati baris tak cocok', () => {
    const creative = { ...IMAGE };
    expect(
      mapPlacementRows(
        [
          { slotId: 'leaderboard', templateId: null, device: 'desktop', creative },
          { slotId: 'leaderboard', templateId: null, device: null, creative },
          { slotId: 'leaderboard', templateId: null, device: null, creative },
          { slotId: 'in-content', templateId: 'dark-navy', device: null, creative },
          { slotId: 'in-content', templateId: null, device: null, creative: null },
        ],
        { templateId: 'clean-blue' },
      ),
    ).toEqual({
      slots: {
        leaderboard: {
          enabled: true,
          creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png', alt: 'Promo' },
        },
      },
    });
  });

  it('mengembalikan objek kosong tanpa baris valid', () => {
    expect(mapPlacementRows([], { templateId: 'clean-blue' })).toEqual({});
  });
});
