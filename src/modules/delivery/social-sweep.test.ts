import { describe, expect, it, vi } from 'vitest';

import { orderSweepHosts, sweepFacebookMetadata } from '@/modules/delivery/social-sweep';
import type { SocialSweepHost, SocialSweepResponse } from '@/modules/delivery/social-sweep';

const VERIFIED_BODY = JSON.stringify({
  url: 'https://apex.example/',
  type: 'website',
  title: 'Apex - Tagline.',
  description: 'Deskripsi portal yang lengkap untuk pratinjau kartu sosial.',
  image: [{ url: 'https://apex.example/api/network/media/img-1' }],
  site_name: 'Apex',
});

function response(status: number, body: string, appUsage: string | null = null): SocialSweepResponse {
  return { status, headers: { get: (name) => (name === 'x-app-usage' ? appUsage : null) }, text: async () => body };
}

function stubFetch(routes: Readonly<Record<string, { readonly status: number; readonly body: string; readonly appUsage?: string }>>) {
  const calls: { readonly body: string }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: { readonly method: 'POST'; readonly body: string; readonly signal: AbortSignal }) => {
    void url;
    void init.signal;
    calls.push({ body: init.body });
    const id = new URLSearchParams(init.body).get('id') ?? '';
    const route = routes[id];
    if (route === undefined) return response(404, '{"error":{"code":100}}');
    return response(route.status, route.body, route.appUsage ?? null);
  });
  return { calls, fetchImpl };
}

const HOSTS: readonly SocialSweepHost[] = [
  { hostname: 'city.example', apex: false },
  { hostname: 'apex.example', apex: true },
  { hostname: 'another-apex.example', apex: true },
  { hostname: 'region.example', apex: false },
];

describe('orderSweepHosts', () => {
  it('mendahulukan apex lalu mengurutkan nama agar offset stabil', () => {
    expect(orderSweepHosts(HOSTS).map((host) => host.hostname)).toEqual([
      'another-apex.example',
      'apex.example',
      'city.example',
      'region.example',
    ]);
  });
});

describe('sweepFacebookMetadata', () => {
  it('memverifikasi host yang di-parse Meta dengan lengkap', async () => {
    const { calls, fetchImpl } = stubFetch({
      'https://another-apex.example/': { status: 200, body: VERIFIED_BODY, appUsage: '{"call_count":10}' },
    });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 0, limit: 10, appToken: 'app-id|app-secret', fetchImpl });
    expect(report.verified).toBe(1);
    expect(report.incomplete).toBe(0);
    expect(report.halted).toBe(false);
    expect(calls[0]?.body).toContain('id=https%3A%2F%2Fanother-apex.example%2F');
    expect(calls[0]?.body).toContain('scrape=true');
    expect(report.results[0]?.appUsage).toBe('{"call_count":10}');
  });

  it('berhenti dan tidak melewati host yang ditolak limit aplikasi', async () => {
    const limitBody = JSON.stringify({ error: { code: 4, message: '(#4) Application request limit reached', type: 'OAuthException' } });
    const { calls, fetchImpl } = stubFetch({
      'https://another-apex.example/': { status: 403, body: limitBody },
    });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 0, limit: 10, appToken: 'app-id|app-secret', fetchImpl });
    expect(report.halted).toBe(true);
    expect(report.rejected).toBe(1);
    expect(report.attempted).toBe(1);
    expect(calls).toHaveLength(1);
    expect(report.nextOffset).toBe(0);
  });

  it('menandai tidak terjangkau saat Meta tidak mengembalikan metadata', async () => {
    const { fetchImpl } = stubFetch({ 'https://another-apex.example/': { status: 200, body: '{}' } });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 0, limit: 10, appToken: 'app-id|app-secret', fetchImpl });
    expect(report.unreachable).toBe(1);
    expect(report.verified).toBe(0);
  });

  it('melaporkan metadata tidak lengkap bila ada field yang kosong', async () => {
    const partial = JSON.stringify({ title: 'Apex - Tagline.', description: '', image: [], site_name: 'Apex' });
    const { fetchImpl } = stubFetch({ 'https://another-apex.example/': { status: 200, body: partial } });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 0, limit: 10, appToken: 'app-id|app-secret', fetchImpl });
    expect(report.verified).toBe(0);
    expect(report.incomplete).toBe(1);
  });

  it('membatasi jumlah panggilan sesuai limit lalu mengembalikan offset lanjutan', async () => {
    const { calls, fetchImpl } = stubFetch({
      'https://another-apex.example/': { status: 200, body: VERIFIED_BODY },
      'https://apex.example/': { status: 200, body: VERIFIED_BODY },
      'https://city.example/': { status: 200, body: VERIFIED_BODY },
    });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 0, limit: 2, appToken: 'app-id|app-secret', fetchImpl });
    expect(calls).toHaveLength(2);
    expect(report.verified).toBe(2);
    expect(report.nextOffset).toBe(2);
  });

  it('memulihkan ke awal daftar setelah host terakhir tersapu', async () => {
    const { fetchImpl } = stubFetch({ 'https://region.example/': { status: 200, body: VERIFIED_BODY } });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 3, limit: 10, appToken: 'app-id|app-secret', fetchImpl });
    expect(report.verified).toBe(1);
    expect(report.nextOffset).toBe(0);
  });

  it('tidak pernah melempar saat jaringan gagal', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network_down');
    });
    const report = await sweepFacebookMetadata({ hosts: HOSTS, offset: 0, limit: 10, appToken: 'app-id|app-secret', fetchImpl });
    expect(report.failed).toBeGreaterThan(0);
    expect(report.halted).toBe(false);
  });
});
