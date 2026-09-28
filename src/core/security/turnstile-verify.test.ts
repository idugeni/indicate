import { describe, expect, it, vi } from 'vitest';

import { TURNSTILE_SITEVERIFY_URL, verifyTurnstileToken } from '@/core/security/turnstile-verify';

function siteverify(body: unknown, init: { readonly ok?: boolean } = {}): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: init.ok === false ? 502 : 200 })) as unknown as typeof fetch;
}

function lastRequest(transport: typeof fetch): { readonly url: string; readonly init: RequestInit } {
  const [url, init] = (transport as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
  return { url, init };
}

describe('verifyTurnstileToken', () => {
  it('tidak memverifikasi tanpa secret karena proteksi belum diprovisioning', async () => {
    const transport = siteverify({ success: true });
    const verdict = await verifyTurnstileToken({ secret: null, token: 'token-uji', fetchImpl: transport });
    expect(verdict).toEqual({ outcome: 'unverified' });
    expect(transport).not.toHaveBeenCalled();
  });

  it('menolak token kosong tanpa menyentuh jaringan', async () => {
    const transport = siteverify({ success: true });
    const verdict = await verifyTurnstileToken({ secret: 'secret-uji', token: '   ', fetchImpl: transport });
    expect(verdict).toEqual({ outcome: 'rejected', reason: 'token_missing' });
    expect(transport).not.toHaveBeenCalled();
  });

  it('menolak token kepanjangan tanpa menyentuh jaringan', async () => {
    const transport = siteverify({ success: true });
    const verdict = await verifyTurnstileToken({ secret: 'secret-uji', token: 'x'.repeat(2049), fetchImpl: transport });
    expect(verdict).toEqual({ outcome: 'rejected', reason: 'token_oversized' });
    expect(transport).not.toHaveBeenCalled();
  });

  it('meneruskan secret, token, dan remoteip ke siteverify', async () => {
    const transport = siteverify({ success: true, 'error-codes': [] });
    const verdict = await verifyTurnstileToken({ secret: 'secret-uji', token: 'token-uji', remoteIp: '203.0.113.9', fetchImpl: transport });
    expect(verdict).toEqual({ outcome: 'verified' });
    const request = lastRequest(transport);
    expect(request.url).toBe(TURNSTILE_SITEVERIFY_URL);
    expect(request.init.method).toBe('POST');
    expect(JSON.parse(String(request.init.body))).toEqual({ secret: 'secret-uji', response: 'token-uji', remoteip: '203.0.113.9' });
  });

  it('menghapus remoteip saat tepi tidak memberi alamat', async () => {
    const transport = siteverify({ success: true });
    await verifyTurnstileToken({ secret: 'secret-uji', token: 'token-uji', remoteIp: null, fetchImpl: transport });
    expect(JSON.parse(String(lastRequest(transport).init.body))).toEqual({ secret: 'secret-uji', response: 'token-uji' });
  });

  it('membedakan token tidak sah dengan token yang sudah dipakai', async () => {
    const invalid = await verifyTurnstileToken({
      secret: 'secret-uji',
      token: 'token-uji',
      fetchImpl: siteverify({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    expect(invalid).toEqual({ outcome: 'rejected', reason: 'token_invalid' });
    const replayed = await verifyTurnstileToken({
      secret: 'secret-uji',
      token: 'token-uji',
      fetchImpl: siteverify({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    });
    expect(replayed).toEqual({ outcome: 'rejected', reason: 'token_expired_or_replayed' });
  });

  it('menggagal tertutup saat cloudflare yang bermasalah, bukan membiarkan lolos', async () => {
    const serverSideCode = await verifyTurnstileToken({
      secret: 'secret-uji',
      token: 'token-uji',
      fetchImpl: siteverify({ success: false, 'error-codes': ['internal-error'] }),
    });
    expect(serverSideCode).toEqual({ outcome: 'unavailable' });
    const unreachable = await verifyTurnstileToken({
      secret: 'secret-uji',
      token: 'token-uji',
      fetchImpl: vi.fn(async () => {
        throw new Error('socket closed');
      }) as unknown as typeof fetch,
    });
    expect(unreachable).toEqual({ outcome: 'unavailable' });
    const badStatus = await verifyTurnstileToken({ secret: 'secret-uji', token: 'token-uji', fetchImpl: siteverify({}, { ok: false }) });
    expect(badStatus).toEqual({ outcome: 'unavailable' });
  });

  it('menolak payload yang tidak punya penentu success', async () => {
    const transport = vi.fn(async () => new Response('bukan json', { status: 200 })) as unknown as typeof fetch;
    expect(await verifyTurnstileToken({ secret: 'secret-uji', token: 'token-uji', fetchImpl: transport })).toEqual({ outcome: 'unavailable' });
    const withoutFlag = await verifyTurnstileToken({ secret: 'secret-uji', token: 'token-uji', fetchImpl: siteverify({ 'error-codes': [] }) });
    expect(withoutFlag).toEqual({ outcome: 'unavailable' });
  });
});
