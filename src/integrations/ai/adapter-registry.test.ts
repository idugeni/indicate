import { describe, expect, it } from 'vitest';

import { getAiAdapter } from '@/integrations/ai/adapter-registry';

describe('getAiAdapter', () => {
  it('mengembalikan adapter gemini', () => {
    expect(getAiAdapter('gemini').providerId).toBe('gemini');
    expect(getAiAdapter('GEMINI').providerId).toBe('gemini');
  });

  it('mengembalikan stub openai-compatible tanpa kunci', async () => {
    const adapter = getAiAdapter('openai-compatible');
    expect(adapter.providerId).toBe('openai-compatible');
    await expect(adapter.execute('', 'model', { prompt: 'hai' })).rejects.toThrow(/router-provided key/);
  });

  it('menolak provider tak dikenal', () => {
    expect(() => getAiAdapter('unknown-provider')).toThrow(/Unknown AI provider/);
  });
});
