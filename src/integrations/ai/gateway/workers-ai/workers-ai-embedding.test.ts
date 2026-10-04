import { describe, expect, it, vi } from 'vitest';

import {
  WORKERS_AI_EMBED_MAX_BATCH,
  embedTextsViaWorkersAi,
  workersAiEmbeddingUrl,
} from '@/integrations/ai/gateway/workers-ai/workers-ai-embedding';

const CONFIG = { accountId: 'acct-1', apiToken: 'token-1' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('embedTextsViaWorkersAi', () => {
  it('mengirim satu batch dan mengembalikan vektor sejajar input', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      seen.push({ url, init: init ?? {} });
      return jsonResponse({ success: true, result: { data: [[1, 0], [0, 1]] } });
    });
    const vectors = await embedTextsViaWorkersAi(CONFIG, ['satu', 'dua'], { fetchImpl });
    expect(vectors).toEqual([[1, 0], [0, 1]]);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.url).toBe(workersAiEmbeddingUrl(CONFIG));
    expect((seen[0]?.init.headers as Record<string, string>).Authorization).toBe('Bearer token-1');
    const payload = JSON.parse(String(seen[0]?.init.body ?? '{}')) as { readonly text?: unknown };
    expect(payload.text).toEqual(['satu', 'dua']);
  });

  it('gagal transport menjadi null tanpa melempar', async () => {
    const failing = vi.fn(async () => {
      throw new Error('putus');
    });
    await expect(embedTextsViaWorkersAi(CONFIG, ['a'], { fetchImpl: failing })).resolves.toEqual([null]);
    expect(failing).toHaveBeenCalledTimes(1);
    const badStatus = vi.fn(async () => jsonResponse({ error: 'sibuk' }, 503));
    await expect(embedTextsViaWorkersAi(CONFIG, ['a', 'b'], { fetchImpl: badStatus, retryDelayMs: 0 })).resolves.toEqual([null, null]);
    expect(badStatus).toHaveBeenCalledTimes(2);
    const malformed = vi.fn(async () => jsonResponse({ result: { data: [[Number.NaN]] } }));
    await expect(embedTextsViaWorkersAi(CONFIG, ['a'], { fetchImpl: malformed })).resolves.toEqual([null]);
  });

  it('429/5xx diulang sekali lalu memakai hasil kedua', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'tetap sibuk' }, 503));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ error: 'sibuk' }, 429));
    fetchImpl.mockResolvedValueOnce(jsonResponse({ success: true, result: { data: [[1, 0]] } }));
    await expect(embedTextsViaWorkersAi(CONFIG, ['a'], { fetchImpl, retryDelayMs: 0 })).resolves.toEqual([[1, 0]]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('respons non-retryable tidak diulang', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'jelek' }, 400));
    await expect(embedTextsViaWorkersAi(CONFIG, ['a'], { fetchImpl, retryDelayMs: 0 })).resolves.toEqual([null]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('menolak kontrak kosong dan batch berlebih', async () => {
    await expect(embedTextsViaWorkersAi({ accountId: '', apiToken: 't' }, ['a'])).rejects.toThrowError(/account credentials/);
    await expect(embedTextsViaWorkersAi(CONFIG, [])).rejects.toThrowError(/at least one/);
    await expect(embedTextsViaWorkersAi(CONFIG, Array.from({ length: WORKERS_AI_EMBED_MAX_BATCH + 1 }, () => 'x'))).rejects.toThrowError(
      /at most 20/,
    );
    await expect(embedTextsViaWorkersAi(CONFIG, ['   '])).resolves.toEqual([null]);
  });
});
