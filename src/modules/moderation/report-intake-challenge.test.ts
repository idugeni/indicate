import { describe, expect, it, vi } from 'vitest';

import { enforceReportIntakeChallenge } from '@/modules/moderation/report-intake-challenge';
import { TURNSTILE_TOKEN_HEADER } from '@/core/security/turnstile-contract';
import type { TurnstileVerdict } from '@/core/security/turnstile-verify';

function headers(token?: string): Headers {
  return new Headers(token === undefined ? {} : { [TURNSTILE_TOKEN_HEADER]: token });
}

function verifyReturning(verdict: TurnstileVerdict) {
  return vi.fn(async () => verdict);
}

describe('enforceReportIntakeChallenge', () => {
  it('melewati intake tanpa secret karena challenge belum dikonfigurasi', async () => {
    const verify = verifyReturning({ outcome: 'verified' });
    const gate = await enforceReportIntakeChallenge({ secret: null, headers: headers(), clientIp: null, verify });
    expect(gate).toEqual({ allowed: true, enforced: false });
    expect(verify).not.toHaveBeenCalled();
  });

  it('melewati intake saat secret hanya spasi', async () => {
    const verify = verifyReturning({ outcome: 'verified' });
    const gate = await enforceReportIntakeChallenge({ secret: '   ', headers: headers(), clientIp: null, verify });
    expect(gate).toEqual({ allowed: true, enforced: false });
    expect(verify).not.toHaveBeenCalled();
  });

  it('meneruskan token header dan remoteip ke pemeriksa', async () => {
    const verify = verifyReturning({ outcome: 'verified' });
    const gate = await enforceReportIntakeChallenge({ secret: 'secret-uji', headers: headers('token-uji'), clientIp: '203.0.113.9', verify });
    expect(gate).toEqual({ allowed: true, enforced: true });
    expect(verify).toHaveBeenCalledWith({ secret: 'secret-uji', token: 'token-uji', remoteIp: '203.0.113.9' });
  });

  it('menolak dengan 403 saat token ditolak, termasuk yang tidak ada', async () => {
    for (const verdict of [
      { outcome: 'rejected', reason: 'token_invalid' },
      { outcome: 'rejected', reason: 'token_expired_or_replayed' },
      { outcome: 'rejected', reason: 'token_missing' },
    ] as const) {
      const gate = await enforceReportIntakeChallenge({ secret: 'secret-uji', headers: headers(), clientIp: null, verify: verifyReturning(verdict) });
      expect(gate).toEqual({ allowed: false, enforced: true, denial: { outcome: 'rejected', status: 403 } });
    }
  });

  it('menolak dengan 503 saat verifikasi tidak dapat dipercaya', async () => {
    const gate = await enforceReportIntakeChallenge({ secret: 'secret-uji', headers: headers('token-uji'), clientIp: null, verify: verifyReturning({ outcome: 'unavailable' }) });
    expect(gate).toEqual({ allowed: false, enforced: true, denial: { outcome: 'unavailable', status: 503 } });
  });

  it('menerima tanpa enforced ketika pemeriksa melaporkan tidak terverifikasi', async () => {
    const gate = await enforceReportIntakeChallenge({ secret: 'secret-uji', headers: headers('token-uji'), clientIp: null, verify: verifyReturning({ outcome: 'unverified' }) });
    expect(gate).toEqual({ allowed: true, enforced: false });
  });
});
