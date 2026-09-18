import { describe, expect, it } from 'vitest';

import { suggestAttributionLabel } from '@/modules/dashboard/components/editorial/publisher-attribution';

describe('suggestAttributionLabel', () => {
  it('memangkas kelas dan sub-huruf institusi kedinasan', () => {
    expect(suggestAttributionLabel('RUTAN KELAS II B WONOSOBO', 'government_institution')).toBe('Humas Rutan Wonosobo');
    expect(suggestAttributionLabel('LAPAS KELAS I SEMARANG', 'government_institution')).toBe('Humas Lapas Semarang');
  });

  it('tidak memakan huruf awal kota tanpa sub-huruf', () => {
    expect(suggestAttributionLabel('LPKA KELAS I KUTOARJO', 'government_institution')).toBe('Humas LPKA Kutoarjo');
    expect(suggestAttributionLabel('BAPAS KELAS II KLATEN', 'government_institution')).toBe('Humas Bapas Klaten');
  });

  it('mempertahankan jenis satuan kerja', () => {
    expect(suggestAttributionLabel('LAPAS KHUSUS KELAS II A KARANGANYAR NUSAKAMBANGAN', 'government_institution')).toBe(
      'Humas Lapas Khusus Karanganyar Nusakambangan',
    );
    expect(suggestAttributionLabel('LAPAS NARKOTIKA KELAS II A NUSAKAMBANGAN', 'government_institution')).toBe(
      'Humas Lapas Narkotika Nusakambangan',
    );
  });

  it('memakai Title Case apa adanya untuk non-kedinasan', () => {
    expect(suggestAttributionLabel('Radar Jawa Tengah Sentral', 'independent_publisher')).toBe('Radar Jawa Tengah Sentral');
    expect(suggestAttributionLabel('FAKTA01', 'independent_publisher')).toBe('Fakta01');
  });

  it('mengembalikan string kosong untuk nama kosong', () => {
    expect(suggestAttributionLabel('   ', 'government_institution')).toBe('');
  });
});
