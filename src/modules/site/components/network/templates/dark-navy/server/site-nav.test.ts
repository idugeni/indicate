import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (jalan: () => unknown) => jalan }));
vi.mock('@/modules/delivery', () => ({
  deliveryComposition: vi.fn(async () => ({ repository: { loadSiteCategories: async () => [] } })),
}));

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { getSiteCategoryNav } from '@/modules/site/components/network/templates/dark-navy/server/site-nav';

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
      Array.from({ length: 8 }, (_, i) => ({ label: `Kanal ${i}`, path: `/kanal-${i}` })),
    );
    await expect(getSiteCategoryNav(site, 2)).resolves.toHaveLength(2);
    await expect(getSiteCategoryNav(site)).resolves.toHaveLength(6);
  });

  it('menurunkan kanal dari artikel saat navigasi kosong', async () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ categorySlug: 'politik', categoryName: 'Politik' }),
      makeNetworkArticle({ categorySlug: 'ekonomi', categoryName: 'Ekonomi' }),
    ]);
    await expect(getSiteCategoryNav(site)).resolves.toEqual([
      { label: 'Politik', href: '/categories/politik' },
      { label: 'Ekonomi', href: '/categories/ekonomi' },
    ]);
  });

  it('mengembalikan daftar kosong tanpa navigasi dan artikel', async () => {
    await expect(getSiteCategoryNav(makeNetworkSite())).resolves.toEqual([]);
  });
});
