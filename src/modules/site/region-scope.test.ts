import { describe, expect, it } from 'vitest';

import { regionScopeCovers, type ScopeGeography } from '@/modules/site/region-scope';

const PROVINCE = '0199a2b3-4c5d-7e8f-9012-3456789abc01';
const WONOSOBO = '0199a2b3-4c5d-7e8f-9012-3456789abc02';
const SEMARANG = '0199a2b3-4c5d-7e8f-9012-3456789abc03';
const OTHER_PROVINCE = '0199a2b3-4c5d-7e8f-9012-3456789abc04';
const SOLO = '0199a2b3-4c5d-7e8f-9012-3456789abc05';

const GEOGRAPHY: readonly ScopeGeography[] = Object.freeze([
  { id: PROVINCE, kind: 'region', parentRegionId: null },
  { id: WONOSOBO, kind: 'city', parentRegionId: PROVINCE },
  { id: SEMARANG, kind: 'city', parentRegionId: PROVINCE },
  { id: OTHER_PROVINCE, kind: 'region', parentRegionId: null },
  { id: SOLO, kind: 'city', parentRegionId: OTHER_PROVINCE },
]);

describe('regionScopeCovers', () => {
  it('aktor tanpa scope mencakup semuanya', () => {
    expect(regionScopeCovers(null, WONOSOBO, GEOGRAPHY)).toBe(true);
    expect(regionScopeCovers(null, OTHER_PROVINCE, GEOGRAPHY)).toBe(true);
  });

  it('portal apex selalu terlihat meski ada scope', () => {

    expect(regionScopeCovers(PROVINCE, null, GEOGRAPHY)).toBe(true);
  });

  it('scope mencakup dirinya sendiri', () => {
    expect(regionScopeCovers(PROVINCE, PROVINCE, GEOGRAPHY)).toBe(true);
  });

  it('scope province mencakup seluruh kota di bawahnya', () => {
    expect(regionScopeCovers(PROVINCE, WONOSOBO, GEOGRAPHY)).toBe(true);
    expect(regionScopeCovers(PROVINCE, SEMARANG, GEOGRAPHY)).toBe(true);
  });

  it('scope province menolak provinsi lain', () => {
    expect(regionScopeCovers(PROVINCE, OTHER_PROVINCE, GEOGRAPHY)).toBe(false);
    expect(regionScopeCovers(PROVINCE, SOLO, GEOGRAPHY)).toBe(false);
  });

  it('scope city tidak mencapai kota saudara maupun province induk', () => {
    expect(regionScopeCovers(WONOSOBO, SEMARANG, GEOGRAPHY)).toBe(false);
    expect(regionScopeCovers(WONOSOBO, PROVINCE, GEOGRAPHY)).toBe(false);
    expect(regionScopeCovers(WONOSOBO, WONOSOBO, GEOGRAPHY)).toBe(true);
  });

  it('geografi yang tidak dikenal ditolak untuk scope terbatas', () => {
    expect(regionScopeCovers(PROVINCE, '0199a2b3-4c5d-7e8f-9012-3456789abcff', GEOGRAPHY)).toBe(false);
  });
});
