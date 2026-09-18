import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { getControlHosts } from '@/core/config/edge-hosts';
import { proxy } from '@/proxy';

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
});
