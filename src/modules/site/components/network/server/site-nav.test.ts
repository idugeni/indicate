import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (jalan: () => unknown) => jalan }));
vi.mock('@/modules/delivery', () => ({
  deliveryComposition: vi.fn(async () => ({ repository: { loadSiteCategories: async () => [] } })),
}));

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { getSiteCategoryIndex, getSiteCategoryNav } from '@/modules/site/components/network/server/site-nav';

describe('getSiteCategoryNav', () => {
  it('memakai navigasi eksplisit situs apa adanya', async () => {
    const site = makeNetworkSite([], [
      { label: 'Politik', path: '/politik' },
      { label: 'Ekonomi', path: '/ekonomi' },
    ]);
    await expect(getSiteCategoryNav(site)).resolves.toEqual([
      { label: 'Politik', href: '/politik' },
      { label: 'Ekonomi', href: '/ekonomi' },
    ]);
  });

  it('membatasi navigasi eksplisit sesuai limit', async () => {
    const site = makeNetworkSite(
      [],
      Array.from({ length: 9 }, (_, i) => ({ label: `Kanal ${i}`, path: `/kanal-${i}` })),
    );
    await expect(getSiteCategoryNav(site, 2)).resolves.toHaveLength(2);
    await expect(getSiteCategoryNav(site)).resolves.toHaveLength(7);
  });

  it('menurunkan kanal dari artikel terurut frekuensi', async () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ categorySlug: 'politik', categoryName: 'Politik' }),
      makeNetworkArticle({ categorySlug: 'ekonomi', categoryName: 'Ekonomi' }),
      makeNetworkArticle({ categorySlug: 'ekonomi', categoryName: 'Ekonomi' }),
    ]);
    await expect(getSiteCategoryNav(site)).resolves.toEqual([
      { label: 'Ekonomi', href: '/categories/ekonomi', slug: 'ekonomi' },
      { label: 'Politik', href: '/categories/politik', slug: 'politik' },
    ]);
  });

  it('mengembalikan daftar kosong tanpa navigasi dan artikel', async () => {
    await expect(getSiteCategoryNav(makeNetworkSite())).resolves.toEqual([]);
  });
});

describe('getSiteCategoryIndex', () => {
  it('mengembalikan daftar kosong tanpa navigasi dan artikel', async () => {
    await expect(getSiteCategoryIndex(makeNetworkSite())).resolves.toEqual([]);
  });
});
