// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearAutosaveReference,
  readAutosaveReference,
  writeAutosaveReference,
} from '@/modules/dashboard/components/editorial/autosave-reference';

afterEach(() => {
  window.localStorage.clear();
});

const REFERENCE = { id: 'art-1', version: 3, slug: 'petik-hasil-pembinaan' };

describe('rujukan autosave', () => {
  it('menyimpan lalu membaca kembali rujukan milik satu tenant', () => {
    expect(writeAutosaveReference('org-1', REFERENCE)).toBe(true);
    expect(readAutosaveReference('org-1')).toEqual(REFERENCE);
  });

  it('tidak menulis rujukan milik tenant lain', () => {
    writeAutosaveReference('org-1', REFERENCE);
    expect(readAutosaveReference('org-2')).toBeNull();
  });

  it('menghapus rujukan sehingga artikel berikutnya tidak memperbarui draf lama', () => {
    writeAutosaveReference('org-1', REFERENCE);
    clearAutosaveReference('org-1');
    expect(readAutosaveReference('org-1')).toBeNull();
  });

  it('menolak simpanan tanpa id, bukan mengembalikan rujukan palsu', () => {
    window.localStorage.setItem('indicate:article-autosave-ref:org-1', JSON.stringify({ version: 2 }));
    expect(readAutosaveReference('org-1')).toBeNull();
  });

  it('melewati organizations kosong agar tidak memakai satu kunci bersama', () => {
    expect(writeAutosaveReference('', REFERENCE)).toBe(false);
    expect(readAutosaveReference('')).toBeNull();
  });

  it('memberikan versi 1 bila versi tersimpan bukan angka', () => {
    window.localStorage.setItem('indicate:article-autosave-ref:org-1', JSON.stringify({ id: 'art-9', version: 'tiga' }));
    expect(readAutosaveReference('org-1')).toEqual({ id: 'art-9', version: 1, slug: '' });
  });

  it('mengembalikan null untuk simpanan rusak, bukan melempar', () => {
    window.localStorage.setItem('indicate:article-autosave-ref:org-1', '{bukan json');
    expect(readAutosaveReference('org-1')).toBeNull();
  });
});
