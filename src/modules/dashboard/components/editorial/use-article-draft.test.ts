// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearArticleDraft,
  readArticleDraft,
  writeArticleDraft,
  type ArticleDraft,
} from '@/modules/dashboard/components/editorial/use-article-draft';

const DRAFT: ArticleDraft = {
  version: 1,
  savedAt: '2026-09-29T00:00:00.000Z',
  slug: 'judul-uji',
  slugTouched: true,
  status: 'draft',
  categoryIds: ['c-1'],
  extraCategories: [{ id: 'new:abc', name: 'Olahraga', slug: 'olahraga', status: 'active', version: 1 }],
  publisherId: null,
  authorId: 'a-1',
  provinceId: 'r-1',
  cityId: null,
  titleText: 'Judul Uji',
  descriptionText: 'Inti berita.',
  bodyText: 'Isi berita lengkap.',
  bodyJson: { type: 'doc', content: [] },
  source: 'Rilis Resmi',
  canonicalUrl: '',
  coverUrl: '',
  tags: ['Wonosobo'],
  publishOnSave: true,
};

afterEach(() => {
  window.localStorage.clear();
});

describe('draft artikel di localStorage', () => {
  it('menulis lalu membaca kembali draft milik satu tenant', () => {
    expect(writeArticleDraft('org-1', DRAFT)).toBe(true);
    expect(readArticleDraft('org-1')).toMatchObject({ titleText: 'Judul Uji', bodyText: 'Isi berita lengkap.' });
  });

  it('tidak pernah membocorkan draft antar tenant', () => {
    writeArticleDraft('org-1', DRAFT);
    expect(readArticleDraft('org-2')).toBeNull();
  });

  it('membuang draft versi lama alih-alih menyalinnya dengan bentuk yang salah', () => {
    window.localStorage.setItem('indicate:article-draft:org-1', JSON.stringify({ ...DRAFT, version: 0 }));
    expect(readArticleDraft('org-1')).toBeNull();
  });

  it('membuang draft rusak dan bukan exception', () => {
    window.localStorage.setItem('indicate:article-draft:org-1', '{bukan json');
    expect(readArticleDraft('org-1')).toBeNull();
  });

  it('membuang draft yang kehilangan field inti', () => {
    window.localStorage.setItem('indicate:article-draft:org-1', JSON.stringify({ version: 1, titleText: 42 }));
    expect(readArticleDraft('org-1')).toBeNull();
  });

  it('menghapus draft sehingga form kosong tidak mewarisi isian lama', () => {
    writeArticleDraft('org-1', DRAFT);
    clearArticleDraft('org-1');
    expect(readArticleDraft('org-1')).toBeNull();
  });
});
