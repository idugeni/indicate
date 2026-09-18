import { describe, expect, it, vi } from 'vitest';

import { ModerationService } from '@/modules/moderation/moderation-service';
import { ModerationAccessDeniedError, ModerationConflictError } from '@/modules/moderation/ports';

const ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const NOW = new Date('2026-09-18T14:00:00.000Z');

const userActor = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const systemActor = {
  actorType: 'system',
  actorId: 'worker-1',
  organizationId: 'org-1',
  permissionSet: new Set<string>(),
  entryPoint: 'worker',
  requestId: 'req-1',
} as const;

const report = {
  orgId: ID,
  contact: 'pelapor@example.test',
  category: 'misinformation',
  details: 'Detail laporan yang cukup panjang untuk lolos validasi minimal.',
} as const;

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    submitReport: vi.fn(async () => ({ id: 'report-1' })),
    listReports: vi.fn(async () => [{ id: 'report-1' }]),
    decideReport: vi.fn(async () => undefined),
    submitPrivacyRequest: vi.fn(async () => ({ ticketNumber: 'TCK-1' })),
    listPrivacyRequests: vi.fn(async () => []),
    decidePrivacyRequest: vi.fn(async () => undefined),
    listHolds: vi.fn(async () => []),
    createHold: vi.fn(async () => ({ id: 'hold-1' })),
    releaseHold: vi.fn(async () => undefined),
    listErasureRequests: vi.fn(async () => []),
    createErasureRequest: vi.fn(async () => ({ id: 'erasure-1' })),
    ...repoOverrides,
  };
  const service = new ModerationService(repository as never, { now: () => NOW });
  return { repository, service };
}

describe('ModerationService reports', () => {
  it('menerima laporan publik tanpa sesi', async () => {
    const { service, repository } = harness();
    const result = await service.submitReport(report, 'req-1');
    expect(result.ok).toBe(true);
    expect(repository.submitReport).toHaveBeenCalledTimes(1);
  });

  it('menolak laporan dengan field rusak', async () => {
    const { service } = harness();
    const result = await service.submitReport({ ...report, details: 'pendek' }, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak list laporan dari aktor non-user', async () => {
    const { service } = harness();
    const result = await service.listReports(systemActor);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('memutuskan laporan dan memetakan konflik', async () => {
    const okHarness = harness();
    const decided = await okHarness.service.decideReport(userActor, { reportId: ID, actionTaken: true });
    expect(decided.ok).toBe(true);

    const conflictHarness = harness({
      decideReport: async () => {
        throw new ModerationConflictError();
      },
    });
    const conflict = await conflictHarness.service.decideReport(userActor, { reportId: ID, actionTaken: true });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) throw new Error('expected error');
    expect(conflict.error.error.code).toBe('CONFLICT');
  });

  it('memetakan akses ditolak ke denial dan error asing ke unavailable', async () => {
    const deniedHarness = harness({
      listReports: async () => {
        throw new ModerationAccessDeniedError();
      },
    });
    const denied = await deniedHarness.service.listReports(userActor);
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('expected error');
    expect(denied.error.error.code).toBe('RESOURCE_UNAVAILABLE');

    const brokenHarness = harness({
      listReports: async () => {
        throw new Error('db down');
      },
    });
    const broken = await brokenHarness.service.listReports(userActor);
    expect(broken.ok).toBe(false);
    if (broken.ok) throw new Error('expected error');
    expect(broken.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
});

describe('ModerationService privacy holds erasure', () => {
  it('mengalirkan privacy request dari submit hingga decide', async () => {
    const { service, repository } = harness();
    const submitted = await service.submitPrivacyRequest(userActor, {
      orgId: ID,
      requestType: 'deletion',
      details: 'Mohon hapus data saya sesuai ketentuan yang berlaku saat ini.',
    });
    expect(submitted.ok).toBe(true);
    expect(repository.submitPrivacyRequest).toHaveBeenCalledTimes(1);

    const decided = await service.decidePrivacyRequest(userActor, { ticket: 'TCK-1', status: 'fulfilled' });
    expect(decided.ok).toBe(true);
  });

  it('membuat dan melepas litigation hold', async () => {
    const { service, repository } = harness();
    const created = await service.createHold(userActor, { organizationId: ID, reason: 'Alasan hold yang cukup panjang untuk validasi.' });
    expect(created.ok).toBe(true);
    expect(repository.createHold).toHaveBeenCalledTimes(1);

    const released = await service.releaseHold(userActor, { holdId: ID });
    expect(released.ok).toBe(true);
  });

  it('membuat erasure request terjadwal', async () => {
    const { service } = harness();
    const result = await service.createErasureRequest(userActor, {
      organizationId: ID,
      reason: 'Alasan penghapusan yang cukup panjang untuk validasi.',
      scheduledFor: '2026-10-18T14:00:00.000Z',
    });
    expect(result.ok).toBe(true);
  });

  it('menolak aksi sensitif dari aktor non-user', async () => {
    const { service } = harness();
    const result = await service.createHold(systemActor, { organizationId: ID, reason: 'Alasan hold yang cukup panjang untuk validasi.' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});
