import { describe, expect, it } from 'vitest';

import {
  carriesPlatformToken,
  extractClientIp,
  hasOnBehalfTicket,
  isDashboardPath,
  isIpAllowlisted,
  isPlatformOnlyWithoutTicket,
  isPlatformPath,
  isPlatformRequestAllowed,
  isPlatformTokenWithoutTicket,
  parsePlatformAllowedIps,
} from '@/core/routing/platform-guard';

const headersOf = (entries: Record<string, string>) => new Headers(entries);

describe('path classifiers', () => {
  it('mengenali path platform dan dashboard', () => {
    expect(isPlatformPath('/platform/sites')).toBe(true);
    expect(isPlatformPath('/api/platform/health')).toBe(true);
    expect(isPlatformPath('/dashboard')).toBe(false);
    expect(isDashboardPath('/dashboard')).toBe(true);
    expect(isDashboardPath('/api/dashboard/billing')).toBe(true);
    expect(isDashboardPath('/platform')).toBe(false);
  });

  it('mengurai allowlist IP dari env', () => {
    expect(parsePlatformAllowedIps(undefined)).toEqual([]);
    expect(parsePlatformAllowedIps(' 10.0.0.1, 192.168.0.0/24 ,,')).toEqual(['10.0.0.1', '192.168.0.0/24']);
  });
});

describe('isIpAllowlisted', () => {
  it('mencocokkan IP exact dan CIDR', () => {
    expect(isIpAllowlisted('10.0.0.7', ['10.0.0.7'])).toBe(true);
    expect(isIpAllowlisted('10.0.0.8', ['10.0.0.7'])).toBe(false);
    expect(isIpAllowlisted('192.168.1.20', ['192.168.1.0/24'])).toBe(true);
    expect(isIpAllowlisted('192.168.2.20', ['192.168.1.0/24'])).toBe(false);
    expect(isIpAllowlisted('1.2.3.4', ['not-a-cidr/99'])).toBe(false);
  });
});

describe('extractClientIp', () => {
  it('mengutamakan x-forwarded-for pertama', () => {
    expect(extractClientIp(headersOf({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe('203.0.113.7');
    expect(extractClientIp(headersOf({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(extractClientIp(headersOf({}))).toBe(null);
  });
});

describe('platform token and ticket', () => {
  it('mendeteksi token via header dan bearer plat_', () => {
    expect(carriesPlatformToken(headersOf({ 'x-platform-token': 'abc' }))).toBe(true);
    expect(carriesPlatformToken(headersOf({ authorization: 'Bearer plat_secret' }))).toBe(true);
    expect(carriesPlatformToken(headersOf({ authorization: 'Bearer other' }))).toBe(false);
    expect(carriesPlatformToken(headersOf({}))).toBe(false);
  });

  it('mendeteksi tiket on-behalf', () => {
    expect(hasOnBehalfTicket(headersOf({ 'x-on-behalf-ticket': 't-1' }))).toBe(true);
    expect(hasOnBehalfTicket(headersOf({}))).toBe(false);
    expect(isPlatformTokenWithoutTicket(headersOf({ 'x-platform-token': 'abc' }))).toBe(true);
    expect(
      isPlatformTokenWithoutTicket(headersOf({ 'x-platform-token': 'abc', 'x-on-behalf-ticket': 't-1' })),
    ).toBe(false);
  });

  it('mengenali platform-only tanpa tiket', () => {
    const headers = headersOf({});
    expect(isPlatformOnlyWithoutTicket({ orgPermissionCount: 0, platformPermissionCount: 2, headers })).toBe(true);
    expect(isPlatformOnlyWithoutTicket({ orgPermissionCount: 1, platformPermissionCount: 2, headers })).toBe(false);
    expect(isPlatformOnlyWithoutTicket({ orgPermissionCount: 0, platformPermissionCount: 0, headers })).toBe(false);
  });
});

describe('isPlatformRequestAllowed', () => {
  it('fail-closed tanpa IP dan loopback tanpa allowlist', () => {
    expect(isPlatformRequestAllowed({ headers: headersOf({}), allowlist: ['10.0.0.1'] })).toBe(false);
    expect(isPlatformRequestAllowed({ headers: headersOf({ 'x-forwarded-for': '127.0.0.1' }), allowlist: [] })).toBe(false);
    expect(
      isPlatformRequestAllowed({ headers: headersOf({ 'x-forwarded-for': '127.0.0.1' }), allowlist: ['127.0.0.1'] }),
    ).toBe(true);
    expect(
      isPlatformRequestAllowed({ headers: headersOf({ 'x-forwarded-for': '10.0.0.5' }), allowlist: ['10.0.0.0/24'] }),
    ).toBe(true);
  });
});
