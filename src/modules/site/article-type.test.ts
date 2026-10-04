import { describe, expect, it } from 'vitest';

import {
  articleTypeLabel,
  describeArticleTypeProblem,
  hasVideoNode,
  isArticleType,
  normalizeArticleType,
  withArticleTypeNote,
} from '@/modules/site/article-type';

describe('article-type', () => {
  it('mengenali keenam mode dan menolak nilai liar', () => {
    for (const mode of ['standard', 'video', 'gallery', 'audio', 'liveblog', 'short'] as const) {
      expect(isArticleType(mode)).toBe(true);
      expect(normalizeArticleType(mode)).toBe(mode);
      expect(articleTypeLabel(mode)).not.toBe('');
    }
    expect(isArticleType('breaking')).toBe(false);
    expect(normalizeArticleType('breaking')).toBe('standard');
    expect(normalizeArticleType(undefined)).toBe('standard');
  });

  it('membatasi short 500 karakter', () => {
    expect(describeArticleTypeProblem({ type: 'short', body: 'x'.repeat(500) })).toBeNull();
    expect(describeArticleTypeProblem({ type: 'short', body: `${'x'.repeat(500)} ` })).toBeNull();
    expect(describeArticleTypeProblem({ type: 'short', body: 'x'.repeat(501) })).toContain('500');
    expect(describeArticleTypeProblem({ type: 'short' })).toBeNull();
  });

  it('mewajibkan sampul atau sematan video untuk mode video', () => {
    expect(describeArticleTypeProblem({ type: 'video' })).not.toBeNull();
    expect(describeArticleTypeProblem({ type: 'video', leadMediaId: 'm-1' })).toBeNull();
    expect(describeArticleTypeProblem({ type: 'video', coverImageUrl: 'https://contoh.id/x.jpg' })).toBeNull();
    expect(
      describeArticleTypeProblem({ type: 'video', bodyJson: { type: 'doc', content: [{ type: 'youtube' }] } }),
    ).toBeNull();
    expect(hasVideoNode({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(false);
    expect(hasVideoNode(null)).toBe(false);
  });

  it('mewajibkan URL audio untuk mode audio', () => {
    expect(describeArticleTypeProblem({ type: 'audio' })).not.toBeNull();
    expect(describeArticleTypeProblem({ type: 'audio', audioUrl: '  ' })).not.toBeNull();
    expect(describeArticleTypeProblem({ type: 'audio', audioUrl: 'https://cdn.example/rekaman.mp3' })).toBeNull();
  });

  it('mewajibkan dokumen terstruktur untuk liveblog', () => {
    expect(describeArticleTypeProblem({ type: 'liveblog', bodyJson: null })).not.toBeNull();
    expect(
      describeArticleTypeProblem({ type: 'liveblog', bodyJson: { type: 'doc', content: [] } }),
    ).toBeNull();
    expect(describeArticleTypeProblem({ type: 'liveblog' })).toBeNull();
  });

  it('menempelkan catatan mode ke prompt kecuali standar', () => {
    expect(withArticleTypeNote('dasar', 'standard')).toBe('dasar');
    expect(withArticleTypeNote('dasar', undefined)).toBe('dasar');
    expect(withArticleTypeNote('dasar', 'short')).toContain('Mode short');
    expect(withArticleTypeNote('dasar', 'video')).toContain('Mode video');
  });
});
