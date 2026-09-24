import { describe, expect, it } from 'vitest';

import { HttpsPendingHostnameProbe, isPublicUnicastIp } from '@/core/hostname/pending-hostname-probe';

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

describe('isPublicUnicastIp', () => {
  it('menolak IPv4-mapped IPv6 privat', () => {
    expect(isPublicUnicastIp('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicUnicastIp('::ffff:10.0.0.1')).toBe(false);
    expect(isPublicUnicastIp('::ffff:192.168.1.1')).toBe(false);
    expect(isPublicUnicastIp('::FFFF:8.8.8.8')).toBe(true);
  });

  it('menolak CGNAT 100.64/10 dan meloloskan di luarnya', () => {
    expect(isPublicUnicastIp('100.64.0.1')).toBe(false);
    expect(isPublicUnicastIp('100.127.255.255')).toBe(false);
    expect(isPublicUnicastIp('100.128.0.1')).toBe(true);
    expect(isPublicUnicastIp('::ffff:100.64.0.1')).toBe(false);
  });
});
