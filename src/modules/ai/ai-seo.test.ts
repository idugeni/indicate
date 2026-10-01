import { describe, expect, it } from 'vitest';

import { parseExcerptSuggestion, parseMetaDescription, parseTitleSuggestions, suggestExcerpt, suggestMetaDescription, suggestTitles } from '@/modules/ai/ai-seo';

describe('parseTitleSuggestions', () => {
  it('mengurai tiga judul dan memotong kelebihan', () => {
    const raw = JSON.stringify({ titles: ['a', 'b', 'c', 'd'] });
    expect(parseTitleSuggestions(raw)).toEqual(['a', 'b', 'c']);
  });

  it('mengurai JSON berpagar kode dan alias judul', () => {
    expect(parseTitleSuggestions('```json\n{"judul":["x","y"]}\n```')).toEqual(['x', 'y']);
  });

  it('mengembalikan null untuk JSON rusak atau tanpa judul', () => {
    expect(parseTitleSuggestions('bukan json')).toBeNull();
    expect(parseTitleSuggestions('{"titles":[]}')).toBeNull();
  });
});

describe('parseMetaDescription', () => {
  it('mengurai meta_description dan memotong 160 karakter', () => {
    const raw = JSON.stringify({ meta_description: 'x'.repeat(300) });
    expect(parseMetaDescription(raw)).toHaveLength(160);
  });

  it('mendukung alias metaDescription dan menolak kosong', () => {
    expect(parseMetaDescription(JSON.stringify({ metaDescription: 'Deskripsi.' }))).toBe('Deskripsi.');
    expect(parseMetaDescription(JSON.stringify({ meta_description: '' }))).toBeNull();
    expect(parseMetaDescription('bukan json')).toBeNull();
  });
});

describe('parseExcerptSuggestion', () => {
  it('mengurai kutipan maksimal 400 karakter', () => {
    expect(parseExcerptSuggestion(JSON.stringify({ excerpt: 'Air surut.' }))).toBe('Air surut.');
    expect(parseExcerptSuggestion(JSON.stringify({ excerpt: 'x'.repeat(500) }))?.length).toBe(400);
  });

  it('mengembalikan null bila JSON rusak', () => {
    expect(parseExcerptSuggestion('bukan json')).toBeNull();
  });
});

describe('suggest fallback sibuk', () => {
  it('menolak input kosong tanpa memanggil model', async () => {
    await expect(suggestTitles({ title: '', body: '' })).resolves.toMatchObject({ ok: false });
    await expect(suggestMetaDescription({ title: '', body: '' })).resolves.toMatchObject({ ok: false });
    await expect(suggestExcerpt({ title: '', body: '' })).resolves.toMatchObject({ ok: false });
  });

  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const input = { title: 'Banjir di Wonosobo', body: 'Air mulai surut.' };
    const [titles, meta, excerpt] = await Promise.all([
      suggestTitles(input),
      suggestMetaDescription(input),
      suggestExcerpt(input),
    ]);
    for (const result of [titles, meta, excerpt]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('sibuk');
    }
  });
});
