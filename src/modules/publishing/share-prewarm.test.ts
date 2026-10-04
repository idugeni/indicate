import { describe, expect, it, vi } from 'vitest';

import { HttpSharePrewarm } from '@/modules/publishing/share-prewarm';

const SOCIAL_HTML =
  '<html><head>' +
  '<meta property="og:title" content="Judul"/>' +
  '<meta property="og:description" content="Deskripsi"/>' +
  '<meta property="og:image" content="https://cdn.test/cover.jpg"/>' +
  '<meta name="twitter:card" content="summary_large_image"/>' +
  '<meta name="twitter:image" content="https://cdn.test/cover.jpg"/>' +
  '</head><body></body></html>';

function htmlResponse(html: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null) },
    text: async () => html,
    arrayBuffer: async () => new ArrayBuffer(8),
  } as unknown as Response;
}

function imageResponse(status = 200, contentType = 'image/jpeg'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => '',
    arrayBuffer: async () => new ArrayBuffer(8),
  } as unknown as Response;
}

describe('HttpSharePrewarm', () => {
  it('menghangatkan html plus og:image tiap url unik dan menelan kegagalan', async () => {
    const seen: string[] = [];
    const fetchFn = vi.fn(async (url: unknown) => {
      seen.push(String(url));
      if (String(url).endsWith('/gagal')) return htmlResponse(SOCIAL_HTML, 500);
      if (String(url).includes('cdn.test')) return imageResponse();
      return htmlResponse(SOCIAL_HTML);
    });
    const prewarmer = new HttpSharePrewarm(fetchFn as typeof fetch, 1_000);
    await prewarmer.prewarm(['https://portal.test/a', 'https://portal.test/a', 'https://portal.test/gagal', 'http://polos.test/x']);
    expect(seen.filter((url) => url === 'https://portal.test/a')).toHaveLength(1);
    expect(seen).toContain('https://cdn.test/cover.jpg');
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('mengulang html tanpa penanda sosial lalu tetap gagal tanpa melempar', async () => {
    const fetchFn = vi.fn(async (url: unknown) =>
      String(url).includes('cdn.test') ? imageResponse() : htmlResponse('<html><head></head><body></body></html>'),
    );
    const prewarmer = new HttpSharePrewarm(fetchFn as typeof fetch, 1_000);
    await prewarmer.prewarm(['https://portal.test/tanpa-tag']);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('diam saat daftar kosong', async () => {
    const fetchFn = vi.fn(async () => htmlResponse(SOCIAL_HTML));
    await new HttpSharePrewarm(fetchFn as typeof fetch).prewarm([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
