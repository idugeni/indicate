import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAiCompatibleAdapter } from '@/integrations/ai/openai-compatible-adapter';

describe('OpenAiCompatibleAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mengirim gambar sebagai image_url tanpa menolak', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    const result = await adapter.execute('router-key', 'model', { prompt: 'hai', images: [{ base64: 'aGVsbG8=', mimeType: 'image/jpeg' }] });
    expect(result.text).toBe('ok');
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: unknown }> };
    const last = body.messages.at(-1)?.content as Array<Record<string, unknown>>;
    expect(Array.isArray(last)).toBe(true);
    expect(last.some((part) => part.type === 'image_url')).toBe(true);
  });

  it('meminta json_object saat responseMimeType json', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    await adapter.execute('router-key', 'model', { prompt: 'hai', responseMimeType: 'application/json' });
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { response_format?: { type: string } };
    expect(body.response_format).toMatchObject({ type: 'json_object' });
  });

  it('menjaga jalur teks tanpa perubahan', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    const result = await adapter.execute('router-key', 'model', { prompt: 'hai' });
    expect(result.text).toBe('ok');
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    expect(body.messages.at(-1)).toMatchObject({ role: 'user', content: 'hai' });
  });
});
