import { describe, expect, it, vi } from 'vitest';

import { HttpIndexNowSubmitter } from '@/integrations/indexnow/indexnow-submitter';

function okResponse(status = 200): Response {
  return { ok: status >= 200 && status < 300, status, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as Response;
}

describe('HttpIndexNowSubmitter', () => {
  it('mengelompokkan url per host dan menelan kegagalan per-host', async () => {
    const seen: Array<{ host: string; urls: readonly string[] }> = [];
    const fetchFn = vi.fn(async (url: unknown, init: unknown) => {
      const body = JSON.parse(String((init as { body: string }).body)) as { host: string; urlList: string[] };
      seen.push({ host: body.host, urls: body.urlList });
      if (body.host === 'gagal.test') return okResponse(500);
      return okResponse(200);
    });
    const submitter = new HttpIndexNowSubmitter('kunci-bersama-12345678', fetchFn as typeof fetch);
    await submitter.submit(['https://portal.test/a', 'https://portal.test/a', 'https://gagal.test/b', 'http://polos.test/x']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(seen.find((entry) => entry.host === 'portal.test')?.urls).toEqual(['https://portal.test/a']);
  });

  it('diam saat daftar kosong atau kunci kosong', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    await new HttpIndexNowSubmitter('kunci-bersama-12345678', fetchFn as typeof fetch).submit([]);
    await new HttpIndexNowSubmitter('', fetchFn as typeof fetch).submit(['https://portal.test/a']);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('menerima 202 sebagai keberhasilan verifikasi tertunda', async () => {
    const fetchFn = vi.fn(async () => okResponse(202));
    await new HttpIndexNowSubmitter('kunci-bersama-12345678', fetchFn as typeof fetch).submit(['https://portal.test/a']);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
