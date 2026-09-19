import { describe, expect, it } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { categoryNav } from '@/modules/site/components/network/templates/dark-navy/lib/nav';

describe('categoryNav', () => {
  it('pakai navigasi eksplisit bila diisi, dibatasi limit', () => {
    const site = makeNetworkSite([], [
      { label: 'A', path: '/a' },
      { label: 'B', path: '/b' },
      { label: 'C', path: '/c' },
    ]);
    expect(categoryNav(site, 2)).toEqual([
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
    ]);
  });

  it('turunkan kanal unik dari artikel sesuai urutan muncul', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ id: 'id-nasional', slug: 'slug-nasional', categorySlug: 'nasional', categoryName: 'Nasional' }),
      makeNetworkArticle({ id: 'id-nasional-2', slug: 'slug-nasional-2', categorySlug: 'nasional', categoryName: 'Nasional' }),
      makeNetworkArticle({ id: 'id-none', slug: 'slug-none' }),
      makeNetworkArticle({ id: 'id-tekno', slug: 'slug-tekno', categorySlug: 'tekno' }),
    ]);
    expect(categoryNav(site)).toEqual([
      { label: 'Nasional', href: '/categories/nasional' },
      { label: 'tekno', href: '/categories/tekno' },
    ]);
  });

  it('kosong bila tanpa navigasi dan tanpa artikel berkategori', () => {
    expect(categoryNav(makeNetworkSite([]))).toEqual([]);
  });
});
