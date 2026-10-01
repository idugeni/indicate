import { describe, expect, it } from 'vitest';

import { parseExcerptSuggestion, parseMetaDescription, parseSeoBundle, parseTitleSuggestions, suggestExcerpt, suggestMetaDescription, suggestSeoBundle, suggestTitles } from '@/modules/ai/ai-seo';

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
    await expect(suggestSeoBundle({ title: '', body: '' })).resolves.toMatchObject({ ok: false });
  });

  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const input = { title: 'Banjir di Wonosobo', body: 'Air mulai surut.' };
    const [titles, meta, excerpt, bundle] = await Promise.all([
      suggestTitles(input),
      suggestMetaDescription(input),
      suggestExcerpt(input),
      suggestSeoBundle(input),
    ]);
    for (const result of [titles, meta, excerpt, bundle]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('sibuk');
    }
  });
});

describe('parseSeoBundle', () => {
  it('mengurai paket lengkap dalam satu respons', () => {
    const raw = JSON.stringify({ titles: ['a', 'b', 'c'], excerpt: 'Air surut.', meta_description: 'Deskripsi.' });
    expect(parseSeoBundle(raw)).toEqual({ titles: ['a', 'b', 'c'], excerpt: 'Air surut.', metaDescription: 'Deskripsi.' });
  });

  it('mengembalikan null bila ada bagian hilang', () => {
    expect(parseSeoBundle(JSON.stringify({ titles: ['a'], excerpt: 'x' }))).toBeNull();
    expect(parseSeoBundle(JSON.stringify({ titles: ['a'], excerpt: '', meta_description: 'd' }))).toBeNull();
    expect(parseSeoBundle('bukan json')).toBeNull();
  });

  it('strict melempar Error deskriptif untuk bentuk liar', () => {
    expect(() => parseSeoBundle('bukan json', { strict: true })).toThrow(/JSON objek/);
    expect(() => parseSeoBundle(JSON.stringify({ excerpt: 'x', meta_description: 'd' }), { strict: true })).toThrow(/titles/);
    expect(() => parseSeoBundle(JSON.stringify({ titles: ['a'], excerpt: 'x' }), { strict: true })).toThrow(/meta_description/);
    expect(() => parseSeoBundle(JSON.stringify({ titles: ['a'], meta_description: 'd' }), { strict: true })).toThrow(/excerpt/);
  });
});

describe('parser lama strict', () => {
  it('melempar Error deskriptif dan non-strict tetap null', () => {
    expect(() => parseTitleSuggestions('bukan json', { strict: true })).toThrow(/Judul SEO/);
    expect(() => parseMetaDescription(JSON.stringify({}), { strict: true })).toThrow(/meta_description/);
    expect(() => parseExcerptSuggestion(JSON.stringify({}), { strict: true })).toThrow(/excerpt/);
    expect(parseTitleSuggestions('bukan json')).toBeNull();
    expect(parseMetaDescription(JSON.stringify({}))).toBeNull();
  });
});
