import { describe, expect, it } from 'vitest';

import { diffCatalogModels, normalizeListingId } from '@/modules/ai/ai-model-sweep';

describe('diffCatalogModels', () => {
  it('menonaktifkan baris aktif yang hilang dari listing', () => {
    const diff = diffCatalogModels(
      [
        { id: 'a', providerId: 'openrouter', modelName: 'gone/model', taskRecommendation: 'default chat', isActive: true },
        { id: 'b', providerId: 'openrouter', modelName: 'kept/model', taskRecommendation: 'default chat', isActive: true },
      ],
      new Set(['kept/model']),
    );
    expect(diff.deactivate).toEqual(['a']);
    expect(diff.kept).toEqual(['b']);
  });

  it('melindungi modalitas khusus dan baris nonaktif', () => {
    const diff = diffCatalogModels(
      [
        { id: 'tts', providerId: 'gemini', modelName: 'missing-tts', taskRecommendation: 'speech synthesis', isActive: true },
        { id: 'off', providerId: 'gemini', modelName: 'missing-off', taskRecommendation: 'default chat', isActive: false },
      ],
      new Set(),
    );
    expect(diff.deactivate).toEqual([]);
    expect(diff.kept).toEqual(['tts', 'off']);
  });
});

describe('normalizeListingId', () => {
  it('mengupas prefix models/ dan bentuk objek', () => {
    expect(normalizeListingId('models/gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(normalizeListingId({ id: 'openai/gpt-4o-mini' })).toBe('openai/gpt-4o-mini');
    expect(normalizeListingId({ name: 'x/y' })).toBe('x/y');
    expect(normalizeListingId('')).toBeNull();
    expect(normalizeListingId(null)).toBeNull();
  });
});
