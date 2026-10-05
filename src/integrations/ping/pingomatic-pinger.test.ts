import { describe, expect, it, vi } from 'vitest';

import { HttpPingomaticPinger } from '@/integrations/ping/pingomatic-pinger';

function okResponse(status = 200): Response {
  return { ok: status >= 200 && status < 300, status, arrayBuffer: async () => new ArrayBuffer(0) } as unknown as Response;
}

describe('HttpPingomaticPinger', () => {
  it('mengirim satu ping xml-rpc per host dan menelan kegagalan per-host', async () => {
    const bodies: string[] = [];
    const fetchFn = vi.fn(async (url: unknown, init: unknown) => {
      bodies.push(String((init as { body: string }).body));
      if (bodies.length === 2) return okResponse(500);
      return okResponse(200);
    });
    const pinger = new HttpPingomaticPinger(fetchFn as typeof fetch);
    await pinger.ping(['https://portal.test/a', 'https://portal.test/a', 'https://gagal.test/b', 'http://polos.test/x']);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(bodies[0]).toContain('<methodName>weblogUpdates.ping</methodName>');
    expect(bodies[0]).toContain('https://portal.test/');
  });

  it('diam saat daftar kosong atau tanpa https', async () => {
    const fetchFn = vi.fn(async () => okResponse());
    await new HttpPingomaticPinger(fetchFn as typeof fetch).ping([]);
    await new HttpPingomaticPinger(fetchFn as typeof fetch).ping(['http://polos.test/x']);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
