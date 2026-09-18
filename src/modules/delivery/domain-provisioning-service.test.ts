import { describe, expect, it, vi } from 'vitest';

import { DomainProvisioningService } from '@/modules/delivery/domain-provisioning-service';

const NOW = new Date('2026-09-18T14:00:00.000Z');

const attempt = (overrides: Record<string, unknown> = {}) => ({
  id: 'attempt-1',
  organizationId: 'org-1',
  siteId: 'site-1',
  hostname: 'wonosobo.fakta01.my.id',
  previousHostname: null,
  operation: 'deactivate',
  activationState: 'deactivating',
  status: 'pending',
  attempts: 0,
  nextAttemptAt: NOW.toISOString(),
  claimToken: null,
  claimExpiresAt: null,
  externalStatus: {},
  ...overrides,
});

function harness(options: { readonly claims?: readonly Record<string, unknown>[]; readonly removeFails?: boolean } = {}) {
  const repository = {
    claimActivationAttempts: vi.fn(async () => options.claims ?? []),
    completeDeactivation: vi.fn(async () => undefined),
    failActivation: vi.fn(async () => undefined),
    beginActivation: vi.fn(),
    updateActivation: vi.fn(),
    completeActivation: vi.fn(),
    deactivateSite: vi.fn(),
  };
  const cloudflare = { verifyDomainZone: vi.fn(), ensureExactVerificationTxt: vi.fn(), removeExactVerificationTxt: vi.fn() };
  const vercel = {
    associateExactDomain: vi.fn(),
    verifyExactDomain: vi.fn(),
    removeExactDomain: vi.fn(async () => {
      if (options.removeFails === true) throw new Error('vercel down');
    }),
  };
  const probe = { verifyPendingHostname: vi.fn() };
  const service = new DomainProvisioningService(
    repository as never,
    cloudflare as never,
    vercel as never,
    probe as never,
    new Set(['dashboard.example']),
    { resolve: vi.fn(async () => null) } as never,
  );
  return { repository, vercel, service };
}

describe('DomainProvisioningService reconcile', () => {
  it('kosong saat tidak ada klaim', async () => {
    const { service, repository } = harness();
    await expect(service.reconcile(NOW)).resolves.toEqual({ completed: 0, failed: 0 });
    expect(repository.claimActivationAttempts).toHaveBeenCalledTimes(1);
  });

  it('menyelesaikan deaktivasi dan menghitung completed', async () => {
    const { service, repository, vercel } = harness({ claims: [attempt()] });
    await expect(service.reconcile(NOW)).resolves.toEqual({ completed: 1, failed: 0 });
    expect(vercel.removeExactDomain).toHaveBeenCalledWith('wonosobo.fakta01.my.id');
    expect(repository.completeDeactivation).toHaveBeenCalledTimes(1);
  });

  it('menghitung failed dan menjadwalkan retry saat provider gagal', async () => {
    const { service, repository } = harness({ claims: [attempt()], removeFails: true });
    await expect(service.reconcile(NOW)).resolves.toEqual({ completed: 0, failed: 1 });
    expect(repository.failActivation).toHaveBeenCalledTimes(1);
  });
});

describe('DomainProvisioningService guards', () => {
  it('menolak aktivasi dari aktor terkunci region', async () => {
    const { service } = harness();
    const locked = {
      actorType: 'user',
      actorId: 'user-1',
      organizationId: 'org-1',
      permissionSet: new Set<string>(),
      regionScopeId: 'region-1',
      entryPoint: 'dashboard',
      requestId: 'req-1',
      verifiedAuthUserId: 'auth-1',
    } as const;
    await expect(service.activate(locked, 'site-1', 'baru.fakta01.my.id', NOW)).rejects.toThrow();
  });

  it('menolak resume dengan operasi yang salah', async () => {
    const { service } = harness();
    const actor = {
      actorType: 'system',
      actorId: 'delivery:attempt-1',
      organizationId: 'org-1',
      permissionSet: new Set(['sites.manage']),
      entryPoint: 'reconciler',
      requestId: 'req-1',
    } as const;
    await expect(service.resume(actor, attempt({ operation: 'deactivate' }) as never, NOW)).rejects.toThrow(
      'CONFIGURATION_INVALID',
    );
    await expect(service.resumeDeactivation(actor, attempt({ activationState: 'pending' }) as never, NOW)).rejects.toThrow(
      'CONFIGURATION_INVALID',
    );
  });
});
