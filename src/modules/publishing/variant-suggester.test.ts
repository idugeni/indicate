import { describe, expect, it } from 'vitest';

import {
  deriveSiteLabel,
  excerptForDescription,
  findCrossSiteDuplicates,
  suggestPublicationVariants,
} from '@/modules/publishing/variant-suggester';

describe('excerptForDescription', () => {
  it('membersihkan HTML dan memotong di batas kata', () => {
    expect(excerptForDescription('<p>Halo <b>dunia</b> redaksi</p>', 11)).toBe('Halo dunia');
    expect(excerptForDescription('   ')).toBe('');
  });
});

describe('deriveSiteLabel', () => {
  it('mengambil label DNS pertama sebagai kapital', () => {
    expect(deriveSiteLabel('wonosobo.indicate.id')).toBe('Wonosobo');
    expect(deriveSiteLabel('rutan-wonosobo.fakta01.my.id')).toBe('Rutan Wonosobo');
    expect(deriveSiteLabel('')).toBe('Portal');
  });
});

describe('suggestPublicationVariants', () => {
  it('menghasilkan override unik deterministik per site', () => {
    const input = {
      title: 'Judul Artikel Kanonik Redaksi',
      description: 'Deskripsi kanonik artikel yang cukup panjang untuk menjadi basis saran varian publikasi.',
      sites: [
        { siteId: 's-b', label: 'Wonosobo' },
        { siteId: 's-a', label: 'Temanggung' },
      ],
    };
    const first = suggestPublicationVariants(input);
    const second = suggestPublicationVariants(input);
    expect(first).toEqual(second);
    expect(Object.keys(first).sort()).toEqual(['s-a', 's-b']);
    expect(first['s-a']?.title).not.toBe(first['s-b']?.title);
    expect(first['s-a']?.description).not.toBe(first['s-b']?.description);
  });

  it('menghindari judul yang sudah terpakai', () => {
    const taken = 'Judul Artikel Kanonik Redaksi — Sorotan Wonosobo';
    const overrides = suggestPublicationVariants({
      title: 'Judul Artikel Kanonik Redaksi',
      description: 'Deskripsi kanonik artikel yang cukup panjang untuk menjadi basis saran varian publikasi.',
      sites: [{ siteId: 's-a', label: 'Wonosobo' }],
      takenTitles: [taken],
    });
    expect(overrides['s-a']?.title).not.toBe(taken);
  });
});

describe('findCrossSiteDuplicates', () => {
  const canonical = {
    canonicalTitle: 'Judul Kanonik',
    canonicalDescription: 'Deskripsi kanonik yang cukup panjang untuk diuji duplikasi lintas portal.',
  };

  it('aman saat setiap portal terdiferensiasi', () => {
    expect(
      findCrossSiteDuplicates({
        ...canonical,
        existing: [],
        requestedSiteIds: ['a', 'b'],
        overrides: {
          a: { title: 'Judul A Yang Unik Sekali', description: 'Deskripsi A yang cukup panjang dan jelas berbeda dari lainnya.' },
          b: { title: 'Judul B Yang Jelas Berbeda', description: 'Deskripsi B yang juga panjang dan tidak sama dengan portal A.' },
        },
      }),
    ).toEqual([]);
  });

  it('mendeteksi tabrakan dengan varian tayang lama', () => {
    const issues = findCrossSiteDuplicates({
      ...canonical,
      existing: [{ siteId: 'old', customTitle: 'Judul Kanonik', customDescription: null }],
      requestedSiteIds: ['new'],
      overrides: {},
    });
    expect(issues).toContainEqual({ field: 'title', code: 'duplicate' });
  });

  it('mengecualikan keluarga cascade yang berbagi kanonis', () => {
    const issues = findCrossSiteDuplicates({
      ...canonical,
      existing: [],
      requestedSiteIds: ['city', 'region', 'apex'],
      overrides: {},
      families: { city: 'auto:city', region: 'auto:city', apex: 'auto:city' },
    });
    expect(issues).toEqual([]);
  });

  it('tetap mendeteksi duplikat lintas keluarga', () => {
    const issues = findCrossSiteDuplicates({
      ...canonical,
      existing: [{ siteId: 'other', customTitle: 'Judul Kanonik', customDescription: null }],
      requestedSiteIds: ['new'],
      overrides: {},
      families: { other: 'manual:other', new: 'manual:new' },
    });
    expect(issues).toContainEqual({ field: 'title', code: 'duplicate' });
  });
});
