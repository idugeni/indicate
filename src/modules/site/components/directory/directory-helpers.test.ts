import { describe, expect, it } from 'vitest';

import {
  accentEdgeStyle,
  accentForHostname,
  areaOf,
  ALL_PARTNER_FAMILIES,
  buildDirectoryJsonLd,
  capDirectoryResults,
  DIRECTORY_ACCENTS,
  DIRECTORY_PATTERNS,
  DIRECTORY_RESULT_LIMIT,
  familyOf,
  filterPartners,
  filterSites,
  groupPartners,
  groupRegionalByCity,
  patternForHostname,
  splitSites,
  splitWordmark,
  WORDMARK_PATTERNS,
  wordmarkColors,
  wordmarkPatternForHostname,
} from '@/modules/site/components/directory/directory-helpers';
import type { DirectoryEntry, NetworkSiteRow, PartnerRow } from '@/modules/content/site-content';

const SITES: readonly NetworkSiteRow[] = Object.freeze([
  { hostname: 'fakta01.my.id', parentHostname: null, siteLevel: 'apex', siteName: 'Fakta01', description: 'Investigasi nasional', tagline: 'Fakta teruji', areaName: null, parentAreaName: null },
  { hostname: 'jawa-tengah.fakta01.my.id', parentHostname: 'fakta01.my.id', siteLevel: 'region', siteName: 'Fakta01 Jawa Tengah', description: 'Kabar provinsi', tagline: null, areaName: 'Jawa Tengah', parentAreaName: null },
  { hostname: 'wonosobo.fakta01.my.id', parentHostname: 'jawa-tengah.fakta01.my.id', siteLevel: 'city', siteName: 'Fakta01 Wonosobo', description: 'Kabar daerah', tagline: null, areaName: 'Wonosobo', parentAreaName: 'Jawa Tengah' },
]);

/** Trimmed projection the page ships to the browser: regional rows carry no copy. */
const DIRECTORY: readonly DirectoryEntry[] = Object.freeze(SITES.map((site) => Object.freeze({
  hostname: site.hostname,
  siteName: site.siteName,
  siteLevel: site.siteLevel,
  areaName: site.areaName,
  tagline: site.siteLevel === 'apex' ? site.tagline : null,
  description: site.siteLevel === 'apex' ? site.description : null,
})));

const PARTNERS: readonly PartnerRow[] = Object.freeze([
  { name: 'LAPAS KELAS I SEMARANG', slug: 'lapas-kelas-i-semarang' },
  { name: 'RUTAN KELAS II B DEMAK', slug: 'rutan-kelas-ii-b-demak' },
  { name: 'BAPAS KELAS I SEMARANG', slug: 'bapas-kelas-i-semarang' },
]);

describe('accentForHostname', () => {
  it('memilih aksen deterministik dari palet direktori', () => {
    expect(DIRECTORY_ACCENTS).toContain(accentForHostname('fakta01.my.id'));
    expect(accentForHostname('fakta01.my.id')).toBe(accentForHostname('fakta01.my.id'));
  });

  it('memakai palet dua belas warna', () => {
    expect(DIRECTORY_ACCENTS).toHaveLength(12);
  });
});

describe('patternForHostname', () => {
  it('memilih pola deterministik dari pola direktori', () => {
    expect(DIRECTORY_PATTERNS).toContain(patternForHostname('fakta01.my.id'));
    expect(patternForHostname('fakta01.my.id')).toBe(patternForHostname('fakta01.my.id'));
  });

  it('memakai empat pola tepi aksen', () => {
    expect(DIRECTORY_PATTERNS).toEqual(['solid', 'gradient', 'stripes', 'duotone']);
  });
});

describe('accentEdgeStyle', () => {
  it('memetakan setiap pola ke gaya tepi berbeda', () => {
    const styles = DIRECTORY_PATTERNS.map((pattern) => accentEdgeStyle('#b88d3a', pattern));
    expect(new Set(styles.map((style) => JSON.stringify(style))).size).toBe(DIRECTORY_PATTERNS.length);
  });

  it('jatuh ke solid untuk pola tak dikenal', () => {
    expect(accentEdgeStyle('#b88d3a', 'unknown')).toEqual({ backgroundColor: '#b88d3a' });
  });
});

describe('wordmarkPatternForHostname', () => {
  it('memilih skema pewarnaan deterministik dari lima pola', () => {
    expect(WORDMARK_PATTERNS).toContain(wordmarkPatternForHostname('fakta01.my.id'));
    expect(wordmarkPatternForHostname('fakta01.my.id')).toBe(wordmarkPatternForHostname('fakta01.my.id'));
  });

  it('memakai lima skema pewarnaan kata', () => {
    expect(WORDMARK_PATTERNS).toEqual(['head', 'tail', 'full', 'bookend', 'alternate']);
  });
});

describe('wordmarkColors', () => {
  it('mengembalikan satu warna per token', () => {
    expect(wordmarkColors(3, '#b88d3a', 'head')).toHaveLength(3);
    expect(wordmarkColors(1, '#b88d3a', 'full')).toEqual(['#b88d3a']);
  });

  it('menempatkan aksen sesuai skema', () => {
    expect(wordmarkColors(2, '#b88d3a', 'head')[0]).toBe('#b88d3a');
    expect(wordmarkColors(2, '#b88d3a', 'tail')[1]).toBe('#b88d3a');
    expect(wordmarkColors(2, '#b88d3a', 'full')).toEqual(['#b88d3a', '#b88d3a']);
    expect(wordmarkColors(3, '#b88d3a', 'bookend')).toEqual(['#b88d3a', '#5f6b7a', '#b88d3a']);
    expect(wordmarkColors(3, '#b88d3a', 'alternate')[1]).toBe('#1a2430');
  });

  it('jatuh ke skema head untuk pola tak dikenal', () => {
    expect(wordmarkColors(2, '#b88d3a', 'unknown')[0]).toBe('#b88d3a');
  });
});

describe('splitSites', () => {
  it('memisahkan portal utama dan edisi daerah', () => {
    const split = splitSites(SITES);
    expect(split.main.map((site) => site.hostname)).toEqual(['fakta01.my.id']);
    expect(split.regional.map((site) => site.hostname)).toEqual(['jawa-tengah.fakta01.my.id', 'wonosobo.fakta01.my.id']);
  });
});

describe('filterSites', () => {
  it('mencocokkan nama, hostname, dan tagline tanpa memperhatikan kapital', () => {
    expect(filterSites(SITES, 'WONOSOBO', 'all').map((site) => site.hostname)).toEqual(['wonosobo.fakta01.my.id']);
    expect(filterSites(SITES, 'fakta01.my.id', 'main').map((site) => site.hostname)).toEqual(['fakta01.my.id']);
    expect(filterSites(SITES, 'wonosobo', 'all').map((site) => site.hostname)).toEqual(['wonosobo.fakta01.my.id']);
    expect(filterSites(SITES, 'jawa tengah', 'all').map((site) => site.hostname)).toEqual(['jawa-tengah.fakta01.my.id']);
    expect(filterSites(SITES, '', 'regional').map((site) => site.hostname)).toEqual(['jawa-tengah.fakta01.my.id', 'wonosobo.fakta01.my.id']);
  });

  it('tetap mencocokkan portal turunan dari proyeksi ringan tanpa copy', () => {
    expect(filterSites(DIRECTORY, 'wonosobo', 'all').map((site) => site.hostname)).toEqual(['wonosobo.fakta01.my.id']);
    expect(filterSites(DIRECTORY, 'kabar daerah', 'all')).toEqual([]);
    expect(DIRECTORY.filter((site) => site.siteLevel !== 'apex').every((site) => site.description === null)).toBe(true);
  });
});

describe('capDirectoryResults', () => {
  it('memotong hasil dan melaporkan sisa secara jujur', () => {
    const many = Array.from({ length: DIRECTORY_RESULT_LIMIT + 7 }, (_unused, index) => ({
      hostname: `semarang${index}.fakta01.my.id`,
      siteName: `Fakta01 Semarang ${index}`,
      siteLevel: 'city' as const,
      areaName: 'Semarang',
      tagline: null,
      description: null,
    }));
    const capped = capDirectoryResults(many);
    expect(capped.shown).toHaveLength(DIRECTORY_RESULT_LIMIT);
    expect(capped.hidden).toBe(7);
  });

  it('melewatkan seluruh hasil yang sudah muat', () => {
    expect(capDirectoryResults(DIRECTORY)).toEqual({ shown: DIRECTORY, hidden: 0 });
  });
});

describe('buildDirectoryJsonLd', () => {
  it('mencantumkan portal utama dan ledger kota, bukan setiap portal turunan', () => {
    const payload = buildDirectoryJsonLd(DIRECTORY, 'https://indicate.website/network');
    const serialized = JSON.stringify(payload);
    expect(payload['@type']).toBe('CollectionPage');
    expect(serialized).toContain('fakta01.my.id');
    expect(serialized).toContain('Wonosobo');
    expect(serialized).not.toContain('Jawa Tengah');
    expect(payload.mainEntity).toMatchObject({ '@type': 'ItemList', numberOfItems: 1 });
    expect(payload.hasPart).toMatchObject({ '@type': 'ItemList', numberOfItems: 1 });
  });

  it('tidak membocorkan URL portal turunan yang tidakdirender', () => {
    const serialized = JSON.stringify(buildDirectoryJsonLd(DIRECTORY, 'https://indicate.website/network'));
    expect(serialized).not.toContain('https://wonosobo.fakta01.my.id');
  });
});

describe('areaOf', () => {
  it('mengambil nama wilayah dari hierarchy, bukan dari hostname', () => {
    expect(areaOf(SITES[2]!)).toBe('Wonosobo');
    expect(areaOf(SITES[1]!)).toBe('Jawa Tengah');
    expect(areaOf(SITES[0]!)).toBe('Fakta01');
  });
});

describe('groupRegionalByCity', () => {
  it('mengelompokkan edisi kota per kota sesuai urutan kemunculan', () => {
    const regional: readonly NetworkSiteRow[] = Object.freeze([
      { hostname: 'wonosobo.fakta01.my.id', parentHostname: 'fakta01.my.id', siteLevel: 'city', siteName: 'Fakta01 Wonosobo', description: 'Kabar daerah', tagline: null, areaName: 'Wonosobo', parentAreaName: 'Jawa Tengah' },
      { hostname: 'wonosobo.jurnalism.web.id', parentHostname: 'jurnalism.web.id', siteLevel: 'city', siteName: 'Jurnalism Wonosobo', description: 'Bisnis daerah', tagline: null, areaName: 'Wonosobo', parentAreaName: 'Jawa Tengah' },
    ]);
    const groups = groupRegionalByCity(regional);
    expect(groups.map((group) => group.city)).toEqual(['Wonosobo']);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groupRegionalByCity([])).toEqual([]);
  });

  it('tidak menghitung edisi region sebagai kota', () => {
    const groups = groupRegionalByCity([
      { hostname: 'jawa-tengah.fakta01.my.id', siteName: 'Fakta01 Jawa Tengah', siteLevel: 'region', areaName: 'Jawa Tengah', tagline: null, description: null },
      { hostname: 'wonosobo.fakta01.my.id', siteName: 'Fakta01 Wonosobo', siteLevel: 'city', areaName: 'Wonosobo', tagline: null, description: null },
    ]);
    expect(groups.map((group) => group.city)).toEqual(['Wonosobo']);
  });
});
describe('splitWordmark', () => {
  it('memecah nama CamelCase plus angka menjadi kata', () => {
    expect(splitWordmark('SuaraFakta24')).toEqual(['Suara', 'Fakta', '24']);
    expect(splitWordmark('Kabar360')).toEqual(['Kabar', '360']);
    expect(splitWordmark('Bilik7Wacana')).toEqual(['Bilik', '7', 'Wacana']);
    expect(splitWordmark('PenaMerdeka')).toEqual(['Pena', 'Merdeka']);
    expect(splitWordmark('Jurnalism')).toEqual(['Jurnalism']);
    expect(splitWordmark('WartaKini7')).toEqual(['Warta', 'Kini', '7']);
  });
});

describe('familyOf', () => {
  it('menurunkan keluarga institusi dari awalan nama', () => {
    expect(familyOf('RUTAN KELAS II B DEMAK')).toBe('RUTAN');
    expect(familyOf('LPKA KELAS I KUTOARJO')).toBe('LPKA');
    expect(familyOf('Mitra Contoh')).toBe('MITRA');
  });
});

describe('groupPartners', () => {
  it('mengelompokkan keluarga sesuai urutan kemunculan', () => {
    const groups = groupPartners(PARTNERS);
    expect(groups.map((group) => group.family)).toEqual(['LAPAS', 'RUTAN', 'BAPAS']);
    expect(groups[0]?.items).toHaveLength(1);
  });

  it('menampung keluarga baru tanpa daftar keras', () => {
    const groups = groupPartners([
      ...PARTNERS,
      { name: 'Mitra Contoh', slug: 'mitra-contoh' },
    ]);
    expect(groups.map((group) => group.family)).toContain('MITRA');
  });
});

describe('filterPartners', () => {
  it('menyaring lewat query dan keluarga', () => {
    expect(filterPartners(PARTNERS, 'semarang', ALL_PARTNER_FAMILIES)).toHaveLength(2);
    expect(filterPartners(PARTNERS, '', 'RUTAN').map((partner) => partner.slug)).toEqual(['rutan-kelas-ii-b-demak']);
  });
});
