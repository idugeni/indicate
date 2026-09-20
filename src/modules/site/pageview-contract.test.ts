import { describe, expect, it } from 'vitest';

import {
  buildPageviewKey,
  isBotPageview,
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

describe('isBotPageview', () => {
  const browser = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

  it('izinkan peramban biasa tanpa sinyal bot', () => {
    expect(isBotPageview(browser, null)).toBe(false);
  });

  it('fail-open untuk UA kosong', () => {
    expect(isBotPageview(null, null)).toBe(false);
    expect(isBotPageview('', null)).toBe(false);
  });

  it('tolak perayap umum, pustaka HTTP, dan bot AI/sosial', () => {
    expect(isBotPageview('Mozilla/5.0 (compatible; Googlebot/2.1)', null)).toBe(true);
    expect(isBotPageview('facebookexternalhit/1.1', null)).toBe(true);
    expect(isBotPageview('GPTBot/1.0', null)).toBe(true);
    expect(isBotPageview('python-requests/2.31.0', null)).toBe(true);
    expect(isBotPageview('curl/8.0.1', null)).toBe(true);
    expect(isBotPageview('PostmanRuntime/7.32.3', null)).toBe(true);
  });

  it('tolak sinyal verifikasi Cloudflare', () => {
    expect(isBotPageview(browser, { verifiedBot: true })).toBe(true);
    expect(isBotPageview(browser, { botScore: 12 })).toBe(true);
    expect(isBotPageview(browser, { threatScore: 75 })).toBe(true);
  });

  it('izinkan skor Cloudflare normal', () => {
    expect(isBotPageview(browser, { verifiedBot: false, botScore: 88, threatScore: 0 })).toBe(false);
  });
});
