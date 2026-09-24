import { describe, expect, it, vi } from 'vitest';

import { SocialWarmer } from '@/modules/delivery/social-warm';

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

describe('SocialWarmer', () => {
  it('memanaskan halaman dan gambar lalu memanggil scrape facebook', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 200, body: '{"success":true}' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: true });
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
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: false });
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });

  it('tidak pernah melempar saat jaringan gagal', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: false, imageOk: false, facebookOk: false });
  });

  it('menandai facebook gagal saat graph menjawab non-2xx', async () => {
    const { fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 400, body: '{"error":{}}' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: false });
  });

  it('menghentikan pemanasan saat halaman non-2xx', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 404, body: 'hilang' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: false, imageOk: false, facebookOk: false });
    expect(calls).toHaveLength(1);
  });

  it('hanya menandai halaman saat og:image absen', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: '<html><head><title>tanpa gambar</title></head></html>' },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: false, facebookOk: false });
    expect(calls).toHaveLength(1);
  });

  it('membaca meta saat content mendahului property', async () => {
    const { fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: '<meta content="https://tenant.example/api/network/media/img-1" property="og:image" />' },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 200 },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: true });
  });

  it('me-resolve og:image relatif ke url absolut', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: '<meta property="og:image" content="/api/network/media/img-1" />' },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
      'POST https://graph.facebook.com/v26.0/': { status: 200 },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: true });
    expect(calls.some((call) => call.method === 'GET' && call.url === 'https://tenant.example/api/network/media/img-1')).toBe(true);
  });

  it('tetap memanggil facebook saat gambar non-2xx', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 404 },
      'POST https://graph.facebook.com/v26.0/': { status: 200 },
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: false, facebookOk: true });
    expect(calls.some((call) => call.method === 'POST')).toBe(true);
  });

  it('tetap memanggil facebook saat gambar gagal jaringan', async () => {
    const calls: { readonly url: string; readonly method: string }[] = [];
    const fetchImpl = vi.fn(async (url: string, init: { readonly method: 'GET' | 'POST'; readonly signal: AbortSignal }) => {
      calls.push({ url, method: init.method });
      if (url === 'https://tenant.example/slug-a') return { status: 200, text: async () => PAGE_HTML };
      if (url === 'https://graph.facebook.com/v26.0/') return { status: 200, text: async () => '{}' };
      throw new Error('image_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: false, facebookOk: true });
  });

  it('mempertahankan pageOk saat scrape melempar', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url === 'https://tenant.example/slug-a') return { status: 200, text: async () => PAGE_HTML };
      if (url === 'https://tenant.example/api/network/media/img-1') return { status: 200, text: async () => '' };
      throw new Error('graph_down');
    });
    const warmer = new SocialWarmer('app-id|app-secret', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: false });
  });

  it('memperlakukan token kosong seperti tanpa token', async () => {
    const { calls, fetchImpl } = stubFetch({
      'GET https://tenant.example/slug-a': { status: 200, body: PAGE_HTML },
      'GET https://tenant.example/api/network/media/img-1': { status: 200 },
    });
    const warmer = new SocialWarmer('', fetchImpl);
    await expect(warmer.warmArticle('https://tenant.example/slug-a')).resolves.toEqual({ pageOk: true, imageOk: true, facebookOk: false });
    expect(calls.some((call) => call.method === 'POST')).toBe(false);
  });
});
