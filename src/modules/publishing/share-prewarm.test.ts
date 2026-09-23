import { describe, expect, it, vi } from 'vitest';

import { HttpSharePrewarm } from '@/modules/publishing/share-prewarm';

function okResponse(): Response {
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as unknown as Response;
}

describe('HttpSharePrewarm', () => {
  it('mengambil tiap url unik dan menelan kegagalan per-url', async () => {
    const seen: string[] = [];
    const fetchFn = vi.fn(async (url: unknown) => {
      seen.push(String(url));
      if (String(url).endsWith('/gagal')) return { ok: false, status: 500, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as Response;
      return okResponse();
    });
    const prewarmer = new HttpSharePrewarm(fetchFn as typeof fetch, 1_000);
    await prewarmer.prewarm(['https://portal.test/a', 'https://portal.test/a', 'https://portal.test/gagal', 'http://polos.test/x']);
    expect(seen).toEqual(['https://portal.test/a', 'https://portal.test/gagal']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('diam saat daftar kosong', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    await new HttpSharePrewarm(fetchFn as typeof fetch).prewarm([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
