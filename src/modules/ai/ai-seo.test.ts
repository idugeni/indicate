import { describe, expect, it } from 'vitest';

import { parseSeoSuggestion, suggestSeo } from '@/modules/ai/ai-seo';

describe('parseSeoSuggestion', () => {
  it('mengurai JSON saran SEO beserta slug', () => {
    const raw = JSON.stringify({ titles: ['Banjir Surut di Wonosobo', 'Warga Kembali Pascabanjir', 'BPBD Salurkan Bantuan'], meta_description: 'Banjir di Wonosobo surut, warga kembali dan BPBD menyalurkan bantuan.', slug: 'Banjir Surut Wonosobo', excerpt: 'Air surut, warga kembali.' });
    const suggestion = parseSeoSuggestion(raw);
    expect(suggestion?.titles).toHaveLength(3);
    expect(suggestion?.slug).toBe('banjir-surut-wonosobo');
    expect(suggestion?.metaDescription.length).toBeLessThanOrEqual(160);
  });

  it('mengurai JSON berpagar kode dan memotong maksimal 3 judul', () => {
    const raw = '```json\n{"titles":["a","b","c","d"],"meta_description":"Deskripsi.","slug":"slug-contoh","excerpt":"Kutipan."}\n```';
    expect(parseSeoSuggestion(raw)?.titles).toEqual(['a', 'b', 'c']);
  });

  it('memotong deskripsi meta maksimal 160 karakter dan slug dari judul bila kosong', () => {
    const raw = JSON.stringify({ titles: ['Judul Utama Berita Hari Ini'], meta_description: 'x'.repeat(300), slug: '', excerpt: 'Kutipan.' });
    const suggestion = parseSeoSuggestion(raw);
    expect(suggestion?.metaDescription).toHaveLength(160);
    expect(suggestion?.slug).toBe('judul-utama-berita-hari-ini');
  });

  it('mengembalikan null untuk JSON rusak atau tanpa judul', () => {
    expect(parseSeoSuggestion('bukan json')).toBeNull();
    expect(parseSeoSuggestion('{"titles":[],"meta_description":"x"}')).toBeNull();
    expect(parseSeoSuggestion('{"meta_description":"tanpa judul"}')).toBeNull();
  });
});

describe('suggestSeo fallback sibuk', () => {
  it('menolak input kosong tanpa memanggil model', async () => {
    const result = await suggestSeo({ title: '', body: '' });
    expect(result.ok).toBe(false);
  });

  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const result = await suggestSeo({ title: 'Banjir di Wonosobo', body: 'Air mulai surut.' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });
});
