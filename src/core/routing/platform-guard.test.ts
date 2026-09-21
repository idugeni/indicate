import { describe, expect, it } from 'vitest';

import {
  extractClientIp,
  hasPlatformOriginProof,
  isPlatformRequestAllowed,
  parsePlatformAllowedIps,
} from '@/core/routing/platform-guard';

const headersOf = (entries: Record<string, string>) => new Headers(entries);

describe('extractClientIp', () => {
  it('mengutamakan cf-connecting-ip di atas x-forwarded-for palsu', () => {
    const ip = extractClientIp(headersOf({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '10.9.9.9, 198.51.100.2' }));
    expect(ip).toBe('203.0.113.7');
  });

  it('memakai entri terakhir x-forwarded-for', () => {
    const ip = extractClientIp(headersOf({ 'x-forwarded-for': '10.9.9.9, 198.51.100.2' }));
    expect(ip).toBe('198.51.100.2');
  });

  it('jatuh ke x-real-ip lalu null', () => {
    expect(extractClientIp(headersOf({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9');
    expect(extractClientIp(headersOf({}))).toBe(null);
  });
});

describe('hasPlatformOriginProof', () => {
  it('menerima proof yang cocok dan menolak yang salah', () => {
    expect(hasPlatformOriginProof(headersOf({ 'x-indicate-cloudflare-origin': 'rahasia' }), 'rahasia')).toBe(true);
    expect(hasPlatformOriginProof(headersOf({ 'x-indicate-cloudflare-origin': 'salah' }), 'rahasia')).toBe(false);
    expect(hasPlatformOriginProof(headersOf({}), 'rahasia')).toBe(false);
    expect(hasPlatformOriginProof(headersOf({ 'x-indicate-cloudflare-origin': 'rahasia' }), '')).toBe(false);
  });
});

describe('isPlatformRequestAllowed', () => {
  it('menolak ip spoof di depan rantai x-forwarded-for', () => {
    const allowlist = parsePlatformAllowedIps('10.9.9.9');
    const spoofed = headersOf({ 'x-forwarded-for': '10.9.9.9, 198.51.100.2' });
    expect(isPlatformRequestAllowed({ headers: spoofed, allowlist })).toBe(false);
  });

  it('mengizinkan ip allowlist dari entri terakhir', () => {
    const allowlist = parsePlatformAllowedIps('198.51.100.0/24');
    const headers = headersOf({ 'x-forwarded-for': '10.9.9.9, 198.51.100.2' });
    expect(isPlatformRequestAllowed({ headers, allowlist })).toBe(true);
  });
});
