import { describe, expect, it } from 'vitest';

import { HttpsPendingHostnameProbe } from '@/core/hostname/pending-hostname-probe';

describe('HttpsPendingHostnameProbe tanpa jaringan', () => {
  it('menolak hostname invalid sebelum DNS', async () => {
    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('bukan host!!', 'attempt-1')).resolves.toBe(false);
  });

  it('menolak attemptId di luar pola', async () => {
    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('calon.example', 'attempt id spasi')).resolves.toBe(false);
  });

  it('menolak loopback karena bukan unicast publik', async () => {
    const probe = new HttpsPendingHostnameProbe();
    await expect(probe.verifyPendingHostname('localhost', 'attempt-1')).resolves.toBe(false);
  });
});
