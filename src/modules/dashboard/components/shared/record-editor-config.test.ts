import { describe, expect, it } from 'vitest';

import {
  buildUpdatePayload,
  getEditorConfig,
  initialFieldValue,
  resolveFieldOptions,
  ROLE_PERMISSION_OPTIONS,
} from '@/modules/dashboard/components/shared/record-editor-config';
import type { EditorField } from '@/modules/dashboard/components/shared/record-editor-config';

describe('getEditorConfig', () => {
  it('menemukan konfigurasi tiap koleksi yang didukung', () => {
    expect(getEditorConfig('domains')?.updateAction).toBe('domain.update');
    expect(getEditorConfig('regions')?.updateAction).toBe('region.update');
    expect(getEditorConfig('sites')?.updateAction).toBe('site.update');
    expect(getEditorConfig('categories')?.updateAction).toBe('category.update');
    expect(getEditorConfig('authors')?.updateAction).toBe('author.update');
    expect(getEditorConfig('publishers')?.updateAction).toBe('publisher.update');
    expect(getEditorConfig('affiliations')?.updateAction).toBe('affiliation.update');
    expect(getEditorConfig('articles')?.updateAction).toBe('article.update');
    expect(getEditorConfig('roles')?.updateAction).toBe('role.update');
    expect(getEditorConfig('memberships')?.updateAction).toBe('membership.update');
  });

  it('memberi judul dan field wajib pada konfigurasi', () => {
    const config = getEditorConfig('articles');
    expect(config?.title).toBe('Ubah naskah');
    expect(config?.fields.length).toBeGreaterThan(0);
    for (const field of config?.fields ?? []) {
      expect(field.key.length).toBeGreaterThan(0);
      expect(field.label.length).toBeGreaterThan(0);
    }
  });

  it('mendaftarkan transisi arsip dan pulihkan untuk artikel', () => {
    const transisi = getEditorConfig('articles')?.transitions ?? [];
    expect(transisi.map((item) => item.action)).toEqual(['article.archive', 'article.restore']);
  });

  it('mengembalikan undefined untuk koleksi tak dikenal', () => {
    expect(getEditorConfig('siteSettings')).toBe(undefined);
    expect(getEditorConfig('khayalan')).toBe(undefined);
  });
});

describe('ROLE_PERMISSION_OPTIONS', () => {
  it('memetakan tiap nama permission tanpa duplikat', () => {
    expect(ROLE_PERMISSION_OPTIONS.length).toBeGreaterThan(0);
    const nilai = ROLE_PERMISSION_OPTIONS.map((option) => option.value);
    expect(new Set(nilai).size).toBe(nilai.length);
    for (const option of ROLE_PERMISSION_OPTIONS) {
      expect(option.value).toBe(option.label);
    }
    expect(nilai).toContain('dashboard.read');
    expect(nilai).toContain('media.manage');
    expect(nilai).toContain('api_key.read');
  });
});

describe('resolveFieldOptions', () => {
  it('mengembalikan opsi statis apa adanya', () => {
    const field = getEditorConfig('regions')?.fields.find((item) => item.key === 'status');
    expect(field).toBeDefined();
    if (field === undefined) return;
    expect(resolveFieldOptions(field, {})).toBe(field.options);
  });

  it('memetakan baris lookup menjadi opsi relasi', () => {
    const field: EditorField = { key: 'regionId', label: 'Wilayah', kind: 'select', optionSource: 'regions' };
    expect(
      resolveFieldOptions(field, { regions: [{ id: 'r1', name: 'Wonosobo' }] }),
    ).toEqual([{ value: 'r1', label: 'Wonosobo' }]);
  });

  it('memakai nama tampilan untuk penulis dan hostname untuk domain', () => {
    const penulis: EditorField = { key: 'authorId', label: 'Penulis', kind: 'select', optionSource: 'authors' };
    expect(
      resolveFieldOptions(penulis, { authors: [{ id: 'a1', displayName: 'Nano' }] }),
    ).toEqual([{ value: 'a1', label: 'Nano' }]);
    const domain: EditorField = { key: 'domainId', label: 'Domain', kind: 'select', optionSource: 'domains' };
    expect(
      resolveFieldOptions(domain, { domains: [{ id: 'd1', normalizedHostname: 'portal.example' }] }),
    ).toEqual([{ value: 'd1', label: 'portal.example' }]);
  });

  it('memberi label cadangan untuk baris tanpa nama', () => {
    const field: EditorField = { key: 'regionId', label: 'Wilayah', kind: 'select', optionSource: 'regions' };
    expect(resolveFieldOptions(field, { regions: [{}] })).toEqual([{ value: '', label: 'tanpa-nama' }]);
  });

  it('mengembalikan daftar kosong tanpa sumber opsi atau lookup', () => {
    const polos: EditorField = { key: 'name', label: 'Nama', kind: 'text' };
    expect(resolveFieldOptions(polos, {})).toEqual([]);
    const relasi: EditorField = { key: 'roleId', label: 'Peran', kind: 'select', optionSource: 'roles' };
    expect(resolveFieldOptions(relasi, {})).toEqual([]);
  });
});

describe('initialFieldValue', () => {
  it('mengubah teks, angka, dan kosong menjadi string', () => {
    const teks: EditorField = { key: 'name', label: 'Nama', kind: 'text' };
    expect(initialFieldValue(teks, { name: 'Wonosobo' })).toBe('Wonosobo');
    expect(initialFieldValue(teks, { name: 42 })).toBe('42');
    expect(initialFieldValue(teks, {})).toBe('');
    expect(initialFieldValue(teks, { name: null })).toBe('');
  });

  it('membaca checkbox hanya dari boolean true', () => {
    const centang: EditorField = { key: 'active', label: 'Aktif', kind: 'checkbox' };
    expect(initialFieldValue(centang, { active: true })).toBe(true);
    expect(initialFieldValue(centang, { active: 'ya' })).toBe(false);
    expect(initialFieldValue(centang, {})).toBe(false);
  });

  it('menyaring checklist dan menggabung array per baris', () => {
    const daftar: EditorField = { key: 'permissions', label: 'Hak akses', kind: 'checklist' };
    expect(initialFieldValue(daftar, { permissions: ['a.read', 7, 'b.read'] })).toEqual(['a.read', 'b.read']);
    expect(initialFieldValue(daftar, {})).toEqual([]);
    const area: EditorField = { key: 'claimScopes', label: 'Cakupan', kind: 'textarea' };
    expect(initialFieldValue(area, { claimScopes: ['satu', 'dua'] })).toBe('satu\ndua');
  });

  it('membaca field kontak bertitik dari objek contacts', () => {
    const kontak: EditorField = { key: 'contacts.facebook', label: 'Facebook', kind: 'text' };
    expect(initialFieldValue(kontak, { contacts: { facebook: 'https://facebook.com/x' } })).toBe(
      'https://facebook.com/x',
    );
    expect(initialFieldValue(kontak, {})).toBe('');
    expect(initialFieldValue(kontak, { contacts: null })).toBe('');
  });
});

describe('buildUpdatePayload', () => {
  it('menormalkan hostname domain menjadi huruf kecil', () => {
    expect(
      buildUpdatePayload('domains', { id: 'd1', version: 2 }, { normalizedHostname: '  Portal.Example ', status: 'active' }),
    ).toEqual({ id: 'd1', expectedVersion: 2, normalizedHostname: 'portal.example', status: 'active' });
  });

  it('mengirim null untuk relasi opsional yang dikosongkan', () => {
    const muatan = buildUpdatePayload(
      'sites',
      { id: 's1', version: 1 },
      { domainId: 'd1', regionId: '', normalizedHostname: 'Portal.Example', status: 'active' },
    );
    expect(muatan).toMatchObject({ domainId: 'd1', regionId: null, normalizedHostname: 'portal.example' });
  });

  it('menggabungkan kontak penerbit dan men-null-kan bukti kosong', () => {
    const muatan = buildUpdatePayload(
      'publishers',
      { id: 'p1', version: 4, contacts: { facebook: 'https://facebook.com/lama', x: 'https://x.com/tetap' } },
      {
        name: 'Penerbit',
        type: 'company',
        attributionLabel: 'Atribusi',
        evidenceReference: '',
        'contacts.facebook': '',
        'contacts.x': 'https://x.com/tetap',
        'contacts.instagram': 'https://instagram.com/baru',
      },
    );
    expect(muatan.contacts).toEqual({ x: 'https://x.com/tetap', instagram: 'https://instagram.com/baru' });
    expect(muatan.evidenceReference).toBe(null);
  });

  it('memecah cakupan klaim afiliasi per baris', () => {
    const muatan = buildUpdatePayload(
      'affiliations',
      { id: 'f1', version: 1 },
      { institutionName: 'Instansi', claimScopes: 'satu\n\n dua \n', evidenceReference: 'ref-1', active: true },
    );
    expect(muatan).toMatchObject({ claimScopes: ['satu', 'dua'], active: true });
  });

  it('menyusun muatan artikel, peran, dan keanggotaan', () => {
    const artikel = buildUpdatePayload(
      'articles',
      { id: 'a1', version: 3 },
      {
        regionId: 'r1',
        publisherId: '',
        categoryId: 'c1',
        authorId: '',
        slug: 'Judul-Utama',
        title: 'Judul Utama',
        body: ' Isi. ',
        source: 'Redaksi',
        status: 'draft',
      },
    );
    expect(artikel).toMatchObject({ publisherId: null, authorId: null, slug: 'judul-utama', title: 'Judul Utama' });
    const peran = buildUpdatePayload(
      'roles',
      { id: 'r1', version: 1 },
      { name: 'Editor', tier: 'user', active: false, permissions: 'a.read\nb.read\n' },
    );
    expect(peran).toMatchObject({ active: false, permissions: ['a.read', 'b.read'] });
    expect(
      buildUpdatePayload('memberships', { userId: 'u1', version: 5 }, { roleId: 'r1', status: 'active' }),
    ).toEqual({ userId: 'u1', roleId: 'r1', status: 'active', expectedVersion: 5 });
  });

  it('mengembalikan id dan versi untuk koleksi tak dikenal', () => {
    expect(buildUpdatePayload('siteSettings', { id: 'x', version: 2 }, {})).toEqual({ id: 'x', expectedVersion: 2 });
  });
});
