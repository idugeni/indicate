import { describe, expect, it } from 'vitest';

import {
  buildPageviewKey,
  parsePageviewKey,
  pageviewBeaconSchema,
  serializePageviewBeacon,
} from '@/modules/site/pageview-contract';

const BEACON = {
  o: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0',
  s: '1ae6d084-de27-4ec7-b1ae-863fbd031038',
  a: '0e83aba3-5be1-4e21-8717-f959efd7919e',
} as const;

describe('pageviewBeaconSchema', () => {
  it('terima payload {o, s, a} UUID', () => {
    expect(pageviewBeaconSchema.safeParse(BEACON).success).toBe(true);
  });

  it('tolak field kurang, berlebih, atau bukan UUID', () => {
    expect(pageviewBeaconSchema.safeParse({ o: BEACON.o, s: BEACON.s }).success).toBe(false);
    expect(pageviewBeaconSchema.safeParse({ ...BEACON, x: '1' }).success).toBe(false);
    expect(pageviewBeaconSchema.safeParse({ ...BEACON, a: 'bukan-uuid' }).success).toBe(false);
  });
});

describe('serializePageviewBeacon', () => {
  it('hasilkan body JSON untuk input valid', () => {
    expect(serializePageviewBeacon({ ...BEACON })).toBe(JSON.stringify(BEACON));
  });

  it('kembalikan null untuk input tak valid', () => {
    expect(serializePageviewBeacon({ ...BEACON, a: 'bukan-uuid' })).toBeNull();
  });
});

describe('buildPageviewKey dan parsePageviewKey', () => {
  it('roundtrip tanpa kehilangan identitas', () => {
    const key = buildPageviewKey('production', { ...BEACON });
    expect(key).toBe(`pv:production:${BEACON.o}:${BEACON.s}:${BEACON.a}`);
    expect(parsePageviewKey(key)).toEqual({ organizationId: BEACON.o, siteId: BEACON.s, articleSiteId: BEACON.a });
  });

  it('tolak kunci asing, pendek, atau bersegmen kosong', () => {
    expect(parsePageviewKey('cachever:production:x')).toBeNull();
    expect(parsePageviewKey('pv:production:hanya-tiga')).toBeNull();
    expect(parsePageviewKey(`pv:production::${BEACON.s}:${BEACON.a}`)).toBeNull();
    expect(parsePageviewKey('')).toBeNull();
  });
});
