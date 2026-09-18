import { describe, expect, it } from 'vitest';

import { denyCrossSiteHeaders, denyCrossSiteMutation } from '@/core/security/mutation-guard';

const headersOf = (entries: Record<string, string>) => (name: string) => entries[name.toLowerCase()] ?? null;

describe('denyCrossSiteHeaders', () => {
  it('mengizinkan fetch same-origin, same-site, dan none', () => {
    for (const site of ['same-origin', 'same-site', 'none']) {
      expect(denyCrossSiteHeaders(headersOf({ 'sec-fetch-site': site }))).toBe(false);
    }
  });

  it('menolak fetch cross-site', () => {
    expect(denyCrossSiteHeaders(headersOf({ 'sec-fetch-site': 'cross-site' }))).toBe(true);
  });

  it('membandingkan origin terhadap host', () => {
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', origin: 'https://a.test' }))).toBe(false);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', origin: 'https://evil.test' }))).toBe(true);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', origin: 'bukan-url' }))).toBe(true);
  });

  it('jatuh ke referer bila origin absen', () => {
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', referer: 'https://a.test/x' }))).toBe(false);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', referer: 'https://evil.test/x' }))).toBe(true);
  });

  it('mengizinkan tanpa sinyal cross-site', () => {
    expect(denyCrossSiteHeaders(headersOf({}))).toBe(false);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test' }))).toBe(false);
  });
});

describe('denyCrossSiteMutation', () => {
  it('mendelegasikan ke header request', () => {
    const blocked = new Request('https://a.test/api', { headers: { 'sec-fetch-site': 'cross-site' } });
    expect(denyCrossSiteMutation(blocked)).toBe(true);
    const allowed = new Request('https://a.test/api', { headers: { 'sec-fetch-site': 'same-origin' } });
    expect(denyCrossSiteMutation(allowed)).toBe(false);
  });
});
