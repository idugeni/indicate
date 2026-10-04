import { describe, expect, it } from 'vitest';

import {
  adsAdvertiserSchema,
  adsCampaignSchema,
  adsCreativeSchema,
  adsNetworkSlotSchema,
  adsPlacementSchema,
  adsPlacementUpdateSchema,
  adsTenantSettingSchema,
} from '@/modules/ads/ads-schemas';

describe('adsTenantSettingSchema', () => {
  it('menerima switch slot yang valid', () => {
    expect(
      adsTenantSettingSchema.safeParse({ siteId: '11111111-1111-4111-8111-111111111111', slotId: 'leaderboard', enabled: false, creativeId: null, expectedVersion: 2 }).success,
    ).toBe(true);
  });

  it('menolak slot asing dan versi nol', () => {
    expect(
      adsTenantSettingSchema.safeParse({ siteId: '11111111-1111-4111-8111-111111111111', slotId: 'slot-asing', enabled: true, creativeId: null, expectedVersion: null }).success,
    ).toBe(false);
  });
});

describe('adsCreativeSchema', () => {
  it('menerima ketiga jenis kreatif yang valid', () => {
    expect(adsCreativeSchema.safeParse({ kind: 'image', imageUrl: 'https://cdn.example/a.png', campaignId: null }).success).toBe(true);
    expect(adsCreativeSchema.safeParse({ kind: 'html', html: '<div>Promo</div>', campaignId: null }).success).toBe(true);
    expect(adsCreativeSchema.safeParse({ kind: 'provider', provider: 'adsense', campaignId: null }).success).toBe(true);
  });

  it('menolak URL gambar yang tidak aman dan tautan javascript', () => {
    expect(adsCreativeSchema.safeParse({ kind: 'image', imageUrl: 'javascript:x', campaignId: null }).success).toBe(false);
    expect(adsCreativeSchema.safeParse({ kind: 'image', imageUrl: 'https://cdn.example/a.png', href: 'javascript:x', campaignId: null }).success).toBe(false);
    expect(adsCreativeSchema.safeParse({ kind: 'image', imageUrl: 'https://cdn.example/a.png', href: '/promo', campaignId: null }).success).toBe(true);
    expect(adsCreativeSchema.safeParse({ kind: 'html', html: '', campaignId: null }).success).toBe(false);
  });
});

describe('adsCampaignSchema', () => {
  it('menolak akhir periode sebelum awal periode', () => {
    const base = { advertiserId: '11111111-1111-4111-8111-111111111111', name: 'Kampanye Q4', status: 'scheduled', priority: 10 };
    expect(adsCampaignSchema.safeParse({ ...base, startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z' }).success).toBe(false);
    expect(adsCampaignSchema.safeParse({ ...base, startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z' }).success).toBe(true);
  });
});

describe('adsPlacementSchema', () => {
  it('menerima penempatan lintas situs dan menolak template asing', () => {
    const base = { campaignId: '11111111-1111-4111-8111-111111111111', creativeId: '22222222-2222-4222-8222-222222222222', slotId: 'in-content', siteId: null, templateId: null, device: null, priority: 5, startsAt: null, endsAt: null };
    expect(adsPlacementSchema.safeParse(base).success).toBe(true);
    expect(adsPlacementSchema.safeParse({ ...base, templateId: 'template-asing' }).success).toBe(false);
  });
});

describe('adsPlacementUpdateSchema', () => {
  it('mengizinkan patch parsial dan menolak jendela terbalik', () => {
    expect(adsPlacementUpdateSchema.safeParse({ id: '11111111-1111-4111-8111-111111111111', active: false, expectedVersion: 3 }).success).toBe(true);
    expect(adsPlacementUpdateSchema.safeParse({ id: '11111111-1111-4111-8111-111111111111', startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-10-01T00:00:00Z', expectedVersion: 3 }).success).toBe(false);
  });
});

describe('adsAdvertiserSchema', () => {
  it('menolak nama pendek dan surel rusak', () => {
    expect(adsAdvertiserSchema.safeParse({ name: 'AB', contactEmail: null }).success).toBe(false);
    expect(adsAdvertiserSchema.safeParse({ name: 'Pengiklan Bagus', contactEmail: 'bukan-surel' }).success).toBe(false);
    expect(adsAdvertiserSchema.safeParse({ name: 'Pengiklan Bagus', contactEmail: 'halo@pengiklan.example' }).success).toBe(true);
  });
});

describe('adsNetworkSlotSchema', () => {
  it('menerima slot jaringan dengan tiap sumber konten', () => {
    const base = { slotId: 'leaderboard', enabled: true, expectedVersions: {} };
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'none' } }).success).toBe(true);
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'existing', creativeId: '33333333-3333-4333-8333-333333333333' } }).success).toBe(true);
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'image-url', imageUrl: 'https://cdn.example/a.png', href: '/promo' } }).success).toBe(true);
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'html', html: '<div>Promo</div>' } }).success).toBe(true);
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'provider', clientId: 'ca-pub-1' } }).success).toBe(true);
  });

  it('menolak slot asing, URL tidak aman, dan HTML kosong', () => {
    const base = { slotId: 'leaderboard', enabled: true, expectedVersions: {} };
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'image-url', imageUrl: 'javascript:x' } }).success).toBe(false);
    expect(adsNetworkSlotSchema.safeParse({ ...base, creative: { mode: 'html', html: '' } }).success).toBe(false);
    expect(adsNetworkSlotSchema.safeParse({ slotId: 'slot-asing', enabled: true, creative: { mode: 'none' }, expectedVersions: {} }).success).toBe(false);
  });
});
