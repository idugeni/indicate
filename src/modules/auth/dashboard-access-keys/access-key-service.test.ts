import { describe, expect, it } from 'vitest';

import {
  accessKeyLoginPath,
  createAccessKeyMaterial,
  DashboardAccessKeyService,
  deriveAccessKeyHash,
  parseAccessKeyCredential,
  verifyAccessKeySecret,
  type AccessKeyRepository,
  type NewStoredAccessKey,
} from '@/modules/auth/dashboard-access-keys/access-key-service';
import { accessKeyIssueSchema, accessKeyRevokeSchema } from '@/modules/auth/dashboard-access-keys/schemas';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { AccessKeyRecord } from '@/modules/auth/dashboard-access-keys/models';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';

describe('kredensial kunci akses dashboard', () => {
  it('menerbitkan pasangan lookup dan secret yang bisa di-parse kembali', () => {
    const material = createAccessKeyMaterial();
    const parsed = parseAccessKeyCredential(material.plaintext);
    expect(parsed).not.toBeNull();
    expect(parsed?.lookupId).toBe(material.lookupId);
  });

  it('menolak bentuk kredensial yang bukan kunci akses', () => {
    expect(parseAccessKeyCredential('')).toBeNull();
    expect(parseAccessKeyCredential('ind_live_abcdefghijklmnop.secret')).toBeNull();
    expect(parseAccessKeyCredential('inda_pendek.x')).toBeNull();
  });

  it('memverifikasi secret yang benar dan menolak yang salah', async () => {
    const material = createAccessKeyMaterial();
    const parsed = parseAccessKeyCredential(material.plaintext)!;
    const hash = await deriveAccessKeyHash(parsed.secret, material.salt);
    await expect(verifyAccessKeySecret(parsed.secret, material.salt, hash)).resolves.toBe(true);
    await expect(verifyAccessKeySecret(`${parsed.secret.slice(0, -1)}A`, material.salt, hash)).resolves.toBe(false);
  });

  it('membangun path login sekali-klik yang aman URL', () => {
    const material = createAccessKeyMaterial();
    const path = accessKeyLoginPath(material.plaintext);
    expect(path.startsWith('/auth/access-key?key=')).toBe(true);
    expect(decodeURIComponent(path.slice('/auth/access-key?key='.length))).toBe(material.plaintext);
  });
});

describe('kebijakan masa berlaku kunci akses', () => {
  const actor = {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set([INTEGRATIONS_PERMISSIONS.apiKeyManage]),
    platformPermissionSet: new Set<string>(),
    regionScopeId: null,
    entryPoint: 'dashboard',
    requestId: 'req-1',
  } as unknown as AuthorizedTenantActorContext;

  function stubRepository(captured: { input?: NewStoredAccessKey }): AccessKeyRepository {
    const record = (input: NewStoredAccessKey): AccessKeyRecord => ({
      id: input.id,
      organizationId: input.organizationId,
      userId: input.userId,
      lookupId: input.lookupId,
      name: input.name,
      status: 'active',
      expiresAt: input.expiresAt,
      lastUsedAt: null,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    });
    return {
      createAccessKey: async (_actor, input) => {
        captured.input = input;
        return record(input);
      },
      revokeAccessKey: async () => {
        throw new Error('not implemented');
      },
      listAccessKeys: async () => [],
      findAccessKeyByLookupId: async () => null,
      recordAccessKeyUse: async () => {},
      recordDenial: async () => {},
    };
  }

  it('menerbitkan kunci permanen saat expiry null', async () => {
    const captured: { input?: NewStoredAccessKey } = {};
    const service = new DashboardAccessKeyService(stubRepository(captured), { create: () => 'key-1' });
    const result = await service.issue(actor, 'user-1', { name: 'Bypass owner', expiresAt: null });
    expect(result.ok).toBe(true);
    expect(captured.input?.expiresAt).toBeNull();
  });

  it('menolak expiry lewat 365 hari', async () => {
    const service = new DashboardAccessKeyService(stubRepository({}), { create: () => 'key-1' });
    const far = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString();
    const result = await service.issue(actor, 'user-1', { name: 'Bypass owner', expiresAt: far });
    expect(result.ok).toBe(false);
  });

  it('menolak expiry di masa lalu', async () => {
    const service = new DashboardAccessKeyService(stubRepository({}), { create: () => 'key-1' });
    const past = new Date(Date.now() - 1000).toISOString();
    const result = await service.issue(actor, 'user-1', { name: 'Bypass owner', expiresAt: past });
    expect(result.ok).toBe(false);
  });
});

describe('skema kunci akses dashboard', () => {
  it('menerima nama dan expiry opsional', () => {
    const parsed = accessKeyIssueSchema.safeParse({ name: 'Laptop cadangan', expiresAt: null });
    expect(parsed.success).toBe(true);
  });

  it('menolak nama kosong', () => {
    expect(accessKeyIssueSchema.safeParse({ name: '  ', expiresAt: null }).success).toBe(false);
  });

  it('menerima revoke dengan id dan versi', () => {
    const parsed = accessKeyRevokeSchema.safeParse({
      accessKeyId: '123e4567-e89b-12d3-a456-426614174000',
      expectedVersion: 1,
    });
    expect(parsed.success).toBe(true);
  });
});
