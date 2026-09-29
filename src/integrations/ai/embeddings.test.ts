import { describe, expect, it, vi } from 'vitest';

import {
  EMBED_MAX_BATCH,
  cosineSimilarity,
  embedTexts,
  rankSemanticCandidates,
} from '@/integrations/ai/embeddings';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('embedTexts', () => {
  it('mengembalikan vektor sejajar input dengan dimensi dinamis', async () => {
    const seen: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      seen.push({ url, init: init ?? {} });
      const body = JSON.parse(String((init?.body as string) ?? '{}')) as { readonly content?: { readonly parts?: Array<{ readonly text?: string }> } };
      const text = body.content?.parts?.[0]?.text ?? '';
      const values = text === 'satu' ? [1, 0, 0] : [0, 1, 0, 0, 0];
      return jsonResponse({ embedding: { values } });
    });
    const vectors = await embedTexts('kunci', ['satu', 'dua'], { fetchImpl });
    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toEqual([1, 0, 0]);
    expect(vectors[1]).toEqual([0, 1, 0, 0, 0]);
    expect(seen).toHaveLength(2);
    expect(seen[0]?.url).toContain('gemini-embedding-001:embedContent');
    expect((seen[0]?.init.headers as Record<string, string>)['x-goog-api-key']).toBe('kunci');
    expect(seen[0]?.init.method).toBe('POST');
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(2);
  });

  it('gagal per teks menjadi null lalu lanjut tanpa menggagalkan batch', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ embedding: { values: [0.5, 0.5] } }));
    fetchImpl.mockRejectedValueOnce(new Error('putus'));
    const vectors = await embedTexts('kunci', ['a', 'b'], { fetchImpl });
    expect(vectors[0]).toBeNull();
    expect(vectors[1]).toEqual([0.5, 0.5]);
  });

  it('respons non-ok menjadi null tanpa melempar', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: 'sibuk' }, 503));
    const vectors = await embedTexts('kunci', ['a'], { fetchImpl });
    expect(vectors).toEqual([null]);
  });

  it('mengembalikan null untuk respons malformed dan menjaga batas batch', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ embedding: { values: [1, Number.NaN] } }));
    const vectors = await embedTexts('kunci', ['  ', 'rusak'], { fetchImpl });
    expect(vectors[0]).toBeNull();
    expect(vectors[1]).toBeNull();
    expect(vi.mocked(fetchImpl)).toHaveBeenCalledTimes(1);
    await expect(embedTexts('kunci', [])).rejects.toThrowError(/at least one/);
    await expect(embedTexts('', ['a'])).rejects.toThrowError(/router-provided key/);
    await expect(embedTexts('kunci', Array.from({ length: EMBED_MAX_BATCH + 1 }, () => 'x'))).rejects.toThrowError(/at most 20/);
  });
});

describe('cosineSimilarity', () => {
  it('mengurutkan kandidat searah di atas yang ortogonal', () => {
    const query = [1, 0];
    expect(cosineSimilarity(query, [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity(query, [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity(query, [])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('rankSemanticCandidates', () => {
  it('menyaring di bawah threshold 0.35 dan mengurutkan menurun', () => {
    const hits = rankSemanticCandidates([1, 0], [
      { id: 'lemah', articleId: null, excerpt: 'w', embedding: [0.2, 0.98] },
      { id: 'kuat', articleId: 'a1', excerpt: 's', embedding: [0.99, 0.01] },
      { id: 'rusak', articleId: null, excerpt: 'x', embedding: 'bukan-vektor' },
      { id: 'sedang', articleId: null, excerpt: 'm', embedding: [0.8, 0.6] },
    ]);
    expect(hits.map((hit) => hit.id)).toEqual(['kuat', 'sedang']);
    expect(hits[0]?.score).toBeGreaterThan(hits[1]?.score ?? 0);
    expect(hits.every((hit) => hit.score >= 0.35)).toBe(true);
  });

  it('membatasi topK dan mengembalikan kosong bila semua vektor kosong', () => {
    const candidates = Array.from({ length: 30 }, (_, index) => ({
      id: `c${index}`,
      articleId: null as string | null,
      excerpt: 'e',
      embedding: [1, 0] as const,
    }));
    expect(rankSemanticCandidates([1, 0], candidates, { topK: 5 })).toHaveLength(5);
    expect(rankSemanticCandidates([1, 0], [{ id: 'n', articleId: null, excerpt: 'e', embedding: null }])).toEqual([]);
  });
});
