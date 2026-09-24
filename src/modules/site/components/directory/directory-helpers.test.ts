import { describe, expect, it } from 'vitest';

import {
  accentForHostname,
  cityOf,
  DIRECTORY_ACCENTS,
  familyOf,
  filterPartners,
  filterSites,
  groupPartners,
  groupRegionalByCity,
  parentHostname,
  splitSites,
  splitWordmark,
} from '@/modules/site/components/directory/directory-helpers';
import type { NetworkSiteRow, PartnerRow } from '@/modules/content/site-content';

const SITES: readonly NetworkSiteRow[] = Object.freeze([
  { hostname: 'fakta01.my.id', siteName: 'Fakta01', description: 'Investigasi nasional', tagline: 'Fakta teruji', isRegional: false },
  { hostname: 'wonosobo.fakta01.my.id', siteName: 'Fakta01 Wonosobo', description: 'Kabar daerah', tagline: null, isRegional: true },
]);

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
});

describe('splitSites', () => {
  it('memisahkan portal utama dan edisi daerah', () => {
    const split = splitSites(SITES);
    expect(split.main.map((site) => site.hostname)).toEqual(['fakta01.my.id']);
    expect(split.regional.map((site) => site.hostname)).toEqual(['wonosobo.fakta01.my.id']);
  });
});

describe('filterSites', () => {
  it('mencocokkan nama, hostname, dan tagline tanpa memperhatikan kapital', () => {
    expect(filterSites(SITES, 'WONOSOBO', 'all').map((site) => site.hostname)).toEqual(['wonosobo.fakta01.my.id']);
    expect(filterSites(SITES, 'fakta01.my.id', 'main').map((site) => site.hostname)).toEqual(['fakta01.my.id']);
    expect(filterSites(SITES, '', 'regional').map((site) => site.hostname)).toEqual(['wonosobo.fakta01.my.id']);
  });
});

describe('cityOf', () => {
  it('mengambil kota dari label pertama hostname regional', () => {
    expect(cityOf('wonosobo.fakta01.my.id')).toBe('Wonosobo');
    expect(cityOf('fakta01.my.id')).toBe('Fakta01');
  });
});

describe('parentHostname', () => {
  it('mengupas label kota dari hostname regional', () => {
    expect(parentHostname('wonosobo.fakta01.my.id')).toBe('fakta01.my.id');
    expect(parentHostname('fakta01.my.id')).toBe('fakta01.my.id');
  });
});

describe('groupRegionalByCity', () => {
  it('mengelompokkan edisi daerah per kota sesuai urutan kemunculan', () => {
    const regional: readonly NetworkSiteRow[] = Object.freeze([
      { hostname: 'wonosobo.fakta01.my.id', siteName: 'Fakta01 Wonosobo', description: 'Kabar daerah', tagline: null, isRegional: true },
      { hostname: 'wonosobo.jurnalism.web.id', siteName: 'Jurnalism Wonosobo', description: 'Bisnis daerah', tagline: null, isRegional: true },
    ]);
    const groups = groupRegionalByCity(regional);
    expect(groups.map((group) => group.city)).toEqual(['Wonosobo']);
    expect(groups[0]?.items).toHaveLength(2);
    expect(groupRegionalByCity([])).toEqual([]);
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
    expect(familyOf('Yayasan Komunitas')).toBe('LAINNYA');
  });
});

describe('groupPartners', () => {
  it('mengelompokkan keluarga dengan urutan tetap', () => {
    const groups = groupPartners(PARTNERS);
    expect(groups.map((group) => group.family)).toEqual(['LAPAS', 'RUTAN', 'BAPAS']);
    expect(groups[0]?.items).toHaveLength(1);
  });
});

describe('filterPartners', () => {
  it('menyaring lewat query dan keluarga', () => {
    expect(filterPartners(PARTNERS, 'semarang', 'SEMUA')).toHaveLength(2);
    expect(filterPartners(PARTNERS, '', 'RUTAN').map((partner) => partner.slug)).toEqual(['rutan-kelas-ii-b-demak']);
  });
});
