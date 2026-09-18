import { describe, expect, it } from 'vitest';

import { isSecretEqual, trustedCloudflareSource } from '@/modules/integrations/trusted-request-boundary';

function permintaan(host: string, kepala: Record<string, string> = {}): Request {
  const headers = new Headers(kepala);
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
  const rahasia = 'asal-cloudflare-kuat';

  it('mengembalikan ip asal saat host dan bukti cocok', () => {
    const request = permintaan(host, {
      'x-indicate-cloudflare-origin': rahasia,
      'cf-connecting-ip': '203.0.113.7',
    });
    expect(trustedCloudflareSource(request, host, rahasia)).toBe('203.0.113.7');
  });

  it('menolak host yang tidak sesuai ekspektasi', () => {
    const request = permintaan('asing.example', {
      'x-indicate-cloudflare-origin': rahasia,
      'cf-connecting-ip': '203.0.113.7',
    });
    expect(trustedCloudflareSource(request, host, rahasia)).toBe(null);
  });

  it('menolak bukti origin yang salah atau hilang', () => {
    const salah = permintaan(host, {
      'x-indicate-cloudflare-origin': 'palsu',
      'cf-connecting-ip': '203.0.113.7',
    });
    expect(trustedCloudflareSource(salah, host, rahasia)).toBe(null);
    const hilang = permintaan(host, { 'cf-connecting-ip': '203.0.113.7' });
    expect(trustedCloudflareSource(hilang, host, rahasia)).toBe(null);
  });

  it('menolak ip penghubung yang hilang atau bukan ip', () => {
    const hilang = permintaan(host, { 'x-indicate-cloudflare-origin': rahasia });
    expect(trustedCloudflareSource(hilang, host, rahasia)).toBe(null);
    const bukanIp = permintaan(host, {
      'x-indicate-cloudflare-origin': rahasia,
      'cf-connecting-ip': 'bukan-ip',
    });
    expect(trustedCloudflareSource(bukanIp, host, rahasia)).toBe(null);
  });

  it('menerima ip versi enam yang valid', () => {
    const request = permintaan(host, {
      'x-indicate-cloudflare-origin': rahasia,
      'cf-connecting-ip': '2001:db8::1',
    });
    expect(trustedCloudflareSource(request, host, rahasia)).toBe('2001:db8::1');
  });
});
