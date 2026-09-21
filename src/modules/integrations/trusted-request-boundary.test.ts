import { describe, expect, it } from 'vitest';

import { isSecretEqual, trustedCloudflareSource } from '@/modules/integrations/trusted-request-boundary';

function makeRequest(host: string, headerEntries: Record<string, string> = {}): Request {
  const headers = new Headers(headerEntries);
  headers.set('host', host);
  return { headers } as Request;
}

describe('isSecretEqual', () => {
  it('menerima rahasia yang sama persis', () => {
    expect(isSecretEqual('rahasia-kuat', 'rahasia-kuat')).toBe(true);
  });

  it('menolak rahasia berbeda dengan panjang sama', () => {
    expect(isSecretEqual('rahasia-kuat', 'rahasia-lem4h')).toBe(false);
  });

  it('menolak rahasia dengan panjang berbeda', () => {
    expect(isSecretEqual('pendek', 'jauh-lebih-panjang')).toBe(false);
  });

  it('menolak string kosong melawan rahasia terisi', () => {
    expect(isSecretEqual('', 'terisi')).toBe(false);
  });
});

describe('trustedCloudflareSource', () => {
  const host = 'kontrol.example';
  const secret = 'asal-cloudflare-kuat';

  it('mengembalikan ip asal saat host dan bukti cocok', () => {
    const request = makeRequest(host, {
      'x-indicate-cloudflare-origin': secret,
      'cf-connecting-ip': '203.0.113.7',
    });
    expect(trustedCloudflareSource(request, host, secret)).toBe('203.0.113.7');
  });

  it('menolak host yang tidak sesuai ekspektasi', () => {
    const request = makeRequest('asing.example', {
      'x-indicate-cloudflare-origin': secret,
      'cf-connecting-ip': '203.0.113.7',
    });
    expect(trustedCloudflareSource(request, host, secret)).toBe(null);
  });

  it('menolak bukti origin yang salah atau hilang', () => {
    const wrong = makeRequest(host, {
      'x-indicate-cloudflare-origin': 'palsu',
      'cf-connecting-ip': '203.0.113.7',
    });
    expect(trustedCloudflareSource(wrong, host, secret)).toBe(null);
    const missing = makeRequest(host, { 'cf-connecting-ip': '203.0.113.7' });
    expect(trustedCloudflareSource(missing, host, secret)).toBe(null);
  });

  it('menolak ip penghubung yang hilang atau bukan ip', () => {
    const missing = makeRequest(host, { 'x-indicate-cloudflare-origin': secret });
    expect(trustedCloudflareSource(missing, host, secret)).toBe(null);
    const notIp = makeRequest(host, {
      'x-indicate-cloudflare-origin': secret,
      'cf-connecting-ip': 'bukan-ip',
    });
    expect(trustedCloudflareSource(notIp, host, secret)).toBe(null);
  });

  it('menerima ip versi enam yang valid', () => {
    const request = makeRequest(host, {
      'x-indicate-cloudflare-origin': secret,
      'cf-connecting-ip': '2001:db8::1',
    });
    expect(trustedCloudflareSource(request, host, secret)).toBe('2001:db8::1');
  });
});
