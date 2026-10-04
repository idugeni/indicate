import { beforeEach, describe, expect, it, vi } from 'vitest';

import { executeAiQuery } from '@/modules/ai/ai-service';
import { runTaskQuery } from '@/modules/ai/ai-task-query';

vi.mock('@/modules/ai/ai-service', () => ({
  executeAiQuery: vi.fn(),
}));

const CALL = {
  text: '{"titles":["a","b","c"]}',
  providerId: 'gemini',
  modelName: 'm',
  credentialId: 'c',
  credentialMasked: 'x',
  latencyMs: 1,
  retryCount: 0,
  toolCallsExecuted: [],
};

function baseQuery() {
  return {
    prompt: 'Susun 3 varian judul.',
    systemInstruction: 'Sistem.',
    temperature: 0.5,
    maxOutputTokens: 256,
  };
}

beforeEach(() => {
  vi.mocked(executeAiQuery).mockReset();
  vi.mocked(executeAiQuery).mockResolvedValue({ ...CALL });
});

describe('runTaskQuery shared helper', () => {
  it('memetakan thinkingTask seo menjadi thinkingConfig profil', async () => {
    const result = await runTaskQuery({} as never, 'editor', undefined, { ...baseQuery(), thinkingTask: 'seo' });
    expect(result.ok).toBe(true);
    expect(vi.mocked(executeAiQuery)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(executeAiQuery).mock.calls[0]?.[1]).toMatchObject({
      thinkingConfig: { thinkingBudget: 2048, includeThoughts: true },
    });
  });

  it('menghormati thinkingConfig eksplisit di atas thinkingTask', async () => {
    await runTaskQuery({} as never, 'editor', undefined, {
      ...baseQuery(),
      thinkingTask: 'seo',
      thinkingConfig: { thinkingBudget: 512 },
    });
    expect(vi.mocked(executeAiQuery).mock.calls[0]?.[1]).toMatchObject({
      thinkingConfig: { thinkingBudget: 512 },
    });
  });

  it('meneruskan thinkingBudget 0 untuk tugas non-teks', async () => {
    await runTaskQuery({} as never, 'editor', undefined, { ...baseQuery(), thinkingTask: 'tts' });
    expect(vi.mocked(executeAiQuery).mock.calls[0]?.[1]).toMatchObject({
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it('mengembalikan pesan sibuk tanpa memanggil model saat deps null', async () => {
    const result = await runTaskQuery(null, 'editor', undefined, { ...baseQuery(), thinkingTask: 'seo' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('sibuk');
    expect(vi.mocked(executeAiQuery)).not.toHaveBeenCalled();
  });

  it('menolak prompt berisi materi mirip rahasia tanpa memanggil model', async () => {
    const result = await runTaskQuery({} as never, 'editor', undefined, {
      ...baseQuery(),
      prompt: 'kunci sk-abcdefgh12345678 bocor, jelaskan',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('rahasia');
    expect(vi.mocked(executeAiQuery)).not.toHaveBeenCalled();
  });

  it('meneruskan media, skema, dan modalitas apa adanya', async () => {
    await runTaskQuery({} as never, 'editor', 'org-1', {
      ...baseQuery(),
      responseMimeType: 'application/json',
      responseSchema: { type: 'OBJECT' },
      images: [{ base64: 'aGVsbG8=', mimeType: 'image/png' }],
      audio: [{ base64: 'aGVsbG8=', mimeType: 'audio/mpeg' }],
      modelOverride: 'model-x',
      responseModalities: ['TEXT', 'IMAGE'],
      speechVoiceName: 'Kore',
    });
    expect(vi.mocked(executeAiQuery).mock.calls[0]?.[1]).toMatchObject({
      organizationId: 'org-1',
      responseMimeType: 'application/json',
      modelOverride: 'model-x',
      speechVoiceName: 'Kore',
    });
  });
});
