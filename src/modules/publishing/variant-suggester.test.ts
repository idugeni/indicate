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
  it('memakai judul dan deskripsi kanonik apa adanya di semua portal', () => {
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
    expect(first['s-a']?.title).toBe('Judul Artikel Kanonik Redaksi');
    expect(first['s-b']?.title).toBe('Judul Artikel Kanonik Redaksi');
    expect(first['s-a']?.description).toBe(input.description);
    expect(first['s-b']?.description).toBe(input.description);
  });
});

describe('findCrossSiteDuplicates', () => {
  const canonical = {
    canonicalTitle: 'Judul Kanonik',
    canonicalDescription: 'Deskripsi kanonik yang cukup panjang untuk diuji duplikasi lintas portal.',
  };

  it('mengizinkan judul sama di semua portal', () => {
    expect(
      findCrossSiteDuplicates({
        ...canonical,
        existing: [],
        requestedSiteIds: ['a', 'b'],
        overrides: {
          a: { title: 'Judul Sama Persis', description: 'Deskripsi sama yang cukup panjang dan jelas identik antar portal.' },
          b: { title: 'Judul Sama Persis', description: 'Deskripsi sama yang cukup panjang dan jelas identik antar portal.' },
        },
      }),
    ).toEqual([]);
  });

  it('mengizinkan kanonis yang sudah tayang dipakai lagi di portal lain', () => {
    const issues = findCrossSiteDuplicates({
      ...canonical,
      existing: [{ siteId: 'old', customTitle: 'Judul Kanonik', customDescription: null }],
      requestedSiteIds: ['new'],
      overrides: {},
    });
    expect(issues).toEqual([]);
  });
});
