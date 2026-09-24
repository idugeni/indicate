import { describe, expect, it } from 'vitest';

import { hostnameCacheKey, parseHostnameCacheEntry } from '@/integrations/redis/hostname-read-model';

describe('hostnameCacheKey', () => {
  it('membuat kunci host ternama', () => {
    expect(hostnameCacheKey('berita.example')).toBe('host:berita.example');
  });
});

describe('parseHostnameCacheEntry', () => {
  const valid = {
    normalizedHostname: 'berita.example',
    organizationId: 'o1',
    domainId: 'd1',
    siteId: 's1',
    regionId: null,
    routingVersion: 1,
    contentVersion: 1,
  };

  it('menerima array konteks valid termasuk kosong', () => {
    expect(parseHostnameCacheEntry([])).toEqual([]);
    expect(parseHostnameCacheEntry([valid])).toEqual([valid]);
  });

  it('menolak bentuk korup', () => {
    expect(parseHostnameCacheEntry(null)).toBe(undefined);
    expect(parseHostnameCacheEntry('host')).toBe(undefined);
    expect(parseHostnameCacheEntry([null])).toBe(undefined);
    expect(parseHostnameCacheEntry([{ ...valid, routingVersion: 'satu' }])).toBe(undefined);
  });
});
