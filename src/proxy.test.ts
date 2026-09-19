import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { getControlHosts } from '@/core/config/edge-hosts';
import { config as proxyConfig, proxy } from '@/proxy';

const HOSTS = getControlHosts();

function request(host: string, path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`http://${host}${path}`, { headers: { host, ...headers } });
}

describe('proxy local development', () => {
  it('menulis ulang localhost ke dashboard', () => {
    const response = proxy(request('localhost:3100', '/dashboard'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain('unsafe-eval');
  });

  it('menulis ulang deployment vercel ke dashboard', () => {
    const response = proxy(request('cabang.vercel.app', '/'));
    expect(response.status).toBe(200);
  });
});

describe('proxy host validation', () => {
  it('menolak host invalid sebagai 400', () => {
    expect(proxy(request('-buruk-.example', '/')).status).toBe(400);
    expect(proxy(request('192.168.0.1', '/')).status).toBe(400);
  });

  it('mengalihkan trailing slash ke kanonis 308', () => {
    const response = proxy(request('portal.example', '/tentang/'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toContain('/tentang');
  });

  it('melewatkan slash API dan file', () => {
    expect(proxy(request('portal.example', '/api/x/')).status).not.toBe(308);
    expect(proxy(request('portal.example', '/logo.png/')).status).not.toBe(308);
  });
});

describe('proxy control surfaces', () => {
  it('menolak platform tanpa allowlist sebagai 404', () => {
    const response = proxy(request(HOSTS.dashboard, '/platform/sites'));
    expect(response.status).toBe(404);
  });

  it('menolak token platform tanpa tiket di dashboard', () => {
    const response = proxy(request(HOSTS.dashboard, '/dashboard', { 'x-platform-token': 'abc' }));
    expect(response.status).toBe(404);
  });

  it('menolak API internal di host dashboard', () => {
    expect(proxy(request(HOSTS.dashboard, '/api/network/media/x')).status).toBe(404);
    expect(proxy(request(HOSTS.api, '/dashboard')).status).toBe(404);
    expect(proxy(request(HOSTS.webhook, '/api/v1/commands')).status).toBe(404);
  });

  it('meneruskan path yang sah per host', () => {
    expect(proxy(request(HOSTS.dashboard, '/dashboard')).status).toBe(200);
    expect(proxy(request(HOSTS.api, '/api/v1/commands')).status).toBe(200);
    expect(proxy(request(HOSTS.webhook, '/api/webhooks/telegram')).status).toBe(200);
  });
});

describe('proxy tenant surfaces', () => {
  it('mengalihkan alias kontrol ke padanan tenant', () => {
    const response = proxy(request('portal.example', '/about'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toContain('/tentang');
  });

  it('mengalihkan /docs ke host docs', () => {
    const response = proxy(request('portal.example', '/docs'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toContain(HOSTS.docs);
  });

  it('menolak permukaan kontrol di host tenant', () => {
    expect(proxy(request('portal.example', '/dashboard')).status).toBe(404);
    expect(proxy(request('portal.example', '/api/health')).status).toBe(404);
    expect(proxy(request('portal.example', '/services')).status).toBe(404);
  });

  it('menulis ulang beranda portal ke tenant-home', () => {
    const response = proxy(request('portal.example', '/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toContain('/tenant-home');
  });

  it('meneruskan artikel tenant dan menyematkan korelasi', () => {
    const response = proxy(request('portal.example', '/berita-utama'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });

  it('membuka CSP Mini App Telegram di /tg/app', () => {
    const response = proxy(request(HOSTS.dashboard, '/tg/app'));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-security-policy')).toContain('https://telegram.org');
    expect(response.headers.get('x-frame-options')).toBeNull();
  });

  it('mengunci framing di luar Mini App', () => {
    const response = proxy(request('portal.example', '/berita-utama'));
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).not.toContain('https://telegram.org');
  });

  it('melewatkan rute media melalui matcher edge', () => {
    const matcher = new RegExp(`^${proxyConfig.matcher[0] ?? ''}$`);
    expect(matcher.test('/api/network/media/x')).toBe(true);
    expect(matcher.test('/berita-utama')).toBe(true);
    expect(matcher.test('/api/v1/commands')).toBe(true);
  });

  it('menolak permukaan auth dan Mini App di host tenant', () => {
    expect(proxy(request('portal.example', '/tg/app')).status).toBe(404);
    expect(proxy(request('portal.example', '/api/tg/app/session')).status).toBe(404);
    expect(proxy(request('portal.example', '/sign-up')).status).toBe(404);
    expect(proxy(request('portal.example', '/forgot-password')).status).toBe(404);
    expect(proxy(request('portal.example', '/update-password')).status).toBe(404);
  });

  it('membuka health di host kontrol, menolak di tenant', () => {
    expect(proxy(request(HOSTS.api, '/api/health')).status).toBe(200);
    expect(proxy(request(HOSTS.webhook, '/api/health')).status).toBe(200);
    expect(proxy(request(HOSTS.docs, '/api/health')).status).toBe(200);
    expect(proxy(request('portal.example', '/api/health')).status).toBe(404);
  });

  it('mengarahkan /docs ke host docs dari mana saja', () => {
    const fromTenant = proxy(request('portal.example', '/docs/panduan'));
    expect(fromTenant.status).toBe(308);
    expect(fromTenant.headers.get('location')).toContain(HOSTS.docs);
    const fromApi = proxy(request(HOSTS.api, '/docs'));
    expect(fromApi.status).toBe(308);
    expect(fromApi.headers.get('location')).toContain(HOSTS.docs);
    const onDocs = proxy(request(HOSTS.docs, '/docs/panduan'));
    expect(onDocs.status).toBe(308);
    expect(onDocs.headers.get('location') ?? '').not.toContain('/docs/');
  });

  it('mengizinkan skrip dan bingkai Turnstile serta font invoice', () => {
    const response = proxy(request(HOSTS.dashboard, '/dashboard'));
    const csp = response.headers.get('content-security-policy') ?? '';
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(csp).toContain('frame-src https://challenges.cloudflare.com');
    expect(csp).toContain('https://fonts.googleapis.com');
  });
});
