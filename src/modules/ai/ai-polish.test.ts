import { describe, expect, it } from 'vitest';

import { classifyArticle, parseClassification, parsePolishedBody, polishBody } from '@/modules/ai/ai-polish';

describe('parsePolishedBody', () => {
  it('mengurai isi dari JSON model', () => {
    expect(parsePolishedBody('{"body":"paragraf satu.\\n\\nparagraf dua."}')).toBe('paragraf satu.\n\nparagraf dua.');
  });

  it('menolak output kosong atau bukan JSON', () => {
    expect(parsePolishedBody('')).toBeNull();
    expect(parsePolishedBody('bukan json')).toBeNull();
    expect(parsePolishedBody('{"body":"   "}')).toBeNull();
  });
});

describe('parseClassification', () => {
  const allowed = ['Nasional', 'Ekonomi', 'Olahraga'];

  it('menerima kategori dari daftar dengan pencocokan case-insensitive', () => {
    expect(parseClassification('{"categories":["ekonomi","Nasional"],"tags":["apbd","wonosobo"]}', allowed)).toEqual({
      categories: ['Ekonomi', 'Nasional'],
      tags: ['apbd', 'wonosobo'],
    });
  });

  it('menerima bentuk kategori tunggal lawas dan membatasi tiga', () => {
    expect(parseClassification('{"category":"olahraga","tags":[]}', allowed)).toEqual({
      categories: ['Olahraga'],
      tags: [],
    });
    expect(
      parseClassification('{"categories":["nasional","ekonomi","olahraga","nasional","asing"],"tags":[]}', allowed),
    ).toEqual({ categories: ['Nasional', 'Ekonomi', 'Olahraga'], tags: [] });
  });

  it('menolak kategori di luar daftar dan menormalkan tag', () => {
    expect(parseClassification('{"categories":["Politik"],"tags":["APBD!!","  ","x"]}', allowed)).toEqual({
      categories: [],
      tags: ['apbd', 'x'],
    });
  });

  it('menolak output bukan JSON', () => {
    expect(parseClassification('rusak', allowed)).toBeNull();
  });
});

describe('validasi polish dan klasifikasi', () => {
  it('menolak isi kosong dan daftar kategori kosong', async () => {
    await expect(polishBody({ title: '', body: '   ' })).resolves.toEqual({
      ok: false,
      error: 'Isi artikel masih kosong.',
    });
    await expect(classifyArticle({ title: '', body: '', categories: ['Nasional'] })).resolves.toEqual({
      ok: false,
      error: 'Judul atau isi diperlukan.',
    });
    await expect(classifyArticle({ title: 'Banjir', body: 'Air.', categories: [] })).resolves.toEqual({
      ok: false,
      error: 'Belum ada kategori untuk dipilih.',
    });
  });
});
