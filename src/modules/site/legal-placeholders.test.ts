import { describe, expect, it } from 'vitest';

import { interpolateLegalText, resolveLegalSections } from '@/modules/site/legal-placeholders';

const variables = { domain: 'portal.example', siteName: 'Portal Contoh' };

describe('interpolateLegalText', () => {
  it('mengganti token domain dan nama situs', () => {
    expect(interpolateLegalText('Kunjungi {domain} milik {siteName}.', variables)).toBe(
      'Kunjungi portal.example milik Portal Contoh.',
    );
  });

  it('mengganti semua kemunculan token yang berulang', () => {
    expect(interpolateLegalText('{domain} dan {domain}', variables)).toBe('portal.example dan portal.example');
  });

  it('membiarkan teks tanpa token apa adanya', () => {
    expect(interpolateLegalText('Teks polos tanpa token.', variables)).toBe('Teks polos tanpa token.');
  });

  it('menerima variabel kosong sebagai pengganti kosong', () => {
    expect(interpolateLegalText('Kunjungi {domain}.', { domain: '', siteName: '' })).toBe('Kunjungi .');
  });
});

describe('resolveLegalSections', () => {
  it('menginterpolasi heading dan body setiap bagian', () => {
    const result = resolveLegalSections(
      [{ heading: 'Aturan {siteName}', body: 'Berlaku di {domain} untuk {siteName}.' }],
      variables,
    );
    expect(result).toEqual([{ heading: 'Aturan Portal Contoh', body: 'Berlaku di portal.example untuk Portal Contoh.' }]);
  });

  it('mengembalikan salinan tanpa mengubah master', () => {
    const master = [{ heading: 'Aturan {siteName}', body: 'Berlaku di {domain}.' }];
    const result = resolveLegalSections(master, variables);
    expect(master[0]).toEqual({ heading: 'Aturan {siteName}', body: 'Berlaku di {domain}.' });
    expect(result[0]).not.toBe(master[0]);
  });

  it('mengembalikan daftar kosong untuk masukan kosong', () => {
    expect(resolveLegalSections([], variables)).toEqual([]);
  });
});
