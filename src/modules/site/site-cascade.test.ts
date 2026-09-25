import { describe, expect, it } from 'vitest';

import { CascadeIncompleteError, cascadeFamilyKey, expandCascadeSites, expandCascadeSitesStrict } from '@/modules/site/site-cascade';

const SITES = [
  { id: 'apex', domainId: 'd-1', siteLevel: 'apex' as const, parentSiteId: null, normalizedHostname: 'portal.test', status: 'active' },
  { id: 'region', domainId: 'd-1', siteLevel: 'region' as const, parentSiteId: 'apex', normalizedHostname: 'jawa-tengah.portal.test', status: 'active' },
  { id: 'city', domainId: 'd-1', siteLevel: 'city' as const, parentSiteId: 'region', normalizedHostname: 'wonosobo.portal.test', status: 'active' },
  { id: 'other-apex', domainId: 'd-2', siteLevel: 'apex' as const, parentSiteId: null, normalizedHostname: 'lain.test', status: 'active' },
  { id: 'dead', domainId: 'd-1', siteLevel: 'region' as const, parentSiteId: 'apex', normalizedHostname: 'mati.portal.test', status: 'archived' },
  { id: 'orphan', domainId: 'd-1', siteLevel: 'city' as const, parentSiteId: null, normalizedHostname: 'yogyakarta.portal.test', status: 'active' },
];

describe('expandCascadeSites', () => {
  it('kota meluas ke region induk dan apex dengan kanonis primer', () => {
    const expansion = expandCascadeSites(SITES, ['city'], 'berita-utama');
    expect(expansion.targets).toEqual([
      { siteId: 'city', originSiteId: null, canonicalUrl: null },
      { siteId: 'region', originSiteId: 'city', canonicalUrl: 'https://portal.test/berita-utama' },
      { siteId: 'apex', originSiteId: 'city', canonicalUrl: 'https://portal.test/berita-utama' },
    ]);
    expect(expansion.unresolved).toEqual([]);
  });

  it('region meluas ke apex saja dan tenant lain tidak ikut', () => {
    expect(expandCascadeSites(SITES, ['region'], 'a').targets.map((target) => target.siteId)).toEqual([
      'region',
      'apex',
    ]);
    expect(expandCascadeSites(SITES, ['apex'], 'a').targets).toEqual([
      { siteId: 'apex', originSiteId: null, canonicalUrl: null },
    ]);
  });

  it('pilihan eksplisit selalu manual walau bisa diturunkan', () => {
    const expansion = expandCascadeSites(SITES, ['city', 'apex'], 'a');
    expect(expansion.targets.find((target) => target.siteId === 'apex')).toEqual({
      siteId: 'apex',
      originSiteId: null,
      canonicalUrl: null,
    });
  });

  it('idempoten pada himpunan situs dan mengabaikan yang tak dikenal', () => {
    const once = expandCascadeSites(SITES, ['city'], 'a');
    const twice = expandCascadeSites(SITES, once.targets.map((target) => target.siteId), 'a');
    expect(new Set(twice.targets.map((target) => target.siteId))).toEqual(
      new Set(once.targets.map((target) => target.siteId)),
    );
    expect(expandCascadeSites(SITES, ['city', 'tak-ada', 'dead'], 'a').targets.map((target) => target.siteId)).toEqual([
      'city',
      'region',
      'apex',
    ]);
  });

  it('melaporkan region yang hilang dan tetap menyelesaikan sisa rantai', () => {
    const expansion = expandCascadeSites(SITES, ['orphan'], 'a');
    expect(expansion.unresolved).toEqual([{ originSiteId: 'orphan', missing: 'region' }]);
    expect(expansion.targets.map((target) => target.siteId)).toEqual(['orphan']);
  });

  it('melaporkan apex yang hilang dan tetap menugaskan region yang ada', () => {
    const sites = SITES.filter((site) => site.id !== 'apex');
    const expansion = expandCascadeSites(sites, ['city'], 'a');
    expect(expansion.unresolved).toEqual([{ originSiteId: 'city', missing: 'apex' }]);
    expect(expansion.targets.map((target) => target.siteId)).toEqual(['city', 'region']);
  });

  it('membedakan kunci keluarga cascade', () => {
    expect(cascadeFamilyKey('s-1', 'manual', null)).toBe('manual:s-1');
    expect(cascadeFamilyKey('s-2', 'auto', 's-1')).toBe('auto:s-1');
    expect(cascadeFamilyKey('s-3', null, null)).toBe('manual:s-3');
  });
});

describe('expandCascadeSitesStrict', () => {
  it('mengembalikan closure lengkap saat semua induk ada', () => {
    expect(expandCascadeSitesStrict(SITES, ['city'], 'a').map((target) => target.siteId)).toEqual(['city', 'region', 'apex']);
  });

  it('menolak partial write ketika rantai hierarchy tidak lengkap', () => {
    expect(() => expandCascadeSitesStrict(SITES, ['orphan'], 'a')).toThrow(CascadeIncompleteError);
    expect(() => expandCascadeSitesStrict(SITES, ['orphan'], 'a')).toThrow(/missing region/);
  });
});
