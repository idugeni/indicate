import { describe, expect, it } from 'vitest';

import {
  isSlotMapped,
  parseTenantAdOverrides,
  resolveAdSlot,
  safeTemplateId,
} from '@/modules/ads/config';

describe('parseTenantAdOverrides', () => {
  it('mengembalikan objek kosong untuk seo yang hilang atau rusak', () => {
    expect(parseTenantAdOverrides(null)).toEqual({});
    expect(parseTenantAdOverrides({})).toEqual({});
    expect(parseTenantAdOverrides({ ads: 'leaderboard' })).toEqual({});
    expect(parseTenantAdOverrides({ ads: { leaderboard: 'aktif' } })).toEqual({});
  });

  it('menerima penonaktifan slot dan mengabaikan slot asing', () => {
    expect(
      parseTenantAdOverrides({ ads: { leaderboard: { enabled: false }, 'slot-asing': { enabled: true } } }),
    ).toEqual({ leaderboard: { enabled: false } });
  });

  it('menerima kreatif gambar yang valid dan membuang yang rusak', () => {
    const parsed = parseTenantAdOverrides({
      ads: {
        leaderboard: { creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png' } },
        'in-content': { creative: { kind: 'image', imageUrl: 'javascript:rusak' } },
      },
    });
    expect(parsed.leaderboard?.creative).toEqual({ kind: 'image', imageUrl: 'https://cdn.example/a.png' });
    expect(parsed['in-content']).toBeUndefined();
  });
});

describe('resolveAdSlot', () => {
  it('menonaktifkan slot terpetakan secara bawaan (opt-in lewat dasbor)', () => {
    const resolved = resolveAdSlot({ templateId: 'clean-blue', overrides: {}, slot: 'leaderboard' });
    expect(resolved).toEqual({ slot: 'leaderboard', mapped: true, enabled: false, creative: null });
  });

  it('mengaktifkan slot yang eksplisit dinyalakan tenant', () => {
    const resolved = resolveAdSlot({
      templateId: 'clean-blue',
      overrides: { leaderboard: { enabled: true } },
      slot: 'leaderboard',
    });
    expect(resolved).toEqual({ slot: 'leaderboard', mapped: true, enabled: true, creative: null });
  });

  it('menonaktifkan slot yang tidak dipetakan walau tenant menyalakannya', () => {
    const resolved = resolveAdSlot({
      templateId: 'clean-blue',
      overrides: { 'sidebar-middle': { enabled: true } },
      slot: 'sidebar-middle',
    });
    expect(resolved.enabled).toBe(false);
    expect(resolved.mapped).toBe(false);
  });

  it('memberi prioritas tenant di atas bawaan template', () => {
    const resolved = resolveAdSlot({
      templateId: 'clean-blue',
      overrides: { leaderboard: { enabled: false } },
      slot: 'leaderboard',
    });
    expect(resolved.enabled).toBe(false);
  });

  it('memberi prioritas kampanye di atas tenant', () => {
    const creative = { kind: 'image' as const, imageUrl: 'https://cdn.example/kampanye.png' };
    const resolved = resolveAdSlot({
      templateId: 'clean-blue',
      overrides: { leaderboard: { enabled: false, creative } },
      slot: 'leaderboard',
      campaign: { slots: { leaderboard: { enabled: true } } },
    });
    expect(resolved.enabled).toBe(true);
    expect(resolved.creative).toEqual(creative);
  });
});

describe('isSlotMapped', () => {
  it('membedakan slot terpetakan dan slot cadangan', () => {
    expect(isSlotMapped('clean-blue', 'leaderboard')).toBe(true);
    expect(isSlotMapped('clean-blue', 'sidebar-middle')).toBe(false);
    expect(isSlotMapped('dark-navy', 'sidebar-top')).toBe(true);
  });
});

describe('safeTemplateId', () => {
  it('mengembalikan null untuk template tak dikenal tanpa melempar', () => {
    expect(safeTemplateId('clean-blue')).toBe('clean-blue');
    expect(safeTemplateId('template-asing')).toBeNull();
    expect(safeTemplateId(null)).toBeNull();
  });
});
