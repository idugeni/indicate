import { describe, expect, it } from 'vitest';

import { clampLimit, encodeCursor, pageFromSearchParams, parseCursor } from '@/data/repos/shared/list-page';

describe('parseCursor', () => {
  it('memetakan ISO timestamp dan uuid', () => {
    const parsed = parseCursor('2026-10-02T00:00:00.000Z~12345678-1234-1234-1234-123456789abc');
    expect(parsed).toEqual({ createdAt: '2026-10-02T00:00:00.000Z', id: '12345678-1234-1234-1234-123456789abc' });
  });

  it('menolak cursor kosong atau salah bentuk', () => {
    expect(parseCursor(undefined)).toBeNull();
    expect(parseCursor('')).toBeNull();
    expect(parseCursor('bukan-cursor')).toBeNull();
    expect(parseCursor('~uuid')).toBeNull();
    expect(parseCursor('2026-10-02T00:00:00.000Z~')).toBeNull();
    expect(parseCursor('bukan-tanggal~12345678-1234-1234-1234-123456789abc')).toBeNull();
  });
});

describe('encodeCursor', () => {
  it('menyusun createdAt dan id menjadi satu string', () => {
    expect(encodeCursor('2026-10-02T00:00:00.000Z', '12345678-1234-1234-1234-123456789abc')).toBe(
      '2026-10-02T00:00:00.000Z~12345678-1234-1234-1234-123456789abc',
    );
  });
});

describe('clampLimit', () => {
  it('mengikuti batas bawah, atas, dan default', () => {
    expect(clampLimit(undefined, 100, 500)).toBe(100);
    expect(clampLimit(0, 100, 500)).toBe(1);
    expect(clampLimit(1000, 100, 500)).toBe(500);
    expect(clampLimit(25, 100, 500)).toBe(25);
  });
});

describe('pageFromSearchParams', () => {
  it('memvalidasi limit dan cursor dari query string', () => {
    expect(pageFromSearchParams(new URL('https://x.test/api?limit=20&cursor=a~b'))).toEqual({ limit: 20, cursor: 'a~b' });
    expect(pageFromSearchParams(new URL('https://x.test/api?limit=-3'))).toEqual({});
    expect(pageFromSearchParams(new URL('https://x.test/api'))).toEqual({});
  });
});
