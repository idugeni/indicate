import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ ctorArgs: [] as Array<Record<string, unknown>>, responses: [] as Array<Record<string, unknown> | Error>, calls: [] as Array<Record<string, unknown>> }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (args: Record<string, unknown>) => {
        state.calls.push(args);
        const next = state.responses.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    };
    constructor(options: Record<string, unknown>) {
      state.ctorArgs.push(options);
    }
  },
}));

const { executeGeminiAdapter } = await import('@/integrations/ai/gemini-adapter');

function okResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    text: 'halo',
    functionCalls: undefined,
    candidates: [{ content: { parts: [{ text: 'halo' }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    ...overrides,
  };
}

describe('executeGeminiAdapter', () => {
  beforeEach(() => {
    state.ctorArgs.length = 0;
    state.responses.length = 0;
    state.calls.length = 0;
  });

  it('mengirim kunci router ke konstruktor tanpa versi alpha untuk kunci klasik', async () => {
    state.responses.push(okResponse());
    const result = await executeGeminiAdapter('AIza-classic-key', 'gemini-2.5-flash', { prompt: 'hai' });
    expect(state.ctorArgs[0]).toMatchObject({ apiKey: 'AIza-classic-key' });
    expect(state.ctorArgs[0]).not.toMatchObject({ apiVersion: 'v1alpha' });
    expect(result.text).toBe('halo');
    expect(result.tokensUsage).toEqual({ prompt: 10, completion: 5, total: 15 });
    expect(result.toolCallsExecuted).toEqual([]);
  });

  it('memakai v1alpha untuk kunci AQ dot', async () => {
    state.responses.push(okResponse());
    await executeGeminiAdapter('AQ.secret-key', 'gemini-2.5-flash', { prompt: 'hai' });
    expect(state.ctorArgs[0]).toMatchObject({ apiVersion: 'v1alpha' });
  });

  it('menonaktifkan tools secara default tanpa kunci tools di config', async () => {
    state.responses.push(okResponse({ functionCalls: [{ name: 'sneaky', args: {}, id: '1' }] }));
    const result = await executeGeminiAdapter('AIza-classic-key', 'gemini-2.5-flash', { prompt: 'hai' });
    expect(result.toolCallsExecuted).toEqual([]);
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0]).not.toHaveProperty('tools');
  });

  it('memetakan thinkingBudget ke thinkingLevel untuk gemini-3 tanpa sampling lawas', async () => {
    state.responses.push(okResponse());
    await executeGeminiAdapter('AIza-classic-key', 'gemini-3-pro-preview', {
      prompt: 'hai',
      thinkingConfig: { thinkingBudget: 40000 },
    });
    const config = state.calls[0]?.config as Record<string, Record<string, unknown>>;
    expect(config.thinkingConfig).toMatchObject({ thinkingLevel: 'HIGH' });
    expect(config).not.toHaveProperty('temperature');
    expect(config).not.toHaveProperty('topP');
  });

  it('menghilangkan thinkingConfig server-default untuk budget dinamis gemini-3', async () => {
    state.responses.push(okResponse());
    await executeGeminiAdapter('AIza-classic-key', 'gemini-3-pro-preview', {
      prompt: 'hai',
      thinkingConfig: { thinkingBudget: -1 },
    });
    const config = state.calls[0]?.config as Record<string, unknown>;
    expect(config).not.toHaveProperty('thinkingConfig');
  });

  it('mengeksekusi function call maksimal tiga putaran lewat executor', async () => {
    state.responses.push(
      okResponse({ functionCalls: [{ name: 'lookup', args: { q: 'x' }, id: 'c1' }] }),
      okResponse({ functionCalls: [{ name: 'lookup', args: { q: 'y' }, id: 'c2' }] }),
      okResponse({ functionCalls: [{ name: 'lookup', args: { q: 'z' }, id: 'c3' }] }),
      okResponse({ text: 'selesai' }),
    );
    const seen: Array<{ name: string; args: Record<string, unknown> }> = [];
    const result = await executeGeminiAdapter(
      'AIza-classic-key',
      'gemini-2.5-flash',
      { prompt: 'hai', enableTools: true },
      async (name, args) => {
        seen.push({ name, args });
        return { echo: args };
      },
    );
    expect(state.calls).toHaveLength(4);
    expect(result.toolCallsExecuted).toEqual(['lookup', 'lookup', 'lookup']);
    expect(result.toolResults?.lookup).toEqual({ echo: { q: 'z' } });
    expect(seen).toHaveLength(3);
    expect(result.text).toBe('selesai');
  });

  it('mengirim inlineData gambar bersama teks dan menjaga jalur teks tetap sama', async () => {
    state.responses.push(okResponse());
    await executeGeminiAdapter('AIza-classic-key', 'gemini-2.5-flash', {
      prompt: 'Ekstrak gambar.',
      images: [{ base64: 'aGVsbG8=', mimeType: 'image/jpeg' }],
    });
    const contents = state.calls[0]?.contents as Array<{ role: string; parts: Array<Record<string, unknown>> }>;
    expect(contents).toHaveLength(1);
    expect(contents[0]?.parts[0]).toMatchObject({ text: 'Ekstrak gambar.' });
    expect(contents[0]?.parts[1]).toMatchObject({ inlineData: { data: 'aGVsbG8=', mimeType: 'image/jpeg' } });
  });

  it('mengirim bagian teks saja saat tanpa gambar', async () => {
    state.responses.push(okResponse());
    await executeGeminiAdapter('AIza-classic-key', 'gemini-2.5-flash', { prompt: 'hai' });
    const contents = state.calls[0]?.contents as Array<{ role: string; parts: Array<Record<string, unknown>> }>;
    expect(contents[0]?.parts).toEqual([{ text: 'hai' }]);
  });

  it('menolak lebih dari 4 gambar', async () => {
    const images = Array.from({ length: 5 }, () => ({ base64: 'eA==', mimeType: 'image/png' }));
    await expect(executeGeminiAdapter('AIza-classic-key', 'gemini-2.5-flash', { prompt: 'hai', images })).rejects.toThrowError(
      /at most 4/,
    );
    expect(state.calls).toHaveLength(0);
  });

  it('tidak membocorkan kunci pada pesan error', async () => {
    const secret = 'AIza-super-secret-12345';
    state.responses.push(new Error(`rejected key ${secret}`));
    await expect(executeGeminiAdapter(secret, 'gemini-2.5-flash', { prompt: 'hai' })).rejects.toThrowError(
      /Gemini request failed/,
    );
    try {
      await executeGeminiAdapter(secret, 'gemini-2.5-flash', { prompt: 'hai' });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
    await expect(executeGeminiAdapter('', 'gemini-2.5-flash', { prompt: 'hai' })).rejects.toThrow();
  });

  it('meneruskan responseModalities dan speechConfig ke config', async () => {
    state.responses.push(okResponse());
    await executeGeminiAdapter('AIza-classic-key', 'gemini-3.8-flash-tts', {
      prompt: 'Halo.',
      responseModalities: ['AUDIO'],
      speechVoiceName: 'Kore',
    });
    const config = state.calls[0]?.config as Record<string, unknown>;
    expect(config.responseModalities).toEqual(['AUDIO']);
    expect(config.speechConfig).toMatchObject({ voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } });
  });

  it('mengekstrak inlineData gambar dan audio dari kandidat', async () => {
    state.responses.push(
      okResponse({
        text: undefined,
        candidates: [
          {
            content: {
              parts: [
                { text: 'cover' },
                { inlineData: { data: 'aW1hZ2U=', mimeType: 'image/png' } },
                { inlineData: { data: 'YXVkaW8=', mimeType: 'audio/wav' } },
                { inlineData: { data: '', mimeType: 'image/png' } },
              ],
            },
          },
        ],
      }),
    );
    const result = await executeGeminiAdapter('AIza-classic-key', 'gemini-3.1-flash-image', {
      prompt: 'Buat cover.',
      responseModalities: ['TEXT', 'IMAGE'],
    });
    expect(result.inlineData).toEqual([
      { mimeType: 'image/png', base64: 'aW1hZ2U=' },
      { mimeType: 'audio/wav', base64: 'YXVkaW8=' },
    ]);
  });

  it('menghilangkan inlineData saat respons hanya teks', async () => {
    state.responses.push(okResponse());
    const result = await executeGeminiAdapter('AIza-classic-key', 'gemini-2.5-flash', { prompt: 'hai' });
    expect(result.inlineData).toBeUndefined();
  });
});
