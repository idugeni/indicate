import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAiAdapter } from '@/integrations/ai/adapter-registry';

describe('getAiAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mengembalikan adapter gemini', () => {
    expect(getAiAdapter('gemini').providerId).toBe('gemini');
    expect(getAiAdapter('GEMINI').providerId).toBe('gemini');
  });

  it('mengembalikan adapter openrouter di atas chat-completions', async () => {
    const adapter = getAiAdapter('openrouter');
    expect(adapter.providerId).toBe('openrouter');
    expect(getAiAdapter('OpenRouter').providerId).toBe('openrouter');
    await expect(adapter.execute('', 'openai/gpt-4o-mini', { prompt: 'hai' })).rejects.toThrow(/router-provided key/);
  });

  it('openrouter mengirim X-Title OpenRouter', async () => {
    const adapter = getAiAdapter('openrouter');
    await adapter.execute('sk-or-test', 'openai/gpt-4o-mini', { prompt: 'hai' });
    const init = vi.mocked(fetch).mock.calls.at(0)?.at(1) as RequestInit;
    expect((init.headers as Record<string, string>)['X-Title']).toBe('Indicate');
    const body = JSON.parse(init.body as string) as { provider?: Record<string, unknown> };
    expect(body.provider).toMatchObject({ sort: 'throughput', allow_fallbacks: true });
  });

  it('mengembalikan stub openai-compatible tanpa kunci', async () => {
    const adapter = getAiAdapter('openai-compatible');
    expect(adapter.providerId).toBe('openai-compatible');
    await expect(adapter.execute('', 'model', { prompt: 'hai' })).rejects.toThrow(/router-provided key/);
  });

  it('mendaftarkan vercel-gateway di atas AI Gateway tanpa kunci', async () => {
    const adapter = getAiAdapter('vercel-gateway');
    expect(adapter.providerId).toBe('vercel-gateway');
    await expect(adapter.execute('', 'model', { prompt: 'hai' })).rejects.toThrow(/router-provided key/);
  });

  it('menolak provider tak dikenal', () => {
    expect(() => getAiAdapter('unknown-provider')).toThrow(/Unknown AI provider/);
  });
});
