import { describe, expect, it } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import {
  CATEGORY_INDEX_HREF,
  categoryDotColor,
  categoryNav,
  isCategoryNavActive,
  splitCategoryNav,
  withCategoryIndex,
} from '@/modules/site/components/network/ui/nav';

describe('categoryNav', () => {
  it('pakai navigasi eksplisit bila diisi, dibatasi limit', () => {
    const site = makeNetworkSite([], [
      { label: 'A', path: '/a' },
      { label: 'B', path: '/b' },
      { label: 'C', path: '/c' },
    ]);
    expect(categoryNav(site, 2)).toEqual([
      { label: 'A', href: '/a', slug: 'a' },
      { label: 'B', href: '/b', slug: 'b' },
    ]);
  });

  it('urutkan kanal by frekuensi artikel, terbesar dulu', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ id: 'id-sepi', slug: 'slug-sepi', categorySlug: 'sepi', categoryName: 'Sepi' }),
      makeNetworkArticle({ id: 'id-nasional', slug: 'slug-nasional', categorySlug: 'nasional', categoryName: 'Nasional' }),
      makeNetworkArticle({ id: 'id-tekno-1', slug: 'slug-tekno-1', categorySlug: 'tekno', categoryName: 'Tekno' }),
      makeNetworkArticle({ id: 'id-nasional-2', slug: 'slug-nasional-2', categorySlug: 'nasional', categoryName: 'Nasional' }),
      makeNetworkArticle({ id: 'id-none', slug: 'slug-none' }),
      makeNetworkArticle({ id: 'id-tekno-2', slug: 'slug-tekno-2', categorySlug: 'tekno', categoryName: 'Tekno' }),
      makeNetworkArticle({ id: 'id-tekno-3', slug: 'slug-tekno-3', categorySlug: 'tekno', categoryName: 'Tekno' }),
    ]);
    expect(categoryNav(site)).toEqual([
      { label: 'Tekno', href: '/categories/tekno', slug: 'tekno' },
      { label: 'Nasional', href: '/categories/nasional', slug: 'nasional' },
      { label: 'Sepi', href: '/categories/sepi', slug: 'sepi' },
    ]);
  });

  it('kosong bila tanpa navigasi dan tanpa artikel berkategori', () => {
    expect(categoryNav(makeNetworkSite([]))).toEqual([]);
  });
});

describe('splitCategoryNav', () => {
  it('bagi tiga inline dan sisanya ke lainnya', () => {
    const items = Array.from({ length: 7 }, (slot, i) => ({ label: `Kat ${i + 1}`, href: `/kat-${i + 1}` }));
    const { visible, overflow } = splitCategoryNav(items);
    expect(visible).toHaveLength(3);
    expect(overflow).toHaveLength(4);
  });
});

describe('withCategoryIndex', () => {
  it('tutup daftar dengan indeks', () => {
    const items = [{ label: 'A', href: '/a' }];
    expect(withCategoryIndex(items)).toEqual([...items, { label: 'Indeks', href: CATEGORY_INDEX_HREF, slug: 'indeks' }]);
  });

  it('tidak gandakan indeks yang sudah ada', () => {
    const items = withCategoryIndex([]);
    expect(withCategoryIndex(items)).toEqual(items);
  });
});

describe('isCategoryNavActive', () => {
  it('cocok persis dan toleran garis miring tepi', () => {
    expect(isCategoryNavActive('/categories/tekno', '/categories/tekno')).toBe(true);
    expect(isCategoryNavActive('/categories/tekno/', '/categories/tekno')).toBe(true);
    expect(isCategoryNavActive('/categories/tekno', '/categories/nasional')).toBe(false);
  });
});

describe('categoryDotColor', () => {
  it('stabil per slug', () => {
    expect(categoryDotColor('tekno')).toBe(categoryDotColor('/categories/tekno'));
    expect(categoryDotColor('tekno')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
