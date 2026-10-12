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

const reference = (overrides: Record<string, unknown> = {}) => ({
  publisherId: 'pub-op',
  authorId: 'aut-op',
  authorName: 'Redaksi',
  categoryIds: ['cat-op'],
  regionId: 'reg-op',
  publisherName: 'RUTAN KELAS II B WONOSOBO',
  categorySlugs: ['berita'],
  regionSlug: 'wonosobo',
  ...overrides,
});

describe('resolveOwnerOrgSlug', () => {
  it('menurunkan slug org dari nama penerbit cermin', () => {
    expect(resolveOwnerOrgSlug('RUTAN KELAS II B WONOSOBO')).toBe('rutan-kelas-ii-b-wonosobo');
    expect(resolveOwnerOrgSlug('LAPAS KELAS I SEMARANG')).toBe('lapas-kelas-i-semarang');
  });
});

describe('mapArticleForOrg', () => {
  it('memetakan referensi operator ke baris org pemilik', () => {
    expect(mapArticleForOrg(reference(), TARGET)).toEqual({
      ok: true,
      value: {
        ownerOrgSlug: 'rutan-kelas-ii-b-wonosobo',
        publisherId: 'pub-upt',
        authorId: 'aut-redaksi',
        categoryIds: ['cat-berita'],
        regionId: 'reg-kota',
      },
    });
  });

  it('memetakan kategori yang tidak disediakan tenant ke kategori lokal Berita', () => {
    expect(mapArticleForOrg(reference({
      authorName: 'Indicate Newsroom',
      categorySlugs: ['keamanan', 'pemasyarakatan', 'berita', 'keamanan'],
    }), TARGET)).toEqual({
      ok: true,
      value: {
        ownerOrgSlug: 'rutan-kelas-ii-b-wonosobo',
        publisherId: 'pub-upt',
        authorId: 'aut-redaksi',
        categoryIds: ['cat-berita'],
        regionId: 'reg-kota',
      },
    });
  });

  it('melaporkan hanya publisherId bila penerbit cermin tak ada di org tujuan', () => {
    expect(mapArticleForOrg(reference({
      publisherName: 'Indicate Newsroom',
      categorySlugs: [],
      regionSlug: null,
    }), TARGET)).toEqual({ ok: false, field: 'publisherId' });
  });

  it('melaporkan categoryIds bila kategori tujuan tak ada dan kategori default Berita juga tidak tersedia', () => {
    expect(mapArticleForOrg(reference({
      categorySlugs: ['keamanan'],
    }), { ...TARGET, categories: [] })).toEqual({ ok: false, field: 'categoryIds' });
  });

  it('melaporkan regionId bila wilayah tidak ada di organisasi tujuan', () => {
    expect(mapArticleForOrg(reference({
      categorySlugs: [],
      regionSlug: 'kabupaten-tidak-ada',
    }), TARGET)).toEqual({ ok: false, field: 'regionId' });
  });
});
