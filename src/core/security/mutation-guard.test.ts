import { describe, expect, it } from 'vitest';

import { denyCrossSiteHeaders, denyCrossSiteMutation } from '@/core/security/mutation-guard';

const headersOf = (entries: Record<string, string>) => (name: string) => entries[name.toLowerCase()] ?? null;

describe('denyCrossSiteHeaders', () => {
  it('allows only same-origin Fetch Metadata for cookie-authenticated mutations', () => {
    expect(denyCrossSiteHeaders(headersOf({ 'sec-fetch-site': 'same-origin' }))).toBe(false);
    for (const site of ['same-site', 'cross-site', 'none']) {
      expect(denyCrossSiteHeaders(headersOf({ 'sec-fetch-site': site }))).toBe(true);
    }
  });

  it('compares Origin against Host when Fetch Metadata is absent', () => {
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', origin: 'https://a.test' }))).toBe(false);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', origin: 'https://evil.test' }))).toBe(true);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', origin: 'bukan-url' }))).toBe(true);
  });

  it('falls back to Referer only when Origin is absent', () => {
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', referer: 'https://a.test/x' }))).toBe(false);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test', referer: 'https://evil.test/x' }))).toBe(true);
  });

  it('fails closed when host and origin signals are missing', () => {
    expect(denyCrossSiteHeaders(headersOf({}))).toBe(true);
    expect(denyCrossSiteHeaders(headersOf({ host: 'a.test' }))).toBe(true);
  });
});

describe('denyCrossSiteMutation', () => {
  it('delegates to request headers', () => {
    const blocked = new Request('https://a.test/api', { headers: { 'sec-fetch-site': 'cross-site' } });
    expect(denyCrossSiteMutation(blocked)).toBe(true);
    const allowed = new Request('https://a.test/api', { headers: { 'sec-fetch-site': 'same-origin' } });
    expect(denyCrossSiteMutation(allowed)).toBe(false);
  });
});
