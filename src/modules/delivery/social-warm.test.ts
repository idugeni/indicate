import { describe, expect, it, vi } from 'vitest';

import { isFacebookRateLimited, SocialWarmer } from '@/modules/delivery/social-warm';

const PAGE_HTML = '<html><head><meta property="og:image" content="https://tenant.example/api/network/media/img-1" /></head></html>';

function stubFetch(routes: Readonly<Record<string, { readonly status: number; readonly body?: string }>>) {
  const calls: { readonly url: string; readonly method: string; readonly body?: string | undefined }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: { readonly method: 'GET' | 'POST'; readonly body?: string; readonly signal: AbortSignal }) => {
    calls.push({ url, method: init.method, body: init.body });
    const route = routes[`${init.method} ${url}`] ?? { status: 404 };
    return { status: route.status, text: async () => route.body ?? '' };
  });
  return { calls, fetchImpl };
}

function flags(result: { readonly pageOk: boolean; readonly imageOk: boolean; readonly facebookOk: boolean }) {
  return { pageOk: result.pageOk, imageOk: result.imageOk, facebookOk: result.facebookOk };
}

describe('isFacebookRateLimited', () => {
  it('mengenali 429, 5xx, kode 4, dan pesan request limit', () => {
    expect(isFacebookRateLimited(429, '')).toBe(true);
    expect(isFacebookRateLimited(503, '')).toBe(true);
    expect(isFacebookRateLimited(403, '{"error":{"code":4}}')).toBe(true);
    expect(isFacebookRateLimited(403, '{"error":{"message":"(#4) Application request limit reached"}}')).toBe(true);
  });

  it('tidak menganggap penolakan lain sebagai kehabisan kuota', () => {
    expect(isFacebookRateLimited(403, '{"error":{"code":190}}')).toBe(false);
    expect(isFacebookRateLimited(400, '')).toBe(false);
  });
});

describe('SocialWarmer', () => {
  it('memanaskan halaman dan gambar lalu memanggil scrape facebook', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 200, body: '{"success":true}' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: true, facebookOk: true });
    expect(result.pageReason).toBe(null);
    expect(result.imageReason).toBe(null);
    expect(result.facebookReason).toBe(null);
    const scrape = calls.find((call) => call.method === 'POST');
    expect(scrape?.url).toBe('https://graph.facebook.com/v26.0/');
    expect(scrape?.body).toContain('id=https%3A%2F%2Ftenant.example%2Fslug-a');
    expect(scrape?.body).toContain('scrape=true');
    expect(scrape?.body).toContain('access_token=app-id%7Capp-secret');
  });

  it('melewati facebook saat token tidak dikonfigurasi', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
    });
    const warmer = new SocialWarmer(null, fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: true, facebookOk: false });
    expect(result.facebookReason).toBe('facebook_unconfigured');
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('tetap menscrape ke facebook walau pemanasan cache sendiri gagal', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 500 },
      'POST https://graph.facebook.com/v26.0/': { status: 200, body: '{}' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: false, imageOk: false, facebookOk: true });
    expect(result.pageReason).toBe('page_http_status');
    expect(result.facebookReason).toBe(null);
    expect(calls.some((call) => call.method === 'POST')).toBe(true);
  });

  it('tetap menscrape ke facebook walau pemanasan cache melempar', async () => {
    const calls: { readonly url: string; readonly method: string }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: { readonly method: 'GET' | 'POST' }) => {
      calls.push({ url, method: init.method });
      if (url === 'https://graph.facebook.com/v26.0/') return { status: 200, text: async () => '{}' };
      throw new Error('page_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: false, imageOk: false, facebookOk: true });
    expect(result.pageReason).toBe('page_network');
  });

  it('tidak pernah melempar saat seluruh jaringan gagal', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: false, imageOk: false, facebookOk: false });
    expect(result.facebookReason).toBe('facebook_network');
  });

  it('menandai facebook gagal saat graph menjawab non-2xx', async () => {
    const { fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 400, body: '{"error":{}}' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: true, facebookOk: false });
    expect(result.facebookReason).toBe('facebook_http_status');
  });

  it('melaporkan kehabisan kuota saat graph menolak dengan kode 4', async () => {
    const { fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 403, body: '{"error":{"code":4,"message":"Application request limit reached"}}' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(result.facebookOk).toBe(false);
    expect(result.facebookReason).toBe('facebook_rate_limited');
  });

  it('hanya menandai gambar saat og:image absen', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: '<html><head><title>tanpa gambar</title></head></html>' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: false, facebookOk: false });
    expect(result.pageReason).toBe(null);
    expect(result.imageReason).toBe('image_not_linked');
    expect(calls.some((call) => call.method === 'GET' && call.url.includes('/api/network/media/'))).toBe(false);
    expect(calls.some((call) => call.method === 'POST')).toBe(true);
  });

  it('membaca meta saat content mendahului property', async () => {
    const { fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: '<meta content="https://tenant.example/api/network/media/img-1" property="og:image" />' },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 200 },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    expect(flags(await warmer.warmArticle('https://tenant.example/slug-a'))).toEqual({ pageOk: true, imageOk: true, facebookOk: true });
  });

  it('me-resolve og:image relatif ke url absolut', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: '<meta property="og:image" content="/api/network/media/img-1" />' },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 200 },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    expect(flags(await warmer.warmArticle('https://tenant.example/slug-a'))).toEqual({ pageOk: true, imageOk: true, facebookOk: true });
    expect(calls.some((call) => call.method === 'GET' && call.url === 'https://tenant.example/api/network/media/img-1')).toBe(true);
  });

  it('tetap memanggil facebook saat gambar non-2xx', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 404 },
      'POST https://graph.facebook.com/v26.0/': { status: 200 },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: false, facebookOk: true });
    expect(result.imageReason).toBe('image_http_status');
    expect(calls.some((call) => call.method === 'POST')).toBe(true);
  });

  it('tetap memanggil facebook saat gambar gagal jaringan', async () => {
    const calls: { readonly url: string; readonly method: string }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: { readonly method: 'GET' | 'POST' }) => {
      calls.push({ url, method: init.method });
      if (url === 'https://tenant.example/slug-a') return { status: 200, text: async () => PAGE_HTML };
      if (url === 'https://graph.facebook.com/v26.0/') return { status: 200, text: async () => '{}' };
      throw new Error('image_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: false, facebookOk: true });
    expect(result.imageReason).toBe('image_network');
  });

  it('mempertahankan pageOk dan imageOk saat scrape melempar', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === 'https://tenant.example/slug-a') return { status: 200, text: async () => PAGE_HTML };
      if (url === 'https://tenant.example/api/network/media/img-1') return { status: 200, text: async () => '' };
      throw new Error('graph_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    const result = await warmer.warmArticle('https://tenant.example/slug-a');
    expect(flags(result)).toEqual({ pageOk: true, imageOk: true, facebookOk: false });
    expect(result.facebookReason).toBe('facebook_network');
  });

  it('memperlakukan token kosong seperti tanpa token', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
    });
    const warmer = new SocialWarmer('', fetchImpl);
    expect(flags(await warmer.warmArticle('https://tenant.example/slug-a'))).toEqual({ pageOk: true, imageOk: true, facebookOk: false });
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('mengirim user-agent warmer agar lalu lintas teratribusi', async () => {
    const seen: { readonly url: string; readonly userAgent: string | undefined }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: { readonly method: 'GET' | 'POST'; readonly headers?: Record<string, string> }) => {
      seen.push({ url, userAgent: init.headers?.['user-agent'] });
      if (url === 'https://tenant.example/slug-a') return { status: 200, text: async () => PAGE_HTML };
      if (url === 'https://tenant.example/api/network/media/img-1') return { status: 200, text: async () => '' };
      return { status: 200, text: async () => '{}' };
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await warmer.warmArticle('https://tenant.example/slug-a');
    expect(seen.length).toBe(3);
    for (const call of seen) expect(call.userAgent).toBe('indicate-social-warm/1');
  });
});
