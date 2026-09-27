import { describe, expect, it } from 'vitest';

import { CascadeIncompleteError, cascadeFamilyKey, unresolvedCascadeAncestors } from '@/modules/site/site-cascade';

const SITES = [
  { id: 'apex', siteLevel: 'apex' as const, parentSiteId: null, status: 'active' },
  { id: 'region', siteLevel: 'region' as const, parentSiteId: 'apex', status: 'active' },
  { id: 'city', siteLevel: 'city' as const, parentSiteId: 'region', status: 'active' },
  { id: 'other-apex', siteLevel: 'apex' as const, parentSiteId: null, status: 'active' },
  { id: 'dead', siteLevel: 'region' as const, parentSiteId: 'apex', status: 'archived' },
  { id: 'orphan', siteLevel: 'city' as const, parentSiteId: null, status: 'active' },
];

describe('unresolvedCascadeAncestors', () => {
  it('menerima rantai lengkap dari apex sampai kota', () => {
    expect(unresolvedCascadeAncestors(SITES, ['city'])).toEqual([]);
    expect(unresolvedCascadeAncestors(SITES, ['region'])).toEqual([]);
    expect(unresolvedCascadeAncestors(SITES, ['apex'])).toEqual([]);
  });

  it('melaporkan region yang hilang pada portal kota', () => {
    expect(unresolvedCascadeAncestors(SITES, ['orphan'])).toEqual([{ originSiteId: 'orphan', missing: 'region' }]);
  });

  it('melaporkan apex yang hilang dan menyelesaikan sisa rantai', () => {
    const sites = SITES.filter((site) => site.id !== 'apex');
    expect(unresolvedCascadeAncestors(sites, ['city'])).toEqual([{ originSiteId: 'city', missing: 'apex' }]);
  });

  it('mengabaikan portal tak dikenal, non-aktif, dan duplikat', () => {
    expect(unresolvedCascadeAncestors(SITES, ['tak-ada', 'dead', 'orphan', 'orphan'])).toEqual([
      { originSiteId: 'orphan', missing: 'region' },
    ]);
  });

  it('tidak menurunkan apa pun: hanya melaporkan rantai yang rusak', () => {
    const broken = unresolvedCascadeAncestors(SITES, ['orphan']);
    expect(new CascadeIncompleteError(broken).message).toBe('cascade_hierarchy_incomplete: orphan missing region');
  });
});

describe('cascadeFamilyKey', () => {
  it('menggabungkan asal dan keturunannya ke satu keluarga', () => {
    expect(cascadeFamilyKey('s-1', null)).toBe('origin:s-1');
    expect(cascadeFamilyKey('s-2', 's-1')).toBe('origin:s-1');
    expect(cascadeFamilyKey('s-3', null)).toBe('origin:s-3');
  });
});
