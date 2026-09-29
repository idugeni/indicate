import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ctorArgs: [] as Array<Record<string, unknown>>,
  streamCalls: [] as Array<Record<string, unknown>>,
  streams: [] as Array<AsyncIterable<unknown> | Error>,
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (): Promise<never> => {
        throw new Error('unused in stream tests');
      },
      generateContentStream: async (args: Record<string, unknown>): Promise<AsyncIterable<unknown>> => {
        state.streamCalls.push(args);
        const next = state.streams.shift();
        if (next instanceof Error) throw next;
        if (next === undefined) throw new Error('no stubbed stream');
        return next;
      },
    };
    constructor(options: Record<string, unknown>) {
      state.ctorArgs.push(options);
    }
  },
}));

const { executeGeminiStream, extractStreamText } = await import('@/integrations/ai/gemini-adapter');

async function* chunks(items: readonly unknown[]): AsyncGenerator<unknown> {
  for (const item of items) yield item;
}

describe('extractStreamText', () => {
  it('membaca delta teks dan menolak chunk tanpa teks', () => {
    expect(extractStreamText({ text: 'halo' })).toBe('halo');
    expect(extractStreamText({ text: undefined })).toBe('');
    expect(extractStreamText({})).toBe('');
    expect(extractStreamText(null)).toBe('');
    expect(extractStreamText('mentah')).toBe('');
  });
});

describe('executeGeminiStream', () => {
  beforeEach(() => {
    state.ctorArgs.length = 0;
    state.streamCalls.length = 0;
    state.streams.length = 0;
  });

  it('mengakumulasi delta berurutan dan memanggil onChunk per delta', async () => {
    state.streams.push(chunks([{ text: '{"title":' }, { text: '"Banjir"}' }, { text: '', usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4, totalTokenCount: 12 } }]));
    const deltas: string[] = [];
    const result = await executeGeminiStream('AIza-key', 'gemini-2.5-flash', { prompt: 'tulis draf' }, { onChunk: (delta) => deltas.push(delta) });
    expect(result.text).toBe('{"title":"Banjir"}');
    expect(deltas).toEqual(['{"title":', '"Banjir"}']);
    expect(result.tokensUsage).toEqual({ prompt: 8, completion: 4, total: 12 });
    expect(state.streamCalls[0]).toMatchObject({ model: 'gemini-2.5-flash' });
  });

  it('memakai teks pengganti aman saat stream kosong', async () => {
    state.streams.push(chunks([]));
    const result = await executeGeminiStream('AIza-key', 'gemini-2.5-flash', { prompt: 'hai' });
    expect(result.text).toContain('telah diproses');
    expect(result.toolCallsExecuted).toEqual([]);
  });

  it('membatalkan sebelum SDK dipanggil saat sinyal sudah abort', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(executeGeminiStream('AIza-key', 'gemini-2.5-flash', { prompt: 'hai' }, { signal: controller.signal })).rejects.toThrowError(/aborted/);
    expect(state.streamCalls).toHaveLength(0);
  });

  it('menyamarkan kegagalan provider tanpa membocorkan kunci', async () => {
    const secret = 'AIza-rahasia-stream';
    state.streams.push(new Error(`rejected ${secret}`));
    await expect(executeGeminiStream(secret, 'gemini-2.5-flash', { prompt: 'hai' })).rejects.toThrowError(/stream request failed/);
    try {
      const failing = (async function* (): AsyncGenerator<unknown> {
        yield { text: 'a' };
        throw new Error('mid-stream boom');
      })();
      state.streams.push(failing);
      await executeGeminiStream(secret, 'gemini-2.5-flash', { prompt: 'hai' });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      expect(String(error)).toMatch(/interrupted/);
    }
  });
});
