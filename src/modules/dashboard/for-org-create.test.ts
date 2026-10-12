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

interface ReferenceOverrides {
  readonly publisherId?: string | null;
  readonly authorId?: string | null;
  readonly authorName?: string | null;
  readonly categoryIds?: readonly string[];
  readonly regionId?: string | null;
  readonly publisherName?: string;
  readonly categorySlugs?: readonly string[];
  readonly regionSlug?: string | null;
}

const reference = (overrides: ReferenceOverrides = {}) => ({
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
  it('memetakan metadata yang memang tersedia di tenant tujuan', () => {
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

  it('tidak mengganti kategori yang belum ada dengan kategori lain', () => {
    expect(mapArticleForOrg(reference({
      categorySlugs: ['keamanan', 'pemasyarakatan'],
    }), TARGET)).toEqual({ ok: false, field: 'categoryIds' });
  });

  it('tidak mengganti penulis kosong dengan penulis bawaan', () => {
    expect(mapArticleForOrg(reference({
      authorId: null,
      authorName: null,
    }), TARGET)).toMatchObject({
      ok: true,
      value: { authorId: null },
    });
  });

  it('melaporkan hanya publisherId bila penerbit tujuan tidak tersedia', () => {
    expect(mapArticleForOrg(reference({
      publisherName: 'Indicate Newsroom',
      categorySlugs: [],
      regionSlug: null,
    }), TARGET)).toEqual({ ok: false, field: 'publisherId' });
  });

  it('melaporkan hanya authorId bila penulis tujuan tidak tersedia', () => {
    expect(mapArticleForOrg(reference({
      authorName: 'Indicate Newsroom',
      categorySlugs: [],
      regionSlug: null,
    }), TARGET)).toEqual({ ok: false, field: 'authorId' });
  });

  it('melaporkan hanya regionId bila wilayah tujuan tidak tersedia', () => {
    expect(mapArticleForOrg(reference({
      categorySlugs: [],
      regionSlug: 'kabupaten-tidak-ada',
    }), TARGET)).toEqual({ ok: false, field: 'regionId' });
  });
});
