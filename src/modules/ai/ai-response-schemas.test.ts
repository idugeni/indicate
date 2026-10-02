import { describe, expect, it } from 'vitest';

import {
  ARTICLE_DRAFT_SCHEMA,
  CLASSIFY_ARTICLE_SCHEMA,
  COVER_CAPTION_SCHEMA,
  MODERATION_ANALYSIS_SCHEMA,
  POLISH_BODY_SCHEMA,
  PUBLISHER_VERIFY_SCHEMA,
  SEO_BUNDLE_SCHEMA,
  SEO_EXCERPT_SCHEMA,
  SEO_META_SCHEMA,
  SEO_TITLES_SCHEMA,
  TAG_SUGGESTION_SCHEMA,
  TRANSCRIPT_SCHEMA,
  VISION_DRAFT_SCHEMA,
} from '@/modules/ai/ai-response-schemas';
import { parseArticleDraft, parseCoverCaption, parseModerationAnalysis, parseTagSuggestion, parseVisionDraft } from '@/modules/ai/ai-usage';
import { parseExcerptSuggestion, parseMetaDescription, parseSeoBundle, parseTitleSuggestions } from '@/modules/ai/ai-seo';
import { parseClassification, parsePolishedBody } from '@/modules/ai/ai-polish';
import { parseTranscript } from '@/modules/ai/ai-transcribe';
import { parseVerification } from '@/modules/ai/ai-verify';

const LONG_TEXT = 'Deskripsi metaakanonik yang cukup panjang untuk melewati ambang minimal lima puluh karakter validasi.';
const BODY_TEXT = 'Isi berita lengkap yang cukup panjang untuk menjadi bahan pengujian skema respons terstruktur.';

function requiredOf(schema: Record<string, unknown>): readonly string[] {
  const required = (schema as { readonly required?: unknown }).required;
  return Array.isArray(required) ? required.filter((item): item is string => typeof item === 'string') : [];
}

describe('ai-response-schemas', () => {
  it('memakai tipe OBJECT dengan required tak kosong', () => {
    for (const schema of [
      ARTICLE_DRAFT_SCHEMA, TAG_SUGGESTION_SCHEMA, MODERATION_ANALYSIS_SCHEMA, COVER_CAPTION_SCHEMA,
      VISION_DRAFT_SCHEMA, SEO_TITLES_SCHEMA, SEO_META_SCHEMA, SEO_EXCERPT_SCHEMA, SEO_BUNDLE_SCHEMA,
      POLISH_BODY_SCHEMA, CLASSIFY_ARTICLE_SCHEMA, TRANSCRIPT_SCHEMA, PUBLISHER_VERIFY_SCHEMA,
    ]) {
      expect(schema.type).toBe('OBJECT');
      expect(requiredOf(schema).length).toBeGreaterThan(0);
    }
  });

  it('skema draf artikel lolos parseArticleDraft', () => {
    const payload = { title: 'Judul Uji Coba Redaksi', excerpt: 'Kutipan singkat.', content: BODY_TEXT, slug_suggestion: 'judul-uji' };
    expect(parseArticleDraft(JSON.stringify(payload), 'Topik')).not.toBeNull();
  });

  it('skema tag lolos parseTagSuggestion', () => {
    expect(parseTagSuggestion(JSON.stringify({ tags: ['politik-nasional'], category: 'Politik' }))).not.toBeNull();
  });

  it('skema moderasi lolos parseModerationAnalysis', () => {
    const payload = { summary: LONG_TEXT, suggested_priority: 'high', risk_level: 'tinggi', keywords: ['spam'], recommendation: 'Tinjau manual.' };
    expect(parseModerationAnalysis(JSON.stringify(payload))).not.toBeNull();
  });

  it('skema sampul lolos parseCoverCaption', () => {
    expect(parseCoverCaption(JSON.stringify({ alt: 'Foto kegiatan.', caption: 'Keterangan foto.' }))).not.toBeNull();
  });

  it('skema vision lolos parseVisionDraft', () => {
    const payload = { title: 'Judul Uji', slug: 'judul-uji', excerpt: 'Kutipan.', content: BODY_TEXT, tags: ['liputan'], suggestedCategory: 'Berita', alt: 'Alt.', caption: 'Cap.' };
    expect(parseVisionDraft(JSON.stringify(payload))).not.toBeNull();
  });

  it('skema SEO lolos parser masing-masing', () => {
    expect(parseTitleSuggestions(JSON.stringify({ titles: ['Judul Satu', 'Judul Dua', 'Judul Tiga'] }))).not.toBeNull();
    expect(parseMetaDescription(JSON.stringify({ meta_description: LONG_TEXT }))).not.toBeNull();
    expect(parseExcerptSuggestion(JSON.stringify({ excerpt: LONG_TEXT }))).not.toBeNull();
    expect(
      parseSeoBundle(JSON.stringify({ titles: ['Judul Satu'], excerpt: LONG_TEXT, meta_description: LONG_TEXT })),
    ).not.toBeNull();
  });

  it('skema poles dan klasifikasi lolos parser masing-masing', () => {
    expect(parsePolishedBody(JSON.stringify({ body: BODY_TEXT }))).not.toBeNull();
    expect(
      parseClassification(JSON.stringify({ categories: ['Politik'], tags: ['dpr'] }), ['Politik', 'Ekonomi']),
    ).not.toBeNull();
  });

  it('skema transkrip dan verifikasi lolos parser masing-masing', () => {
    expect(parseTranscript(JSON.stringify({ transcript: BODY_TEXT }))).not.toBeNull();
    const payload = { summary: LONG_TEXT, risk_level: 'sedang', checklist: ['Periksa dokumen'], recommendation: 'Lanjut verifikasi.' };
    expect(parseVerification(JSON.stringify(payload))).not.toBeNull();
  });
});
