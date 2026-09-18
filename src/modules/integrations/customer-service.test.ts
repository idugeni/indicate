import { describe, expect, it, vi } from 'vitest';

import { CustomerService } from '@/modules/integrations/customer-service';
import { IntegrationsAccessDeniedError, IntegrationsConflictError } from '@/modules/integrations/ports';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const ORG = '0199a2b3-4c5d-7e8f-9012-3456789abcde';

const platformActor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  platformPermissionSet: new Set(['platform.super_admin']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const tenantActor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set(['subscription.read']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    listCustomers: vi.fn(async () => [{ id: ORG }]),
    readCustomer: vi.fn(async () => ({ id: ORG })),
    createCustomer: vi.fn(async (_actor: unknown, input: unknown) => input),
    updateCustomer: vi.fn(async (_actor: unknown, input: unknown) => input),
    readSubscription: vi.fn(async () => ({ status: 'active' })),
    updateSubscription: vi.fn(async (_actor: unknown, input: unknown) => input),
    assignFirstAdminMember: vi.fn(async () => ({ userId: 'user-9', roleId: 'role-9' })),
    recordDenial: vi.fn(async () => undefined),
    ...repoOverrides,
  };
  const service = new CustomerService(repository as never, { create: () => ORG }, { now: () => NOW });
  return { repository, service };
}

describe('CustomerService platform guard', () => {
  it('menolak list dari aktor non-platform', async () => {
    const { service, repository } = harness();
    const result = await service.list(tenantActor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.listCustomers).not.toHaveBeenCalled();
  });

  it('mengizinkan list platform dan meneruskan hasil repo', async () => {
    const { service } = harness();
    const result = await service.list(platformActor);
    expect(result.ok).toBe(true);
  });

  it('menolak read yang hilang lewat denial', async () => {
    const { service } = harness({ readCustomer: async () => null });
    const result = await service.read(platformActor, ORG);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('CustomerService create update', () => {
  it('menolak payload create tidak valid', async () => {
    const { service } = harness();
    const result = await service.create(platformActor, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('membuat customer beserta langganan opsional', async () => {
    const { service, repository } = harness();
    const result = await service.create(platformActor, { name: 'Portal A', slug: 'portal-a', subscription: { status: 'active' } });
    expect(result.ok).toBe(true);
    expect(repository.createCustomer).toHaveBeenCalledTimes(1);
  });

  it('memetakan konflik slug ke conflict', async () => {
    const { service } = harness({
      createCustomer: async () => {
        throw new IntegrationsConflictError();
      },
    });
    const result = await service.create(platformActor, { name: 'Portal A', slug: 'portal-a' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });

  it('memetakan akses repo ditolak ke denial', async () => {
    const { service } = harness({
      updateCustomer: async () => {
        throw new IntegrationsAccessDeniedError();
      },
    });
    const result = await service.update(platformActor, { organizationId: ORG, expectedVersion: 1, name: 'Baru', slug: 'baru', status: 'active', customerMetadata: {} });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('CustomerService subscription', () => {
  it('menolak baca langganan dari aktor terkunci region', async () => {
    const { service } = harness();
    const locked = { ...tenantActor, regionScopeId: 'region-1' };
    const result = await service.readSubscription(locked);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('membaca langganan dengan izin baca', async () => {
    const { service } = harness();
    const result = await service.readSubscription(tenantActor);
    expect(result.ok).toBe(true);
  });

  it('menolak update langganan non-platform', async () => {
    const { service } = harness();
    const result = await service.updateSubscription(tenantActor, { organizationId: ORG, status: 'suspended' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menetapkan admin pertama lewat platform', async () => {
    const { service, repository } = harness();
    const result = await service.assignFirstAdmin(platformActor, { organizationId: ORG, userEmail: 'admin@example.test' });
    expect(result.ok).toBe(true);
    expect(repository.assignFirstAdminMember).toHaveBeenCalledTimes(1);
  });
});
