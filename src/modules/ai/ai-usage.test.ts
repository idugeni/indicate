import { describe, expect, it } from 'vitest';

import {
  generateArticleDraft,
  ocCoverCaption,
  ocVisionDraft,
  parseArticleDraft,
  parseCoverCaption,
  parseModerationAnalysis,
  parseTagSuggestion,
  parseVisionDraft,
  scanPrompt,
  stripCodeFence,
  suggestTags,
  truncateInput,
} from '@/modules/ai/ai-usage';

describe('ai-usage parsing', () => {
  it('mengurai draf artikel JSON dengan pagar kode', () => {
    const raw = JSON.stringify({ title: 'Banjir Surut', excerpt: 'Air surut.', content: 'Isi.', slug_suggestion: 'banjir-surut' });
    const draft = parseArticleDraft(raw, 'Topik');
    expect(draft?.title).toBe('Banjir Surut');
    expect(draft?.slug).toBe('banjir-surut');
  });

  it('mengembalikan null untuk JSON rusak', () => {
    expect(parseArticleDraft('bukan json', 'Topik Valid')).toBeNull();
  });

  it('mengurai saran tag dan memotong maksimal 8', () => {
    const raw = JSON.stringify({ tags: ['a', 'b', 'c', 'd', 'e'], category: 'Berita' });
    expect(parseTagSuggestion(raw)?.tags).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(parseTagSuggestion('rusak')).toBeNull();
  });

  it('mengurai analisis moderasi tanpa menyatakan bersalah', () => {
    const raw = JSON.stringify({ summary: 'Dugaan pelanggaran hak cipta.', suggested_priority: 'high', risk_level: 'sedang', keywords: ['hak-cipta'], recommendation: 'Tinjau bukti.' });
    const analysis = parseModerationAnalysis(raw);
    expect(analysis?.suggestedPriority).toBe('high');
    expect(analysis?.summary).toContain('Dugaan');
  });

  it('memblokir prompt berisi materi mirip rahasia', () => {
    expect(scanPrompt('kunci sk-abcdefgh12345678 bocor').ok).toBe(false);
    expect(scanPrompt('tulis berita banjir').ok).toBe(true);
  });

  it('memangkas input panjang', () => {
    expect(truncateInput('  abcdef  ', 3).length).toBeLessThanOrEqual(4);
    expect(stripCodeFence('```json\n{}\n```')).toBe('{}');
  });
});

describe('ai-usage fallback sibuk', () => {
  it('mengembalikan pesan sibuk saat control plane belum dikonfigurasi', async () => {
    const result = await generateArticleDraft({ topic: 'Banjir di Wonosobo' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });

  it('menolak input kosong tanpa memanggil model', async () => {
    const result = await suggestTags({ title: '', body: '' });
    expect(result.ok).toBe(false);
  });

  it('menolak gambar melebihi batas sebelum model', async () => {
    const result = await ocVisionDraft({ base64: 'x'.repeat(8_000_000), mimeType: 'image/jpeg' });
    expect(result.ok).toBe(false);
  });

  it('menolak svg dan mime di luar allowlist', async () => {
    expect((await ocVisionDraft({ base64: 'aGVsbG8=', mimeType: 'image/svg+xml' })).ok).toBe(false);
    expect((await ocVisionDraft({ base64: 'aGVsbG8=', mimeType: 'image/gif' })).ok).toBe(false);
    expect((await ocVisionDraft({ base64: 'aGVsbG8=', mimeType: 'image/avif' })).ok).toBe(false);
  });

  it('menolak base64 kosong dan rusak tanpa memanggil model', async () => {
    expect((await ocVisionDraft({ base64: '', mimeType: 'image/jpeg' })).ok).toBe(false);
    expect((await ocVisionDraft({ base64: 'data:image/png;base64,', mimeType: 'image/png' })).ok).toBe(false);
    expect((await ocVisionDraft({ base64: '<svg></svg>', mimeType: 'image/png' })).ok).toBe(false);
  });

  it('melewati validasi gambar lalu menunda karena control plane belum dikonfigurasi', async () => {
    for (const mimeType of ['image/jpeg', 'image/png', 'image/webp']) {
      const result = await ocVisionDraft({ base64: 'aGVsbG8=', mimeType });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain('sibuk');
    }
  });
});

describe('parseCoverCaption', () => {
  it('mengurai alt dan caption beserta pagar kode', () => {
    const caption = parseCoverCaption('```json\n{"alt":"Suasana pasar pagi.","caption":"Pedagang menata dagangan."}\n```');
    expect(caption?.alt).toBe('Suasana pasar pagi.');
    expect(caption?.caption).toBe('Pedagang menata dagangan.');
  });

  it('mengembalikan null bila keduanya kosong atau bukan json', () => {
    expect(parseCoverCaption('{"alt":"","caption":""}')).toBeNull();
    expect(parseCoverCaption('{"alt":"","caption":"  "}')).toBeNull();
    expect(parseCoverCaption('bukan json')).toBeNull();
  });

  it('menolak gambar melebihi batas dan mime di luar allowlist tanpa memanggil model', async () => {
    expect((await ocCoverCaption({ base64: 'x'.repeat(8_000_000), mimeType: 'image/jpeg' })).ok).toBe(false);
    expect((await ocCoverCaption({ base64: 'aGVsbG8=', mimeType: 'image/avif' })).ok).toBe(false);
    expect((await ocCoverCaption({ base64: '', mimeType: 'image/jpeg' })).ok).toBe(false);
  });

  it('melewati validasi gambar lalu menunda karena control plane belum dikonfigurasi', async () => {
    const result = await ocCoverCaption({ base64: 'aGVsbG8=', mimeType: 'image/webp', title: 'Panen Raya' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
  });
});

describe('parseVisionDraft', () => {
  it('mengurai JSON berpagar kode beserta slug dan tag', () => {
    const raw = '```json\n{"title":"Apel Pagi","slug":"apel-pagi","excerpt":"Ringkas.","content":"Isi lengkap.","tags":["Apel","Pagi"],"suggestedCategory":"Umum","alt":"Alt","caption":"Cap"}\n```';
    const draft = parseVisionDraft(raw);
    expect(draft?.title).toBe('Apel Pagi');
    expect(draft?.slug).toBe('apel-pagi');
    expect(draft?.tags).toEqual(['apel', 'pagi']);
    expect(draft?.alt).toBe('Alt');
  });

  it('mengembalikan null bila judul atau isi kosong', () => {
    expect(parseVisionDraft('{"title":"","content":"Isi"}')).toBeNull();
    expect(parseVisionDraft('{"title":"Judul","content":""}')).toBeNull();
    expect(parseVisionDraft('bukan json')).toBeNull();
  });
});
