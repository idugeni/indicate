import { describe, expect, it, vi } from 'vitest';

import { CertificateRenewalService } from '@/modules/delivery/certificate-renewal-service';

const DAY = 24 * 60 * 60 * 1000;

function harness(certs: readonly { cns: readonly string[]; expiresAt: number }[]) {
  const vercel = {
    listWildcardCerts: vi.fn(async () => certs),
    startWildcardCertOrder: vi.fn(async () => [{ domain: '_acme-challenge.uji.example', value: 'tantangan-1' }]),
    finalizeWildcardCertOrder: vi.fn(async () => undefined),
  };
  const cloudflare = { ensureExactVerificationTxt: vi.fn(async () => undefined) };
  const service = new CertificateRenewalService(
    vercel as never,
    cloudflare as never,
    30 * DAY,
    0,
    async () => undefined,
    () => 0,
  );
  return { vercel, cloudflare, service };
}

describe('CertificateRenewalService', () => {
  it('memperbarui cert yang kedaluwarsa kurang dari 30 hari', async () => {
    const { service, vercel, cloudflare } = harness([{ cns: ['*.uji.example'], expiresAt: 29 * DAY }]);
    const outcomes = await service.renewDue();
    expect(outcomes).toEqual([{ apex: 'uji.example', renewed: true, reason: 'issued' }]);
    expect(cloudflare.ensureExactVerificationTxt).toHaveBeenCalledWith(
      'uji.example',
      '_acme-challenge.uji.example',
      'tantangan-1',
    );
    expect(vercel.finalizeWildcardCertOrder).toHaveBeenCalledWith(['*.uji.example']);
  });

  it('melewati cert yang masih lama dan membatasi per run', async () => {
    const fresh = { cns: ['*.segar.example'], expiresAt: 80 * DAY };
    const due = (name: string) => ({ cns: [`*.${name}`], expiresAt: 5 * DAY });
    const { service, vercel } = harness([fresh, due('a.example'), due('b.example')]);
    const outcomes = await service.renewDue(1);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.apex).toBe('a.example');
    expect(vercel.startWildcardCertOrder).toHaveBeenCalledTimes(1);
  });

  it('mencatat gagal tanpa menghentikan antrean', async () => {
    const vercel = {
      listWildcardCerts: vi.fn(async () => [{ cns: ['*.gagal.example'], expiresAt: 5 * DAY }]),
      startWildcardCertOrder: vi.fn(async () => { throw new Error('vercel_rate_limited:retry_after_60'); }),
      finalizeWildcardCertOrder: vi.fn(),
    };
    const service = new CertificateRenewalService(vercel as never, { ensureExactVerificationTxt: vi.fn() } as never, 30 * DAY, 0, async () => undefined, () => 0);
    const outcomes = await service.renewDue();
    expect(outcomes[0]?.renewed).toBe(false);
    expect(outcomes[0]?.reason).toContain('vercel_rate_limited');
  });
});
