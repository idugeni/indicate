import { describe, expect, it } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import {
  ABOUT_TRUST_LINKS,
  aboutDescription,
  aboutTitle,
  deriveAboutCategories,
  deriveAboutPublisher,
} from '@/modules/site/about-profile';

describe('deriveAboutCategories', () => {
  it('mengembalikan kanal unik sesuai urutan kemunculan', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({ categorySlug: 'politik', categoryName: 'Politik' }),
      makeNetworkArticle({ categorySlug: 'ekonomi', categoryName: 'Ekonomi' }),
      makeNetworkArticle({ categorySlug: 'politik', categoryName: 'Politik' }),
      makeNetworkArticle({}),
    ]);
    expect(deriveAboutCategories(site)).toEqual([
      { slug: 'politik', name: 'Politik' },
      { slug: 'ekonomi', name: 'Ekonomi' },
    ]);
  });

  it('mengembalikan daftar kosong saat belum ada kanal', () => {
    expect(deriveAboutCategories(makeNetworkSite())).toEqual([]);
  });
});

describe('deriveAboutPublisher', () => {
  it('memilih penerbit dominan dan menggabungkan identitasnya', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({
        publisherName: 'Humas A',
        publisherBio: 'Bio humas A.',
        publisherCity: 'Wonosobo',
        publisherSocials: { instagram: 'https://instagram.com/humasa' },
        publisherVerified: true,
      }),
      makeNetworkArticle({ publisherName: 'Humas B' }),
      makeNetworkArticle({ publisherName: 'Humas A', publisherSocials: {} }),
    ]);
    expect(deriveAboutPublisher(site)).toEqual({
      name: 'Humas A',
      bio: 'Bio humas A.',
      city: 'Wonosobo',
      logoUrl: null,
      verified: true,
      socials: { instagram: 'https://instagram.com/humasa' },
      articleCount: 2,
    });
  });

  it('mengembalikan null saat tidak ada artikel bernama penerbit', () => {
    expect(deriveAboutPublisher(makeNetworkSite([makeNetworkArticle({})]))).toBe(null);
    expect(deriveAboutPublisher(makeNetworkSite())).toBe(null);
  });
});

describe('about trust hub', () => {
  it('menautkan kontak, legal, dan pelaporan', () => {
    expect(ABOUT_TRUST_LINKS.map((link) => link.href)).toEqual([
      '/kontak',
      '/kebijakan-privasi',
      '/syarat-ketentuan',
      '/report',
    ]);
  });
});

describe('about region meta', () => {
  it('membedakan judul dan deskripsi situs regional', () => {
    expect(aboutTitle('Portal', null)).toBe('Tentang Portal');
    expect(aboutTitle('Portal', 'Jawa Tengah')).toBe('Tentang Portal — Jawa Tengah');
    expect(aboutDescription('Portal', 'Deskripsi portal.', null)).toBe('Deskripsi portal.');
    expect(aboutDescription('Portal', 'Deskripsi portal.', 'Jawa Tengah')).toBe(
      'Deskripsi portal. Melayani wilayah Jawa Tengah.',
    );
  });

  it('memakai fallback deskripsi saat pengaturan kosong', () => {
    expect(aboutDescription('Portal', undefined, null)).toContain('Profil Portal');
    expect(aboutDescription('Portal', '  ', 'Jawa Tengah')).toContain('Melayani wilayah Jawa Tengah.');
  });
});
