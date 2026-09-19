import { describe, expect, it, vi } from 'vitest';

import { BillingService } from '@/modules/billing/billing-service';
import { BillingAccessDeniedError, BillingConflictError } from '@/modules/billing/ports';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const NOW = new Date('2026-09-18T14:00:00.000Z');
const HASH = 'a'.repeat(64);

const userActor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const platformActor = { ...userActor, platformPermissionSet: new Set(['platform.super_admin']) };
const systemActor = {
  actorType: 'system',
  actorId: 'worker-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'worker',
  requestId: 'req-1',
} as const;

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    readSubscriptionState: vi.fn(async () => 'active'),
    createInvitation: vi.fn(async () => 'invite-1'),
    redeemInvitation: vi.fn(async () => 'org-9'),
    listInvoices: vi.fn(async () => [{ id: 'inv-1' }]),
    createInvoice: vi.fn(async (_actor: unknown, input: unknown) => ({ id: 'inv-1', ...(input as object) })),
    voidInvoice: vi.fn(async () => ({ id: 'inv-1', status: 'void' })),
    reissueInvoice: vi.fn(async () => ({ id: 'inv-2', status: 'paid' })),
    issueInvoice: vi.fn(async (_actor: unknown, input: unknown) => ({ id: 'inv-3', status: 'unpaid', ...(input as object) })),
    payInvoice: vi.fn(async (_actor: unknown, input: unknown) => ({ id: 'inv-3', status: 'paid', ...(input as object) })),
    ...repoOverrides,
  };
  const service = new BillingService(repository as never, { now: () => NOW });
  return { repository, service };
}

describe('BillingService subscription state', () => {
  it('menolak aktor non-user', async () => {
    const { service } = harness();
    const result = await service.subscriptionState(systemActor, 'org-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('meneruskan status langganan repo', async () => {
    const { service } = harness();
    const result = await service.subscriptionState(userActor, 'org-1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.state).toBe('active');
  });

  it('memetakan konflik ke conflict', async () => {
    const { service } = harness({
      readSubscriptionState: async () => {
        throw new BillingConflictError();
      },
    });
    const result = await service.subscriptionState(userActor, 'org-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('CONFLICT');
  });
});

describe('BillingService invitations', () => {
  it('membuat undangan platform dengan field valid', async () => {
    const { service, repository } = harness();
    const result = await service.createInvitation(platformActor, { orgId: ID, roleId: ID, email: 'a@example.test', tokenHash: HASH });
    expect(result.ok).toBe(true);
    expect(repository.createInvitation).toHaveBeenCalledTimes(1);
  });

  it('menolak undangan dari non-platform', async () => {
    const { service } = harness();
    const result = await service.createInvitation(userActor, { orgId: ID, roleId: ID, email: 'a@example.test', tokenHash: HASH });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menghitung hash undangan deterministik case-insensitive', async () => {
    const lower = await BillingService.invitationTokenHash('org-1', 'A@Example.Test', 's3cret');
    const upper = await BillingService.invitationTokenHash('org-1', 'a@example.test', 's3cret');
    expect(lower).toBe(upper);
    expect(lower).toMatch(/^[a-f0-9]{64}$/);
  });

  it('menukarkan undangan dan memetakan akses ditolak', async () => {
    const okHarness = harness();
    const redeemed = await okHarness.service.redeemInvitation(userActor, { tokenHash: HASH });
    expect(redeemed.ok).toBe(true);

    const deniedHarness = harness({
      redeemInvitation: async () => {
        throw new BillingAccessDeniedError();
      },
    });
    const denied = await deniedHarness.service.redeemInvitation(userActor, { tokenHash: HASH });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('expected error');
    expect(denied.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('BillingService invoices', () => {
  const invoice = { organizationId: ID, amountIdr: 550_000, paidAt: '2026-09-18T14:00:00.000Z' };

  it('membuat invoice platform dan menolak payload rusak', async () => {
    const { service, repository } = harness();
    const created = await service.createInvoice(platformActor, invoice);
    expect(created.ok).toBe(true);
    expect(repository.createInvoice).toHaveBeenCalledTimes(1);

    const broken = await service.createInvoice(platformActor, { ...invoice, amountIdr: -1 });
    expect(broken.ok).toBe(false);
    if (broken.ok) throw new Error('expected error');
    expect(broken.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak invoice dari non-platform', async () => {
    const { service } = harness();
    const result = await service.createInvoice(userActor, invoice);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('membatalkan invoice dan membaca detail', async () => {
    const { service } = harness();
    const voided = await service.voidInvoice(platformActor, { invoiceId: ID, expectedVersion: 1, reason: 'Duplikat' });
    expect(voided.ok).toBe(true);

    const detail = await service.invoiceDetail(userActor, 'org-1', 'inv-1');
    expect(detail.ok).toBe(true);

    const missing = await service.invoiceDetail(userActor, 'org-1', 'nope');
    expect(missing.ok).toBe(false);
    if (missing.ok) throw new Error('expected error');
    expect(missing.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menerbitkan ulang invoice void dan menolak payload rusak', async () => {
    const { service, repository } = harness();
    const reissued = await service.reissueInvoice(platformActor, { invoiceId: ID, expectedVersion: 2, reason: 'koreksi nomor' });
    expect(reissued.ok).toBe(true);
    expect(repository.reissueInvoice).toHaveBeenCalledTimes(1);

    const broken = await service.reissueInvoice(platformActor, { invoiceId: 'bukan-uuid', expectedVersion: 2 });
    expect(broken.ok).toBe(false);
    if (broken.ok) throw new Error('expected error');
    expect(broken.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak terbitkan ulang dari non-platform', async () => {
    const { service } = harness();
    const result = await service.reissueInvoice(userActor, { invoiceId: ID, expectedVersion: 2 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('BillingService tagihan unpaid', () => {
  it('menerbitkan tagihan unpaid dengan jatuh tempo', async () => {
    const { service, repository } = harness();
    const issued = await service.issueInvoice(platformActor, { organizationId: ID, amountIdr: 550000, dueAt: '2026-10-20T00:00:00.000Z' });
    expect(issued.ok).toBe(true);
    expect(repository.issueInvoice).toHaveBeenCalledTimes(1);

    const broken = await service.issueInvoice(platformActor, { organizationId: ID, amountIdr: 550000, dueAt: 'bukan-tanggal' });
    expect(broken.ok).toBe(false);
    if (broken.ok) throw new Error('expected error');
    expect(broken.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak terbitkan tagihan dari non-platform', async () => {
    const { service } = harness();
    const result = await service.issueInvoice(userActor, { organizationId: ID, amountIdr: 550000, dueAt: '2026-10-20T00:00:00.000Z' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('melunasi tagihan unpaid dan menolak versi basi', async () => {
    const { service, repository } = harness({
      payInvoice: vi.fn(async () => {
        throw new BillingConflictError();
      }),
    });
    const paid = await service.payInvoice(platformActor, { invoiceId: ID, expectedVersion: 1, paidAt: '2026-09-20T00:00:00.000Z' });
    expect(paid.ok).toBe(false);
    if (paid.ok) throw new Error('expected error');
    expect(paid.error.error.code).toBe('CONFLICT');
    expect(repository.payInvoice).toHaveBeenCalledTimes(1);
  });
});
