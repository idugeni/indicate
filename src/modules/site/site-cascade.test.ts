import { describe, expect, it } from 'vitest';

import { cascadeFamilyKey, expandCascadeSites } from '@/modules/site/site-cascade';

const SITES = [
  { id: 'apex', domainId: 'd-1', regionId: null, normalizedHostname: 'portal.test', status: 'active' },
  { id: 'region', domainId: 'd-1', regionId: 'r-1', normalizedHostname: 'wonosobo.portal.test', status: 'active' },
  { id: 'city', domainId: 'd-1', regionId: 'c-1', normalizedHostname: 'kota.portal.test', status: 'active' },
  { id: 'other-apex', domainId: 'd-2', regionId: null, normalizedHostname: 'lain.test', status: 'active' },
  { id: 'dead', domainId: 'd-1', regionId: 'r-1', normalizedHostname: 'mati.portal.test', status: 'archived' },
];

const REGIONS = [
  { id: 'r-1', kind: 'region' as const, parentRegionId: null, status: 'active' },
  { id: 'c-1', kind: 'city' as const, parentRegionId: 'r-1', status: 'active' },
];

describe('expandCascadeSites', () => {
  it('kota meluas ke region induk dan apex dengan kanonis primer', () => {
    const expansion = expandCascadeSites(SITES, REGIONS, ['city'], 'berita-utama');
    expect(expansion.targets).toEqual([
      { siteId: 'city', originSiteId: null, canonicalUrl: null },
      { siteId: 'region', originSiteId: 'city', canonicalUrl: 'https://portal.test/berita-utama' },
      { siteId: 'apex', originSiteId: 'city', canonicalUrl: 'https://portal.test/berita-utama' },
    ]);
    expect(expansion.unresolved).toEqual([]);
  });

  it('region meluas ke apex saja dan tenant tidak meluas', () => {
    expect(expandCascadeSites(SITES, REGIONS, ['region'], 'a').targets.map((target) => target.siteId)).toEqual([
      'region',
      'apex',
    ]);
    expect(expandCascadeSites(SITES, REGIONS, ['apex'], 'a').targets).toEqual([
      { siteId: 'apex', originSiteId: null, canonicalUrl: null },
    ]);
  });

  it('pilihan eksplisit selalu manual walau bisa diturunkan', () => {
    const expansion = expandCascadeSites(SITES, REGIONS, ['city', 'apex'], 'a');
    expect(expansion.targets.find((target) => target.siteId === 'apex')).toEqual({
      siteId: 'apex',
      originSiteId: null,
      canonicalUrl: null,
    });
  });

  it('idempoten pada himpunan situs dan mengabaikan yang tak dikenal', () => {
    const once = expandCascadeSites(SITES, REGIONS, ['city'], 'a');
    const twice = expandCascadeSites(
      SITES,
      REGIONS,
      once.targets.map((target) => target.siteId),
      'a',
    );
    expect(new Set(twice.targets.map((target) => target.siteId))).toEqual(
      new Set(once.targets.map((target) => target.siteId)),
    );
    expect(expandCascadeSites(SITES, REGIONS, ['city', 'tak-ada', 'dead'], 'a').targets.map((target) => target.siteId)).toEqual([
      'city',
      'region',
      'apex',
    ]);
  });

  it('melaporkan induk hilang tanpa menggagalkan', () => {
    const regions = [{ id: 'c-1', kind: 'city' as const, parentRegionId: 'r-hilang', status: 'active' }];
    const expansion = expandCascadeSites(SITES, regions, ['city'], 'a');
    expect(expansion.targets.map((target) => target.siteId)).toEqual(['city', 'apex']);
    expect(expansion.unresolved).toEqual([{ originSiteId: 'city', missing: 'region' }]);
  });

  it('membedakan kunci keluarga cascade', () => {
    expect(cascadeFamilyKey('s-1', 'manual', null)).toBe('manual:s-1');
    expect(cascadeFamilyKey('s-2', 'auto', 's-1')).toBe('auto:s-1');
    expect(cascadeFamilyKey('s-3', null, null)).toBe('manual:s-3');
  });
});
