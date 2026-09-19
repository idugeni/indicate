import { describe, expect, it, vi } from 'vitest';

import { TelegramMappingService } from '@/modules/integrations/telegram-mapping-service';
import {
  IntegrationsAccessDeniedError,
  IntegrationsConflictError,
  IntegrationsSubscriptionInactiveError,
} from '@/modules/integrations/ports';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const USER = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
const ROLE = '0199a2b3-4c5d-7e8f-9012-3456789abcdf';
const MAPPING = '0199a2b3-4c5d-7e8f-9012-3456789abce0';

const manager = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set(['telegram.manage']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const platformManager = {
  ...manager,
  platformPermissionSet: new Set(['platform.super_admin']),
};

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    listTelegramMappings: vi.fn(async () => [{ id: MAPPING }]),
    createTelegramMapping: vi.fn(async (_actor: unknown, input: unknown) => input),
    updateTelegramMapping: vi.fn(async (_actor: unknown, input: unknown) => input),
    listOutboxMessages: vi.fn(async () => [{ id: 'outbox-1' }]),
    listBroadcastTargets: vi.fn(async () => [{ organizationId: 'org-1', chatId: '111' }]),
    enqueueOutboxMessage: vi.fn(async () => ({ id: 'outbox-1' })),
    recordDenial: vi.fn(async () => undefined),
    ...repoOverrides,
  };
  const service = new TelegramMappingService(repository as never, { create: () => MAPPING }, { now: () => NOW });
  return { repository, service };
}

const createPayload = { userId: USER, roleId: ROLE, telegramUserId: '111', telegramChatId: '111' };

describe('TelegramMappingService crud', () => {
  it('menolak list dari aktor tanpa izin', async () => {
    const { service } = harness();
    const reader = { ...manager, permissionSet: new Set<string>() };
    const result = await service.list(reader);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('membuat mapping beserta jejak consent', async () => {
    const { service, repository } = harness();
    const result = await service.create(manager, createPayload);
    expect(result.ok).toBe(true);
    expect(repository.createTelegramMapping).toHaveBeenCalledTimes(1);
  });

  it('menolak payload create rusak', async () => {
    const { service } = harness();
    const result = await service.create(manager, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('memetakan konflik dan langganan pada create', async () => {
    const conflict = harness({
      createTelegramMapping: async () => {
        throw new IntegrationsConflictError();
      },
    });
    const conflicted = await conflict.service.create(manager, createPayload);
    expect(conflicted.ok).toBe(false);
    if (conflicted.ok) throw new Error('expected error');
    expect(conflicted.error.error.code).toBe('CONFLICT');

    const inactive = harness({
      createTelegramMapping: async () => {
        throw new IntegrationsSubscriptionInactiveError('past_due');
      },
    });
    const forbidden = await inactive.service.create(manager, createPayload);
    expect(forbidden.ok).toBe(false);
    if (forbidden.ok) throw new Error('expected error');
    expect(forbidden.error.error.code).toBe('FORBIDDEN');
  });

  it('mengupdate mapping dan memetakan akses ditolak', async () => {
    const okHarness = harness();
    const updated = await okHarness.service.update(manager, {
      mappingId: MAPPING,
      expectedVersion: 1,
      userId: USER,
      roleId: ROLE,
      telegramUserId: '111',
      telegramChatId: '222',
      status: 'active',
    });
    expect(updated.ok).toBe(true);

    const deniedHarness = harness({
      updateTelegramMapping: async () => {
        throw new IntegrationsAccessDeniedError();
      },
    });
    const denied = await deniedHarness.service.update(manager, {
      mappingId: MAPPING,
      expectedVersion: 1,
      userId: USER,
      roleId: ROLE,
      telegramUserId: '111',
      telegramChatId: '222',
      status: 'active',
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error('expected error');
    expect(denied.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('TelegramMappingService outbox broadcast', () => {
  it('mengembalikan list kosong untuk non-platform', async () => {
    const { service } = harness();
    const result = await service.listOutbox(manager);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value).toEqual([]);
  });

  it('melaporkan galat saat outbox platform gagal dibaca', async () => {
    const { service } = harness({
      listOutboxMessages: async () => {
        throw new Error('db down');
      },
    });
    const result = await service.listOutbox(platformManager);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('menolak broadcast non-platform lewat denial', async () => {
    const { service } = harness();
    const result = await service.broadcast(manager, { text: 'Halo' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menjadwalkan broadcast ke semua target platform', async () => {
    const { service, repository } = harness();
    const result = await service.broadcast(platformManager, { text: 'Pengumuman redaksi' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.enqueued).toBe(1);
    expect(repository.enqueueOutboxMessage).toHaveBeenCalledTimes(1);
  });

  it('menolak broadcast tanpa teks', async () => {
    const { service } = harness();
    const result = await service.broadcast(platformManager, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });
});
