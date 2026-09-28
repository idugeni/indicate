import { describe, expect, it, vi } from 'vitest';

import { enforceReportIntakeChallenge, reportChallengeSecret } from '@/modules/moderation/report-intake-challenge';
import { TURNSTILE_SITEKEY_HEADER, TURNSTILE_TOKEN_HEADER } from '@/core/security/turnstile-contract';
import type { TurnstileVerdict } from '@/core/security/turnstile-verify';

const WIDGET = '0x4AAAAAAFHN_lpLqmLytOD5';
const OTHER_WIDGET = '0x4AAAAAAFHOAAQPpr6CqLFW';
const SECRETS = new Map([
  [WIDGET, 'secret-widget-satu'],
  [OTHER_WIDGET, 'secret-widget-dua'],
]);

function headers(entry: { readonly token?: string; readonly sitekey?: string } = {}): Headers {
  return new Headers({
    ...(entry.token === undefined ? {} : { [TURNSTILE_TOKEN_HEADER]: entry.token }),
    ...(entry.sitekey === undefined ? {} : { [TURNSTILE_SITEKEY_HEADER]: entry.sitekey }),
  });
}

function verifyReturning(verdict: TurnstileVerdict) {
  return vi.fn(async () => verdict);
}

describe('reportChallengeSecret', () => {
  it('memilih secret milik widget tenant, bukan milik widget lain', () => {
    expect(reportChallengeSecret({ sitekey: WIDGET, secrets: SECRETS })).toBe('secret-widget-satu');
    expect(reportChallengeSecret({ sitekey: OTHER_WIDGET, secrets: SECRETS })).toBe('secret-widget-dua');
  });

  it('melewati tenant tanpa widget atau tanpa secret Terpasang', () => {
    expect(reportChallengeSecret({ sitekey: null, secrets: SECRETS })).toBe(null);
    expect(reportChallengeSecret({ sitekey: '0x4AAAAAAFHOAa0mgne_23xm', secrets: SECRETS })).toBe(null);
  });
});

describe('enforceReportIntakeChallenge', () => {
  it('melewati intake untuk tenant tanpa widget tanpa memanggil jaringan', async () => {
    const verify = verifyReturning({ outcome: 'verified' });
    const gate = await enforceReportIntakeChallenge({ sitekey: null, secrets: SECRETS, headers: headers(), clientIp: null, verify });
    expect(gate).toEqual({ allowed: true, enforced: false });
    expect(verify).not.toHaveBeenCalled();
  });

  it('melewati intake saat secret widget belum diprovisioning', async () => {
    const verify = verifyReturning({ outcome: 'verified' });
    const gate = await enforceReportIntakeChallenge({ sitekey: '0x4AAAAAAFHOAa0mgne_23xm', secrets: SECRETS, headers: headers(), clientIp: null, verify });
    expect(gate).toEqual({ allowed: true, enforced: false });
    expect(verify).not.toHaveBeenCalled();
  });

  it('meneruskan secret widget tenant dan token header ke pemeriksa', async () => {
    const verify = verifyReturning({ outcome: 'verified' });
    const gate = await enforceReportIntakeChallenge({
      sitekey: WIDGET,
      secrets: SECRETS,
      headers: headers({ token: 'token-uji' }),
      clientIp: '203.0.113.9',
      verify,
    });
    expect(gate).toEqual({ allowed: true, enforced: true });
    expect(verify).toHaveBeenCalledWith({ secret: 'secret-widget-satu', token: 'token-uji', remoteIp: '203.0.113.9' });
  });

  it('menolak dengan 403 saat token ditolak, termasuk yang tidak ada', async () => {
    for (const verdict of [
      { outcome: 'rejected', reason: 'token_invalid' },
      { outcome: 'rejected', reason: 'token_expired_or_replayed' },
      { outcome: 'rejected', reason: 'token_missing' },
    ] as const) {
      const gate = await enforceReportIntakeChallenge({ sitekey: WIDGET, secrets: SECRETS, headers: headers(), clientIp: null, verify: verifyReturning(verdict) });
      expect(gate).toEqual({ allowed: false, enforced: true, denial: { outcome: 'rejected', status: 403 } });
    }
  });

  it('menolak dengan 503 saat verifikasi tidak dapat dipercaya', async () => {
    const gate = await enforceReportIntakeChallenge({ sitekey: WIDGET, secrets: SECRETS, headers: headers({ token: 'token-uji' }), clientIp: null, verify: verifyReturning({ outcome: 'unavailable' }) });
    expect(gate).toEqual({ allowed: false, enforced: true, denial: { outcome: 'unavailable', status: 503 } });
  });

  it('menerima tanpa enforced ketika pemeriksa melaporkan tidak terverifikasi', async () => {
    const gate = await enforceReportIntakeChallenge({ sitekey: WIDGET, secrets: SECRETS, headers: headers({ token: 'token-uji' }), clientIp: null, verify: verifyReturning({ outcome: 'unverified' }) });
    expect(gate).toEqual({ allowed: true, enforced: false });
  });
});
