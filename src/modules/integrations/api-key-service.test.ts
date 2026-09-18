import { describe, expect, it, vi } from 'vitest';

import { ApiKeyService } from '@/modules/integrations/api-key-service';

const NOW = new Date('2026-09-18T14:00:00.000Z');
const LOOKUP = 'AAAAAAAAAAAAAAAA';
const SECRET_PART = 'B'.repeat(43);
const PLAINTEXT = `ind_live_${LOOKUP}.${SECRET_PART}`;
const FUTURE = '2027-09-18T14:00:00.000Z';
const KEY_ID = '0199a2b3-4c5d-7e8f-9012-3456789abcde';

const manager = {
  actorType: 'user',
  actorId: 'user-1',
  organizationId: 'org-1',
  permissionSet: new Set(['api_key.manage', 'articles.read']),
  entryPoint: 'dashboard',
  requestId: 'req-1',
  verifiedAuthUserId: 'auth-1',
} as const;

const fakeHasher = {
  hash: async (secret: string, salt: string) => `hash:${secret}:${salt}`,
  verify: async (secret: string, salt: string, expected: string) => expected === `hash:${secret}:${salt}`,
};

const fakeCredentials = {
  create: () => ({ plaintext: PLAINTEXT, lookupId: LOOKUP, salt: 'c2FsdA==', verificationHash: '' }),
};

function storedKey(overrides: Record<string, unknown> = {}) {
  return {
    id: KEY_ID,
    organizationId: 'org-1',
    lookupId: LOOKUP,
    name: 'CI key',
    salt: 'c2FsdA==',
    verificationHash: `hash:${SECRET_PART}:c2FsdA==`,
    scopes: ['articles.read'],
    status: 'active',
    expiresAt: null,
    regionId: null,
    version: 1,
    ...overrides,
  };
}

function harness(repoOverrides: Record<string, unknown> = {}) {
  const repository = {
    createApiKey: vi.fn(async (_actor: unknown, stored: unknown) => ({ ...(stored as object), status: 'active', version: 1 })),
    findApiKeyByLookupId: vi.fn(async () => null),
    listApiKeys: vi.fn(async () => []),
    rotateApiKey: vi.fn(async (_actor: unknown, _id: unknown, _version: unknown, stored: unknown) => ({ ...(stored as object), status: 'active', version: 2 })),
    revokeApiKey: vi.fn(async () => storedKey({ status: 'revoked' })),
    recordDenial: vi.fn(async () => undefined),
    recordApiKeyUse: vi.fn(async () => undefined),
    ...repoOverrides,
  };
  const service = new ApiKeyService(
    repository as never,
    { create: () => KEY_ID },
    fakeCredentials,
    { now: () => NOW },
    fakeHasher,
  );
  return { repository, service };
}

describe('ApiKeyService issue', () => {
  it('menolak payload tidak valid', async () => {
    const { service } = harness();
    const result = await service.issue(manager, {});
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak penerbit tanpa izin manage', async () => {
    const { service } = harness();
    const reader = { ...manager, permissionSet: new Set(['api_key.read']) };
    const result = await service.issue(reader, { name: 'k', scopes: ['articles.read'] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak scope di luar izin aktor', async () => {
    const { service } = harness();
    const result = await service.issue(manager, { name: 'k', scopes: ['platform.super_admin'] });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak expiry di masa lalu', async () => {
    const { service } = harness();
    const result = await service.issue(manager, { name: 'k', scopes: ['articles.read'], expiresAt: '2020-01-01T00:00:00.000Z' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('INVALID_INPUT');
  });

  it('menerbitkan key dan mengembalikan plaintext sekali tampil', async () => {
    const { service, repository } = harness();
    const result = await service.issue(manager, { name: 'CI key', scopes: ['articles.read'], expiresAt: FUTURE });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.plaintext).toBe(PLAINTEXT);
    expect(repository.createApiKey).toHaveBeenCalledTimes(1);
  });
});

describe('ApiKeyService authenticate', () => {
  it('menolak format kredensial asing', async () => {
    const { service } = harness();
    const result = await service.authenticate('bukan-key', undefined, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak lookup yang tidak dikenal', async () => {
    const { service } = harness({ findApiKeyByLookupId: async () => null });
    const result = await service.authenticate(PLAINTEXT, undefined, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak secret yang salah', async () => {
    const { service } = harness({ findApiKeyByLookupId: async () => storedKey() });
    const wrong = `ind_live_${LOOKUP}.${'C'.repeat(43)}`;
    const result = await service.authenticate(wrong, undefined, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('menolak key kedaluwarsa', async () => {
    const { service } = harness({ findApiKeyByLookupId: async () => storedKey({ expiresAt: '2020-01-01T00:00:00.000Z' }) });
    const result = await service.authenticate(PLAINTEXT, undefined, 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('mengautentikasi dan mencatat pemakaian', async () => {
    const { service, repository } = harness({ findApiKeyByLookupId: async () => storedKey() });
    const result = await service.authenticate(PLAINTEXT, 'articles.read', 'req-1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.organizationId).toBe('org-1');
    expect(repository.recordApiKeyUse).toHaveBeenCalledTimes(1);
  });

  it('menolak scope yang tidak dimiliki key', async () => {
    const { service } = harness({ findApiKeyByLookupId: async () => storedKey() });
    const result = await service.authenticate(PLAINTEXT, 'sites.manage', 'req-1');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});

describe('ApiKeyService rotate revoke list', () => {
  it('merotasi key aktif dan mengembalikan material baru', async () => {
    const { service, repository } = harness({ listApiKeys: async () => [storedKey()] });
    const result = await service.rotate(manager, { apiKeyId: KEY_ID, expectedVersion: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok');
    expect(result.value.plaintext).toBe(PLAINTEXT);
    expect(repository.rotateApiKey).toHaveBeenCalledTimes(1);
  });

  it('menolak rotasi key yang tidak dikenal', async () => {
    const { service } = harness({ listApiKeys: async () => [] });
    const result = await service.rotate(manager, { apiKeyId: KEY_ID, expectedVersion: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('mencabut key dan menolak payload rusak', async () => {
    const { service, repository } = harness();
    const revoked = await service.revoke(manager, { apiKeyId: KEY_ID, expectedVersion: 1 });
    expect(revoked.ok).toBe(true);
    expect(repository.revokeApiKey).toHaveBeenCalledTimes(1);

    const broken = await service.revoke(manager, {});
    expect(broken.ok).toBe(false);
    if (broken.ok) throw new Error('expected error');
    expect(broken.error.error.code).toBe('INVALID_INPUT');
  });

  it('menolak list dari aktor terkunci region', async () => {
    const { service } = harness();
    const locked = { ...manager, regionScopeId: 'region-1' };
    const result = await service.list(locked);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected error');
    expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });
});
