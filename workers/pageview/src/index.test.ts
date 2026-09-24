import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from './index';
import { PAGEVIEW_KEY_TTL_SECONDS } from '../../../src/modules/site/pageview-contract';

const ENV = {
  ENVIRONMENT: 'test',
  UPSTASH_REDIS_REST_URL: 'https://redis.example',
  UPSTASH_REDIS_REST_TOKEN: 'token-uji',
} as const;

const BEACON = {
  o: '7e27727d-b59f-4d24-998e-1bee6eeb3fa0',
  s: '1ae6d084-de27-4ec7-b1ae-863fbd031038',
  a: '0e83aba3-5be1-4e21-8717-f959efd7919e',
} as const;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

function postBeacon(userAgent: string | null, body: string): Request {
  const headers = new Headers();
  if (userAgent !== null) headers.set('user-agent', userAgent);
  return new Request('https://pv.indicate.website/v', { method: 'POST', headers, body });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('pageview worker', () => {
  it('tolak method/path lain dengan 404', async () => {
    const response = await worker.fetch(new Request('https://pv.indicate.website/', { method: 'GET' }), { ...ENV });
    expect(response.status).toBe(404);
  });

  it('abaikan body tak valid tanpa menyentuh Upstash', async () => {
    const upstream = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(postBeacon(BROWSER_UA, '{}'), { ...ENV });
    expect(response.status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('buang bot dengan 204 tanpa INCR', async () => {
    const upstream = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(postBeacon('python-requests/2.31.0', JSON.stringify(BEACON)), { ...ENV });
    expect(response.status).toBe(204);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('teruskan view sah via pipeline INCR + EXPIRE', async () => {
    const upstream = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(postBeacon(BROWSER_UA, JSON.stringify(BEACON)), { ...ENV });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(upstream).toHaveBeenCalledTimes(1);
    const [, init] = upstream.mock.calls[0] as unknown as [string, RequestInit];
    const key = `pv:test:${BEACON.o}:${BEACON.s}:${BEACON.a}`;
    expect(JSON.parse(String(init.body))).toEqual([
      ['INCR', key],
      ['EXPIRE', key, PAGEVIEW_KEY_TTL_SECONDS],
    ]);
  });

  it('jawab preflight OPTIONS dengan 204 + CORS tanpa menyentuh Upstash', async () => {
    const upstream = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', upstream);
    const response = await worker.fetch(new Request('https://pv.indicate.website/v', { method: 'OPTIONS' }), { ...ENV });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(upstream).not.toHaveBeenCalled();
  });
});
