import { describe, expect, it, vi } from 'vitest';

const { cacheKeys, categoryRows } = vi.hoisted(() => ({
  cacheKeys: [] as string[][],
  categoryRows: [] as { slug: string; name: string; articleCount: number; lastUpdatedAt: string | null }[],
}));

vi.mock('next/cache', () => ({
  unstable_cache: (jalan: () => unknown, keyParts: string[]) => {
    cacheKeys.push(keyParts);
    return jalan;
  },
}));
vi.mock('@/modules/delivery', () => ({
  deliveryComposition: vi.fn(async () => ({ repository: { loadSiteCategories: async () => categoryRows } })),
}));

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { getSiteCategoryChannels, getSiteCategoryIndex, getSiteCategoryNav } from '@/modules/site/components/network/server/site-nav';

/** Baris kanal dengan jumlah artikel default yang lolos lantai konten tipis. */
function row(slug: string, name: string, articleCount = 5) {
  return { slug, name, articleCount, lastUpdatedAt: '2026-09-10T00:00:00.000Z' };
}

function onlyDbRows(rows: readonly { slug: string; name: string; articleCount?: number; lastUpdatedAt?: string | null }[]) {
  categoryRows.length = 0;
  categoryRows.push(...rows.map((item) => ({
    slug: item.slug,
    name: item.name,
    articleCount: item.articleCount ?? 5,
    lastUpdatedAt: item.lastUpdatedAt ?? '2026-09-10T00:00:00.000Z',
  })));
  cacheKeys.length = 0;
}

function keys(): readonly string[] {
  return cacheKeys.map((parts) => parts.join('|'));
}

function labels(items: readonly { label: string }[]): readonly string[] {
  return items.map((item) => item.label);
}

const LETTERS = ['Agri', 'Ekonomi', 'Gempa', 'Hujan', 'Iklim', 'Jakarta', 'Klimat', 'Langit'];

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

  it('urutan kanal dari DB stabil dan tidak ikut artikel halaman', async () => {
    onlyDbRows([
      { slug: 'zon', name: 'Zona' },
      { slug: 'ekonomi', name: 'Ekonomi' },
      { slug: 'agri', name: 'Agri' },
    ]);
    const diBeranda = makeNetworkSite([makeNetworkArticle({ categorySlug: 'zon', categoryName: 'Zona' })]);
    const diKanal = makeNetworkSite([makeNetworkArticle({ categorySlug: 'agri', categoryName: 'Agri' })]);

    await expect(getSiteCategoryNav(diBeranda)).resolves.toHaveLength(3);
    expect(labels(await getSiteCategoryNav(diBeranda))).toEqual(['Agri', 'Ekonomi', 'Zona']);
    expect(labels(await getSiteCategoryNav(diKanal))).toEqual(['Agri', 'Ekonomi', 'Zona']);
  });

  it('footer subset persis dari nav header', async () => {
    onlyDbRows(LETTERS.map((name) => ({ slug: name.toLowerCase(), name })));
    const site = makeNetworkSite();

    expect(labels(await getSiteCategoryNav(site))).toEqual(LETTERS.slice(0, 7));
    expect(labels(await getSiteCategoryNav(site, 6))).toEqual(LETTERS.slice(0, 6));
  });

  it('berbagi satu entri cache untuk semua limit nav di bawah plafon', async () => {
    onlyDbRows([]);
    const site = makeNetworkSite();

    await getSiteCategoryNav(site, 7);
    await getSiteCategoryNav(site, 6);
    await getSiteCategoryNav(site, 3);

    expect(keys()).toHaveLength(3);
    expect(new Set(keys()).size).toBe(1);
  });

  it('limit di atas plafon memakai entri sendiri agar tidak terpotong', async () => {
    onlyDbRows([]);
    const site = makeNetworkSite();

    await getSiteCategoryNav(site, 12);

    expect(keys()[0]).toContain(':12');
  });

  it('nav dan indeks tidak berbagi entri cache', async () => {
    onlyDbRows([]);
    const site = makeNetworkSite();

    await getSiteCategoryNav(site);
    await getSiteCategoryIndex(site);

    expect(keys()).toHaveLength(2);
    expect(new Set(keys()).size).toBe(2);
  });

  it('limit ikut dalam key cache', async () => {
    onlyDbRows([]);
    const site = makeNetworkSite();

    await getSiteCategoryNav(site, 12);
    await getSiteCategoryIndex(site, 200);

    expect(keys()[0]).toContain(':12');
    expect(keys()[1]).toContain(':200');
  });

  it('menurunkan kanal dari artikel saat tabel kanal kosong', async () => {
    onlyDbRows([]);
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
    onlyDbRows([]);
    await expect(getSiteCategoryNav(makeNetworkSite())).resolves.toEqual([]);
  });
});

describe('getSiteCategoryIndex', () => {
  it('baca seluruh kanal aktif, bukan sisa entri navigasi', async () => {
    onlyDbRows(LETTERS.map((name) => ({ slug: name.toLowerCase(), name })));
    await expect(getSiteCategoryIndex(makeNetworkSite())).resolves.toHaveLength(LETTERS.length);
  });

  it('urut A–Z dengan slug sebagai pemutus nama sama', async () => {
    onlyDbRows([
      { slug: 'b', name: 'Sama' },
      { slug: 'a', name: 'Sama' },
      { slug: 'c', name: 'Abad' },
    ]);
    await expect(getSiteCategoryIndex(makeNetworkSite())).resolves.toEqual([
      { label: 'Abad', href: '/categories/c', slug: 'c' },
      { label: 'Sama', href: '/categories/a', slug: 'a' },
      { label: 'Sama', href: '/categories/b', slug: 'b' },
    ]);
  });

  it('mengembalikan daftar kosong tanpa navigasi dan artikel', async () => {
    onlyDbRows([]);
    await expect(getSiteCategoryIndex(makeNetworkSite())).resolves.toEqual([]);
  });
});

describe('getSiteCategoryChannels', () => {
  it('berbagi entri cache dengan halaman Indeks, jadi sitemap tidak menambah query', async () => {
    onlyDbRows([]);
    const site = makeNetworkSite();

    await getSiteCategoryIndex(site);
    await getSiteCategoryChannels(site);

    expect(keys()).toHaveLength(2);
    expect(new Set(keys()).size).toBe(1);
  });

  it('bawa jumlah artikel dari SQL, bukan dari jendela 100 artikel', async () => {
    onlyDbRows([row('lama', 'Lama', 480), row('tipis', 'Tipis', 0)]);
    const site = makeNetworkSite([makeNetworkArticle({ slug: 'segar', categorySlug: 'segar' })]);

    await expect(getSiteCategoryChannels(site)).resolves.toEqual([
      { slug: 'lama', name: 'Lama', articleCount: 480, lastUpdatedAt: '2026-09-10T00:00:00.000Z' },
      { slug: 'tipis', name: 'Tipis', articleCount: 0, lastUpdatedAt: '2026-09-10T00:00:00.000Z' },
    ]);
  });

  it('urut A–Z seperti halaman Indeks', async () => {
    onlyDbRows([row('zon', 'Zona'), row('agri', 'Agri'), row('ekonomi', 'Ekonomi')]);
    const channels = await getSiteCategoryChannels(makeNetworkSite());
    expect(channels.map((item) => item.name)).toEqual(['Agri', 'Ekonomi', 'Zona']);
  });

  it('turunkan jumlah dari artikel hanya saat tabel kanal kosong', async () => {
    onlyDbRows([]);
    const site = makeNetworkSite([
      makeNetworkArticle({ categorySlug: 'politik', categoryName: 'Politik', updatedAt: '2026-09-02T00:00:00.000Z' }),
      makeNetworkArticle({ categorySlug: 'politik', categoryName: 'Politik', updatedAt: '2026-09-05T00:00:00.000Z' }),
      makeNetworkArticle({ categorySlug: 'ekonomi', categoryName: 'Ekonomi', updatedAt: '2026-09-04T00:00:00.000Z' }),
    ]);

    await expect(getSiteCategoryChannels(site)).resolves.toEqual([
      { slug: 'ekonomi', name: 'Ekonomi', articleCount: 1, lastUpdatedAt: '2026-09-04T00:00:00.000Z' },
      { slug: 'politik', name: 'Politik', articleCount: 2, lastUpdatedAt: '2026-09-05T00:00:00.000Z' },
    ]);
  });
});