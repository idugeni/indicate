import { describe, expect, it } from 'vitest';

import { mapArticleForOrg, resolveOwnerOrgSlug } from '@/modules/dashboard/for-org-create';

const TARGET = {
  publishers: [
    { id: 'pub-upt', name: 'RUTAN KELAS II B WONOSOBO', status: 'active' },
    { id: 'pub-arsip', name: 'Arsip Lama', status: 'archived' },
  ],
  authors: [{ id: 'aut-redaksi', displayName: 'Redaksi', status: 'active' }],
  categories: [{ id: 'cat-berita', slug: 'berita', status: 'active' }],
  regions: [
    { id: 'reg-prov', slug: 'jawa-tengah', status: 'active' },
    { id: 'reg-kota', slug: 'wonosobo', status: 'active' },
  ],
};

describe('resolveOwnerOrgSlug', () => {
  it('menurunkan slug org dari nama penerbit cermin', () => {
    expect(resolveOwnerOrgSlug('RUTAN KELAS II B WONOSOBO')).toBe('rutan-kelas-ii-b-wonosobo');
    expect(resolveOwnerOrgSlug('LAPAS KELAS I SEMARANG')).toBe('lapas-kelas-i-semarang');
  });
});

describe('mapArticleForOrg', () => {
  it('memetakan referensi operator ke baris org pemilik', () => {
    expect(
      mapArticleForOrg(
        {
          publisherId: 'pub-op',
          authorId: 'aut-op',
          categoryIds: ['cat-op'],
          regionId: 'reg-op',
          publisherName: 'RUTAN KELAS II B WONOSOBO',
          categorySlugs: ['berita'],
          regionSlug: 'wonosobo',
        },
        TARGET,
      ),
    ).toEqual({
      ownerOrgSlug: 'rutan-kelas-ii-b-wonosobo',
      publisherId: 'pub-upt',
      authorId: 'aut-redaksi',
      categoryIds: ['cat-berita'],
      regionId: 'reg-kota',
    });
  });

  it('mengembalikan null bila penerbit cermin tak ada di org tujuan', () => {
    expect(
      mapArticleForOrg(
        {
          publisherId: 'pub-op',
          authorId: null,
          categoryIds: [],
          regionId: null,
          publisherName: 'Indicate Newsroom',
          categorySlugs: [],
          regionSlug: null,
        },
        TARGET,
      ),
    ).toBeNull();
  });

  it('menoleransi kategori dan wilayah yang tak cocok', () => {
    expect(
      mapArticleForOrg(
        {
          publisherId: 'pub-op',
          authorId: null,
          categoryIds: ['cat-op'],
          regionId: 'reg-op',
          publisherName: 'RUTAN KELAS II B WONOSOBO',
          categorySlugs: ['tidak-ada'],
          regionSlug: 'tidak-ada',
        },
        TARGET,
      ),
    ).toMatchObject({ publisherId: 'pub-upt', categoryIds: [], regionId: null });
  });
});
