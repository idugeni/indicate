import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenAiCompatibleAdapter, toOpenAiJsonSchema } from '@/integrations/ai/openai-compatible-adapter';

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function sseResponse(events: Array<unknown | '[DONE]'>): Response {
  const text = events.map((event) => `data: ${event === '[DONE]' ? '[DONE]' : JSON.stringify(event)}\n\n`).join('');
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function lastBody(): Record<string, unknown> {
  const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('OpenAiCompatibleAdapter', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => okJson({ choices: [{ message: { content: 'ok' } }] })),
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
    const body = lastBody() as { response_format?: { type: string } };
    expect(body.response_format).toMatchObject({ type: 'json_object' });
  });

  it('menurunkan skema Gemini ke JSON Schema lowercase', () => {
    expect(
      toOpenAiJsonSchema({
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
          risk: { type: 'STRING', enum: ['rendah', 'tinggi'] },
        },
        required: ['title'],
      }),
    ).toEqual({
      type: 'object',
      properties: {
        title: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        risk: { type: 'string', enum: ['rendah', 'tinggi'] },
      },
      required: ['title'],
    });
  });

  it('mengirim skema lowercase saat adapter structured', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    await adapter.execute('router-key', 'model', {
      prompt: 'hai',
      responseSchema: { type: 'OBJECT', properties: { text: { type: 'STRING' } }, required: ['text'] },
    });
    const body = lastBody() as { response_format?: { json_schema?: { schema?: unknown } } };
    expect(body.response_format?.json_schema?.schema).toEqual({
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    });
  });

  it('menjaga jalur teks tanpa perubahan', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    const result = await adapter.execute('router-key', 'model', { prompt: 'hai' });
    expect(result.text).toBe('ok');
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
    expect(body.messages.at(-1)).toMatchObject({ role: 'user', content: 'hai' });
  });

  it.each([
    { budget: 100, effort: 'low' },
    { budget: 8192, effort: 'low' },
    { budget: 8193, effort: 'medium' },
    { budget: 32768, effort: 'medium' },
    { budget: 40000, effort: 'high' },
  ])('memetakan budget $budget ke reasoning $effort', async ({ budget, effort }) => {
    const adapter = new OpenAiCompatibleAdapter();
    await adapter.execute('router-key', 'model', { prompt: 'hai', thinkingConfig: { thinkingBudget: budget } });
    expect(lastBody()).toMatchObject({ reasoning: { effort } });
  });

  it.each([{ budget: -1 }, {}])(
    'menghilangkan reasoning saat budget dinonaktifkan (%#)',
    async (entry) => {
      const adapter = new OpenAiCompatibleAdapter();
      await adapter.execute(
        'router-key',
        'model',
        'budget' in entry ? { prompt: 'hai', thinkingConfig: { thinkingBudget: entry.budget } } : { prompt: 'hai' },
      );
      expect(lastBody()).not.toHaveProperty('reasoning');
    },
  );

  it('mengirim include_reasoning saat includeThoughts true', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    await adapter.execute('router-key', 'model', {
      prompt: 'hai',
      thinkingConfig: { thinkingBudget: 100, includeThoughts: true },
    });
    expect(lastBody()).toMatchObject({ reasoning: { effort: 'low' }, include_reasoning: true });
  });

  it('menghilangkan include_reasoning saat includeThoughts tidak true', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    await adapter.execute('router-key', 'model', {
      prompt: 'hai',
      thinkingConfig: { thinkingBudget: 100, includeThoughts: false },
    });
    expect(lastBody()).not.toHaveProperty('include_reasoning');
  });

  it('meminta json_schema saat responseSchema objek non-kosong', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    const schema = { type: 'object', properties: { city: { type: 'string' } } };
    await adapter.execute('router-key', 'model', {
      prompt: 'hai',
      responseMimeType: 'application/json',
      responseSchema: schema,
    });
    expect(lastBody()).toMatchObject({
      response_format: { type: 'json_schema', json_schema: { name: 'indicate', strict: true, schema } },
    });
  });

  it('menghilangkan response_format tanpa schema dan MIME json', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    await adapter.execute('router-key', 'model', { prompt: 'hai' });
    expect(lastBody()).not.toHaveProperty('response_format');
    expect(lastBody()).not.toHaveProperty('provider');
  });

  it('mengirim preferensi provider routing statis', async () => {
    const adapter = new OpenAiCompatibleAdapter('openrouter', 'https://openrouter.ai/api/v1', {}, { sort: 'throughput', allowFallbacks: true });
    await adapter.execute('router-key', 'model', { prompt: 'hai' });
    expect(lastBody()).toMatchObject({ provider: { sort: 'throughput', allow_fallbacks: true } });
  });

  it('costMode price menimpa sort menjadi termurah', async () => {
    const adapter = new OpenAiCompatibleAdapter('openrouter', 'https://openrouter.ai/api/v1', {}, { sort: 'throughput', allowFallbacks: true });
    await adapter.execute('router-key', 'model', { prompt: 'hai', costMode: 'price' });
    expect(lastBody()).toMatchObject({ provider: { sort: 'price', allow_fallbacks: true } });
  });

  it('menyalakan require_parameters otomatis untuk request terstruktur', async () => {
    const adapter = new OpenAiCompatibleAdapter('openrouter', 'https://openrouter.ai/api/v1');
    await adapter.execute('router-key', 'model', {
      prompt: 'hai',
      responseMimeType: 'application/json',
      responseSchema: { type: 'object' },
    });
    expect(lastBody()).toMatchObject({ provider: { require_parameters: true } });
  });

  it('mengalirkan delta teks dan usage akhir via executeStream', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      sseResponse([
        { choices: [{ delta: { content: 'halo ' } }] },
        { choices: [{ delta: { content: 'dunia' } }] },
        { choices: [{ delta: { content: '' } }], usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 } },
        '[DONE]',
      ]),
    );
    const adapter = new OpenAiCompatibleAdapter();
    const deltas: string[] = [];
    const result = await adapter.executeStream('router-key', 'model', { prompt: 'hai' }, { onChunk: (delta) => deltas.push(delta) });
    expect(result.text).toBe('halo dunia');
    expect(deltas).toEqual(['halo ', 'dunia']);
    expect(result.tokensUsage).toMatchObject({ prompt: 3, completion: 4, total: 7 });
    const body = lastBody();
    expect(body).toMatchObject({ stream: true, model: 'model' });
  });

  it('membatalkan executeStream saat sinyal sudah abort', async () => {
    const adapter = new OpenAiCompatibleAdapter();
    const controller = new AbortController();
    controller.abort();
    await expect(adapter.executeStream('secret-router-key', 'model', { prompt: 'hai' }, { signal: controller.signal })).rejects.toThrow(
      /aborted\./,
    );
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('menyertakan status, potongan body, dan marker retry_after saat non-ok', async () => {
    const longBody = `boom ${'x'.repeat(500)}`;
    vi.mocked(fetch).mockResolvedValueOnce(new Response(longBody, { status: 429, headers: { 'retry-after': '2' } }));
    const adapter = new OpenAiCompatibleAdapter();
    const error: unknown = await adapter.execute('secret-router-key', 'model', { prompt: 'hai' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain('429');
    expect(message).toContain('retry_after:2');
    expect(message).toContain('boom');
    expect(message.length).toBeLessThanOrEqual(429 + 300 + 120);
    expect(message).not.toContain('secret-router-key');
  });

  it('menyertakan status dan marker retry_after pada executeStream non-ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('slow down', { status: 503, headers: { 'retry-after': '5' } }));
    const adapter = new OpenAiCompatibleAdapter();
    const error: unknown = await adapter
      .executeStream('secret-router-key', 'model', { prompt: 'hai' })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain('503');
    expect(message).toContain('retry_after:5');
    expect(message).not.toContain('secret-router-key');
  });
});
