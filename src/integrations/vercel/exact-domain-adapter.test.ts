import { describe, expect, it, vi } from 'vitest';

import { VercelExactDomainAdapter, parseRetryAfterSeconds } from '@/integrations/vercel/exact-domain-adapter';

function jsonResponse(body: unknown, status: number, retryAfter: string | null = null): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(retryAfter === null ? {} : { 'retry-after': retryAfter }),
    json: async () => body,
  } as Response;
}

describe('parseRetryAfterSeconds', () => {
  it('memparse detik dan tanggal http', () => {
    expect(parseRetryAfterSeconds('120')).toBe(120);
    expect(parseRetryAfterSeconds(null)).toBe(null);
    expect(parseRetryAfterSeconds('bukan-angka')).toBe(null);
    const future = new Date(Date.now() + 45_000).toUTCString();
    expect(parseRetryAfterSeconds(future)).toBeGreaterThan(0);
  });
});

describe('VercelExactDomainAdapter rate limit', () => {
  it('mencoba ulang 429 beruntun lalu sukses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429, '0'))
      .mockResolvedValueOnce(jsonResponse({}, 429, '0'))
      .mockResolvedValueOnce(jsonResponse({ name: 'uji.example', verified: true }, 200));
    const adapter = new VercelExactDomainAdapter('prj_1', 'team_1', 'token', fetcher as unknown as typeof fetch);
    const result = await adapter.inspectExactDomain('uji.example');
    expect(result.associated).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('gagal cepat untuk 4xx permanen tanpa retry', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 403));
    const adapter = new VercelExactDomainAdapter('prj_1', 'team_1', 'token', fetcher as unknown as typeof fetch);
    await expect(adapter.inspectExactDomain('uji.example')).rejects.toThrow('vercel_unavailable');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('melempar retry_after saat backoff inline terlampaui', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 429, '120'));
    const adapter = new VercelExactDomainAdapter('prj_1', 'team_1', 'token', fetcher as unknown as typeof fetch);
    await expect(adapter.inspectExactDomain('uji.example')).rejects.toThrow('vercel_rate_limited:retry_after_60');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('VercelExactDomainAdapter wildcard certs', () => {
  it('membaca daftar cert dan tantangan order', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes('/v3/certs?limit')) {
        return jsonResponse({ certs: [{ cns: ['*.uji.example'], expiresAt: 123 }, { cns: 'bukan-array' }] }, 200);
      }
      return jsonResponse({ challengesToResolve: [{ domain: '_acme-challenge.uji.example', value: 'tantangan-1' }] }, 200);
    });
    const adapter = new VercelExactDomainAdapter('prj_1', 'team_1', 'token', fetcher as unknown as typeof fetch);
    expect(await adapter.listWildcardCerts()).toEqual([{ cns: ['*.uji.example'], expiresAt: 123 }]);
    expect(await adapter.startWildcardCertOrder(['*.uji.example'])).toEqual([
      { domain: '_acme-challenge.uji.example', value: 'tantangan-1' },
    ]);
    await adapter.finalizeWildcardCertOrder(['*.uji.example']);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
