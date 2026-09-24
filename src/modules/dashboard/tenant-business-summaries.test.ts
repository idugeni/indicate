import { describe, expect, it, vi } from 'vitest';

import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { DashboardAccessDeniedError } from '@/modules/dashboard/ports';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const ALL = new Set(Object.values(DASHBOARD_PERMISSIONS));

const actor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: ALL,
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const tenantState = {
  organizationName: 'Org Redaksi',
  domains: [],
  regions: [],
  sites: [],
  siteSettings: [],
  roles: [],
  memberships: [],
};

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    dashboardCounts: vi.fn(async () => ({ activeSites: 2 })),
    analyticsSummary: vi.fn(async () => ({ articlesByRegion: [] })),
    auditLogPage: vi.fn(async () => [{ id: 'log-1' }]),
    retentionRuns: vi.fn(async () => []),
    operationsSummary: vi.fn(async () => ({ pending: 0 })),
    read: vi.fn(async () => tenantState),
    activationAttempts: vi.fn(async () => []),
    listInvitations: vi.fn(async () => []),
    recordDenied: vi.fn(async () => undefined),
    execute: vi.fn(),
    ...repoOverrides,
  };
  const service = new TenantBusinessService(repository as never, { create: () => 'id-1' }, { now: () => NOW });
  return { repository, service };
}

describe('TenantBusinessService read summaries', () => {
  it('membaca dashboard, analitik, audit, dan operasional', async () => {
    const { service, repository } = harness();
    await expect(service.dashboard(actor)).resolves.toMatchObject({ ok: true });
    await expect(service.analytics(actor, {})).resolves.toMatchObject({ ok: true });
    const audit = await service.auditLogs(actor, {});
    expect(audit.ok).toBe(true);
    if (!audit.ok) throw new Error('expected ok');
    expect(audit.value.auditLogs).toHaveLength(1);
    await expect(service.operations(actor)).resolves.toMatchObject({ ok: true });
    expect(repository.dashboardCounts).toHaveBeenCalledTimes(1);
  });

  it('menolak filter analitik dan audit yang rusak', async () => {
    const { service } = harness();
    const analytics = await service.analytics(actor, { from: 'bukan-tanggal' });
    expect(analytics.ok).toBe(false);
    if (analytics.ok) throw new Error('expected error');
    expect(analytics.error.error.code).toBe('INVALID_INPUT');

    const audit = await service.auditLogs(actor, { outcome: 'aneh' });
    expect(audit.ok).toBe(false);
  });

  it('memetakan akses ditolak ke denial', async () => {
    const { service } = harness({
      dashboardCounts: async () => {
        throw new DashboardAccessDeniedError();
      },
    });
    const result = await service.dashboard(actor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('TenantBusinessService listConfiguration', () => {
  it('menggabungkan state, attempts, dan undangan', async () => {
    const { service, repository } = harness();
    const result = await service.listConfiguration(actor);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.organizationName).toBe('Org Redaksi');
    expect(repository.activationAttempts).toHaveBeenCalledTimes(1);
    expect(repository.listInvitations).toHaveBeenCalledTimes(1);
  });

  it('menolak aktor tanpa izin baca apa pun', async () => {
    const { service } = harness();
    const bare = { ...actor, permissionSet: new Set<string>() };
    const result = await service.listConfiguration(bare);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});
