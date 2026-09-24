import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { getControlHosts } from '@/core/config/edge-hosts';
import { config as proxyConfig, proxy } from '@/proxy';

const HOSTS = getControlHosts();

function request(host: string, path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://${host}${path}`, { headers: { host, ...headers } });
}

describe('proxy local development', () => {
  it('menulis ulang localhost ke dashboard', async () => {
    const response = await proxy(request('localhost:3100', '/dashboard'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain('unsafe-eval');
  });

  it('menulis ulang deployment vercel ke dashboard', async () => {
    const response = await proxy(request('cabang.vercel.app', '/'));
    expect(response.status).toBe(200);
  });
});

describe('proxy host validation', () => {
  it('menolak host invalid sebagai 400', async () => {
    expect((await proxy(request('-buruk-.example', '/'))).status).toBe(400);
    expect((await proxy(request('192.168.0.1', '/'))).status).toBe(400);
  });

  it('mengalihkan trailing slash ke kanonis 308', async () => {
    const response = await proxy(request('portal.example', '/tentang/'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toContain('/tentang');
  });

  it('melewatkan slash API dan file', async () => {
    expect((await proxy(request('portal.example', '/api/x/'))).status).not.toBe(308);
    expect((await proxy(request('portal.example', '/logo.png/'))).status).not.toBe(308);
  });
});

describe('proxy control surfaces', () => {
  it('menolak platform tanpa allowlist sebagai 404', async () => {
    const response = await proxy(request(HOSTS.dashboard, '/platform/sites'));
    expect(response.status).toBe(404);
  });

  it('menolak token platform tanpa tiket di dashboard', async () => {
    const response = await proxy(request(HOSTS.dashboard, '/dashboard', { 'x-platform-token': 'abc' }));
    expect(response.status).toBe(404);
  });

  it('menolak API internal di host dashboard', async () => {
    expect((await proxy(request(HOSTS.dashboard, '/api/network/media/x'))).status).toBe(404);
    expect((await proxy(request(HOSTS.api, '/dashboard'))).status).toBe(404);
    expect((await proxy(request(HOSTS.webhook, '/api/v1/commands'))).status).toBe(404);
  });

  it('meneruskan path yang sah per host', async () => {
    expect((await proxy(request(HOSTS.dashboard, '/dashboard'))).status).toBe(200);
    expect((await proxy(request(HOSTS.api, '/api/v1/commands'))).status).toBe(200);
    expect((await proxy(request(HOSTS.webhook, '/api/webhooks/resend'))).status).toBe(200);
  });
});

describe('proxy tenant surfaces', () => {
  it('mengalihkan alias kontrol ke padanan tenant', async () => {
    const response = await proxy(request('portal.example', '/about'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toContain('/tentang');
  });

  it('menolak /docs yang sudah dihapus', async () => {
    expect((await proxy(request('portal.example', '/docs'))).status).toBe(404);
    expect((await proxy(request(HOSTS.dashboard, '/docs'))).status).toBe(404);
  });

  it('menolak permukaan kontrol di host tenant', async () => {
    expect((await proxy(request('portal.example', '/dashboard'))).status).toBe(404);
    expect((await proxy(request('portal.example', '/api/health'))).status).toBe(404);
    expect((await proxy(request('portal.example', '/services'))).status).toBe(404);
  });

  it('menulis ulang beranda portal ke tenant-home', async () => {
    const response = await proxy(request('portal.example', '/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toContain('/tenant-home');
  });

  it('meneruskan artikel tenant dan menyematkan korelasi', async () => {
    const response = await proxy(request('portal.example', '/berita-utama'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });

  it('mengunci framing di semua permukaan', async () => {
    const response = await proxy(request('portal.example', '/berita-utama'));
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
  });

  it('melewatkan rute media melalui matcher edge', async () => {
    const matcher = new RegExp(`^${proxyConfig.matcher[0] ?? ''}$`);
    expect(matcher.test('/api/network/media/x')).toBe(true);
    expect(matcher.test('/berita-utama')).toBe(true);
    expect(matcher.test('/api/v1/commands')).toBe(true);
  });

  it('menolak permukaan auth di host tenant', async () => {
    expect((await proxy(request('portal.example', '/sign-up'))).status).toBe(404);
    expect((await proxy(request('portal.example', '/forgot-password'))).status).toBe(404);
    expect((await proxy(request('portal.example', '/update-password'))).status).toBe(404);
  });

  it('menolak host docs lama sebagai unknown', async () => {
    const root = await proxy(request('docs.indicate.web.id', '/'));
    expect(root.status).toBe(200);
    expect(root.headers.get('x-middleware-rewrite')).toContain('/tenant-home');
    expect((await proxy(request('docs.indicate.web.id', '/sign-in'))).status).toBe(404);
  });

  it('membuka health di host kontrol, menolak di tenant', async () => {
    expect((await proxy(request(HOSTS.api, '/api/health'))).status).toBe(200);
    expect((await proxy(request(HOSTS.webhook, '/api/health'))).status).toBe(200);
    expect((await proxy(request('portal.example', '/api/health'))).status).toBe(404);
  });

  it('menolak /docs dari mana saja', async () => {
    expect((await proxy(request('portal.example', '/docs/panduan'))).status).toBe(404);
    expect((await proxy(request(HOSTS.api, '/docs'))).status).toBe(404);
    expect((await proxy(request('docs.indicate.web.id', '/docs/panduan'))).status).toBe(404);
  });

  it('mengizinkan skrip dan bingkai Turnstile serta font invoice', async () => {
    const response = await proxy(request(HOSTS.dashboard, '/dashboard'));
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(csp).toContain('frame-src https://challenges.cloudflare.com');
    expect(csp).toContain('https://fonts.googleapis.com');
  });

  it('gagal-terbuka saat refresh sesi tak terjangkau', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:1';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'kunci-uji';
    try {
      const response = await proxy(request(HOSTS.dashboard, '/dashboard'));
      expect(response.status).toBe(200);
    } finally {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    }
  });
});

describe('proxy cache-control', () => {
  it('rewrite beranda tenant membawa header CDN publik', async () => {
    const response = await proxy(request('portal.example', '/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  });

  it('denial dan auth tetap private no-store', async () => {
    for (const path of ['/dashboard', '/api/health', '/sign-in', '/sign-up']) {
      const response = await proxy(request('portal.example', path));
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toContain('private, no-store');
    }
    const invalid = await proxy(request('-buruk-.example', '/'));
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get('cache-control')).toContain('private, no-store');
  });
});
