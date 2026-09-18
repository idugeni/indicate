import { describe, expect, it } from 'vitest';

import { cacheEntryMatches, createCacheIdentity } from '@/modules/delivery/cache-identity';

const CONTEXT = {
  normalizedHostname: 'portal.example',
  organizationId: 'org-1',
  domainId: 'd-1',
  siteId: 'site-1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 3,
} as const;

const base = { context: CONTEXT, locale: 'id-ID', path: '/', query: {}, preview: false, authClass: 'anonymous' } as const;

describe('createCacheIdentity', () => {
  it('menolak konteks null atau hostname kosong', () => {
    expect(createCacheIdentity({ ...base, context: null })).toBe(null);
    expect(createCacheIdentity({ ...base, context: { ...CONTEXT, normalizedHostname: '' } })).toBe(null);
  });

  it('menghasilkan key stabil untuk input setara', () => {
    const first = createCacheIdentity(base);
    const second = createCacheIdentity({ ...base, path: '//', query: new URLSearchParams() });
    expect(first?.key).toBe(second?.key);
    expect(first?.key.startsWith('public:v1:')).toBe(true);
  });

  it('membedakan path, query, preview, dan versi konten', () => {
    const plain = createCacheIdentity(base)?.key;
    expect(createCacheIdentity({ ...base, path: '/berita' })?.key).not.toBe(plain);
    expect(createCacheIdentity({ ...base, query: { q: 'x' } })?.key).not.toBe(plain);
    expect(createCacheIdentity({ ...base, preview: true })?.key).not.toBe(plain);
    expect(createCacheIdentity({ ...base, context: { ...CONTEXT, contentVersion: 4 } })?.key).not.toBe(plain);
  });

  it('menormalkan slash ganda dan trailing slash', () => {
    expect(createCacheIdentity({ ...base, path: '//berita//' })?.key).toBe(createCacheIdentity({ ...base, path: '/berita' })?.key);
  });
});

describe('cacheEntryMatches', () => {
  it('cocok untuk konteks identik dan menolak versi asing', () => {
    const identity = createCacheIdentity(base);
    if (identity === null) throw new Error('expected identity');
    expect(cacheEntryMatches(identity, CONTEXT)).toBe(true);
    expect(cacheEntryMatches(identity, { ...CONTEXT, contentVersion: 4 })).toBe(false);
    expect(cacheEntryMatches(identity, { ...CONTEXT, siteId: 'site-asing' })).toBe(false);
  });
});
