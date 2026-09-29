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

  it('menolak muatan gambar dengan error jelas tanpa memanggil provider', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    await expect(
      adapter.execute('router-key', 'model', { prompt: 'hai', images: [{ base64: 'aGVsbG8=', mimeType: 'image/jpeg' }] }),
    ).rejects.toThrowError(/does not support image/);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
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
