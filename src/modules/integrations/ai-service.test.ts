import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { AiService, type AiRepositoryPort } from '@/modules/integrations/ai-service';
import type { AiCredentialProjection, AiRoutingPolicy } from '@/modules/integrations/ai-models';

function actorWith(platform: readonly string[]): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set(['dashboard.read']),
    platformPermissionSet: new Set(platform),
    regionScopeId: null,
    entryPoint: 'dashboard',
    requestId: 'req-1',
  };
}

const POLICY: AiRoutingPolicy = {
  rotationStrategy: 'health_aware',
  chainStrategy: 'fallback',
  primaryProviderId: 'gemini',
  defaultModel: 'gemini-2.5-flash',
  fallbackProviderId: null,
  fallbackModel: 'gemini-2.5-flash',
  maxRetries: 5,
  perKeyRetryLimit: 2,
  cooldownDurationSec: 60,
  requestTimeoutMs: 60000,
  globalConcurrencyLimit: 100,
  version: 1,
  updatedAt: '2026-09-30T00:00:00.000Z',
};

function credentialRow(id: string, status: AiCredentialProjection['status'] = 'active'): AiCredentialProjection {
  return {
    id,
    providerId: 'gemini',
    label: `Key ${id}`,
    keyMasked: 'AIza•••WXYZ',
    status,
    priority: 1,
    cooldownUntil: null,
    lastUsedAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastErrorClass: null,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgLatencyMs: 0,
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
  };
}

function fakeRepository(rows: AiCredentialProjection[] = [credentialRow('11111111-1111-4111-8111-111111111111')]): AiRepositoryPort & { calls: string[] } {
  const calls: string[] = [];
  let counter = 0;
  return {
    calls,
    listCredentials: async () => [...rows],
    createCredential: async (_actor, input) => {
      counter += 1;
      return { ...credentialRow(`cred-new-${counter}`), providerId: input.providerId, label: input.label, keyMasked: input.keyMasked, priority: input.priority };
    },
    updateCredentialStatus: async (_actor, credentialId, status) => {
      const target = rows.find((row) => row.id === credentialId);
      return target === undefined ? null : { ...target, status };
    },
    deleteCredential: async (_actor, credentialId) => rows.some((row) => row.id === credentialId),
    decryptCredentialKey: async (_actor, credentialId) => (rows.some((row) => row.id === credentialId) ? 'plain-key' : null),
    recordCredentialTest: async () => { calls.push('recordCredentialTest'); },
    recordBlockedCredential: async () => { calls.push('recordBlockedCredential'); },
    getPolicy: async () => POLICY,
    upsertPolicy: async (_actor, input) => ({ ...POLICY, ...input, version: POLICY.version + 1, updatedAt: '2026-09-30T01:00:00.000Z' }),
    listModels: async () => [],
    listProviders: async () => [
      { id: 'gemini', name: 'Google Gemini', isActive: true, supportsChat: true },
      { id: 'openrouter', name: 'OpenRouter', isActive: true, supportsChat: true },
    ],
    listRequestLogs: async () => [],
    listQueryInsights: async () => [],
    getTokenUsageByOrg: async () => [],
    getMasterStatus: async () => ({ provisioned: false, version: null, fingerprint: null, rotatedAt: null, createdAt: null }),
    provisionMaster: async () => 1,
    createInsight: async (_actor, input) => ({
      id: '33333333-3333-4333-8333-333333333333',
      query: input.query,
      channel: input.channel,
      status: 'open' as const,
      feedbackReason: input.feedbackReason ?? null,
      createdAt: '2026-09-30T00:00:00.000Z',
    }),
    resolveInsight: async (_actor, id) => ({
      id,
      query: 'q',
      channel: 'web',
      status: 'resolved' as const,
      feedbackReason: null,
      createdAt: '2026-09-30T00:00:00.000Z',
    }),
    recordDenial: async () => { calls.push('recordDenial'); },
  };
}

function setupAi(repository?: AiRepositoryPort & { calls: string[] }): { service: AiService; repository: AiRepositoryPort & { calls: string[] } } {
  const repo = repository ?? fakeRepository();
  return { service: new AiService(repo, { now: () => new Date('2026-09-30T00:00:00.000Z') }), repository: repo };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AI service permission gating', () => {
  it('menolak overview tanpa grant platform dengan denial non-disclosing', async () => {
    const { service, repository } = setupAi();
    const result = await service.overview(actorWith([]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
    expect(repository.calls).toContain('recordDenial');
  });

  it('mengizinkan super_admin dan aiManage di service gate', async () => {
    const granted = setupAi();
    const denied = setupAi();
    expect((await granted.service.overview(actorWith([INTEGRATIONS_PERMISSIONS.superAdmin]))).ok).toBe(true);
    expect((await denied.service.overview(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]))).ok).toBe(true);
  });

  it('menolak create/toggle/delete/policy/test tanpa grant', async () => {
    const { service: target, repository } = setupAi();
    const actor = actorWith([]);
    expect((await target.createCredential(actor, { label: 'x', apiKey: 'AIza-valid-key-1234567890', priority: 1 })).ok).toBe(false);
    expect((await target.toggleCredential(actor, { credentialId: '11111111-1111-4111-8111-111111111111', status: 'disabled' })).ok).toBe(false);
    expect((await target.deleteCredential(actor, { credentialId: '11111111-1111-4111-8111-111111111111' })).ok).toBe(false);
    expect((await target.updatePolicy(actor, { rotationStrategy: 'round_robin', chainStrategy: 'fallback', primaryProviderId: 'gemini', defaultModel: 'gemini-2.5-flash', maxRetries: 3, cooldownDurationSec: 60 })).ok).toBe(false);
    expect((await target.testCredential(actor, { credentialId: '11111111-1111-4111-8111-111111111111' })).ok).toBe(false);
    expect(repository.calls.filter((call) => call === 'recordDenial').length).toBe(5);
  });

  it('menolak input invalid dengan INVALID_INPUT', async () => {
    const { service: target } = setupAi();
    const actor = actorWith([INTEGRATIONS_PERMISSIONS.aiManage]);
    const created = await target.createCredential(actor, { label: '', apiKey: 'short', priority: 99 });
    expect(created.ok).toBe(false);
    if (!created.ok) expect(created.error.error.code).toBe('INVALID_INPUT');
    const policy = await target.updatePolicy(actor, { rotationStrategy: 'nope', defaultModel: '', maxRetries: 0, cooldownDurationSec: 5 });
    expect(policy.ok).toBe(false);
    if (!policy.ok) expect(policy.error.error.code).toBe('INVALID_INPUT');
  });

  it('menyimpan kredensial sebagai masked tanpa plain', async () => {
    const { service: target } = setupAi();
    const result = await target.createCredential(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), { label: 'Prod 1', apiKey: 'AIzaSy-secret-value-1234567890', priority: 1, providerId: 'openrouter' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.providerId).toBe('openrouter');
      expect(result.value.keyMasked).not.toContain('secret');
      expect(JSON.stringify(result.value)).not.toContain('AIzaSy-secret');
    }
  });

  it('toggle ke id tak dikenal mengembalikan denial', async () => {
    const { service: target } = setupAi();
    const result = await target.toggleCredential(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), { credentialId: '22222222-2222-4222-8222-222222222222', status: 'disabled' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.code).toBe('RESOURCE_UNAVAILABLE');
  });

  it('test mencatat sukses saat provider menjawab OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })));
    const { service: target, repository } = setupAi();
    const result = await target.testCredential(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), { credentialId: '11111111-1111-4111-8111-111111111111' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.ok).toBe(true);
    expect(repository.calls).toContain('recordCredentialTest');
  });

  it('test 429 memicu cooldown otomatis', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429 })));
    const { service: target, repository } = setupAi();
    const result = await target.testCredential(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), { credentialId: '11111111-1111-4111-8111-111111111111' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.ok).toBe(false);
    expect(repository.calls).toContain('recordBlockedCredential');
  });

  it('updatePolicy menolak provider tak dikenal dan pasangan model salah', async () => {
    const { service: target } = setupAi(fakeRepository());
    const actor = actorWith([INTEGRATIONS_PERMISSIONS.aiManage]);
    const unknown = await target.updatePolicy(actor, {
      rotationStrategy: 'health_aware', chainStrategy: 'fallback', primaryProviderId: 'antah-berantah',
      defaultModel: 'gemini-2.5-flash', fallbackProviderId: null, fallbackModel: 'gemini-2.5-flash',
      maxRetries: 3, cooldownDurationSec: 60,
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error.error.code).toBe('INVALID_INPUT');
  });

  it('updatePolicy menolak model default milik provider lain', async () => {
    const repo = fakeRepository();
    repo.listModels = async () => [{ providerId: 'gemini', modelName: 'gemini-2.5-flash', displayName: 'Gemini', releaseStage: null, contextWindow: 1000, outputTokenLimit: null, rpmLimit: null, tpmLimit: null, rpdLimit: null, supportsTools: false, isDefault: false }];
    const { service: target } = setupAi(repo);
    const actor = actorWith([INTEGRATIONS_PERMISSIONS.aiManage]);
    const result = await target.updatePolicy(actor, {
      rotationStrategy: 'health_aware', chainStrategy: 'fallback', primaryProviderId: 'openrouter',
      defaultModel: 'gemini-2.5-flash', fallbackProviderId: null, fallbackModel: 'gemini-2.5-flash',
      maxRetries: 3, cooldownDurationSec: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.message).toContain('milik gemini');
  });

  it('updatePolicy mengizinkan model di luar katalog', async () => {
    const { service: target } = setupAi();
    const actor = actorWith([INTEGRATIONS_PERMISSIONS.aiManage]);
    const result = await target.updatePolicy(actor, {
      rotationStrategy: 'health_aware', chainStrategy: 'round_robin', primaryProviderId: 'openrouter',
      defaultModel: 'openai/gpt-9-future', fallbackProviderId: null, fallbackModel: 'openai/gpt-9-future',
      maxRetries: 3, cooldownDurationSec: 60,
    });
    expect(result.ok).toBe(true);
  });

  it('test openrouter memakai daftar model bukan chat-completions', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    const openrouterRows = [{ ...credentialRow('22222222-2222-4222-8222-222222222222'), providerId: 'openrouter' }];
    const { service: target } = setupAi(fakeRepository(openrouterRows));
    const result = await target.testCredential(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), { credentialId: '22222222-2222-4222-8222-222222222222' });
    expect(result.ok).toBe(true);
    const firstCall = fetchMock.mock.calls.at(0)?.at(0);
    const url = String(firstCall ?? '');
    expect(url).toContain('openrouter.ai/api/v1/models');
    expect(url).not.toContain('chat/completions');
    expect(fetchMock.mock.calls.at(0)?.at(1)).toMatchObject({ method: 'GET' });
  });

  it('test gemini memakai model katalog milik providernya', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    const repo = fakeRepository();
    repo.listModels = async () => [{ providerId: 'gemini', modelName: 'gemini-3.6-flash', displayName: 'G', releaseStage: null, contextWindow: 1000, outputTokenLimit: null, rpmLimit: null, tpmLimit: null, rpdLimit: null, supportsTools: false, isDefault: false }];
    const { service: target } = setupAi(repo);
    const result = await target.testCredential(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), { credentialId: '11111111-1111-4111-8111-111111111111' });
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls.at(0)?.at(0) ?? '')).toContain('gemini-3.6-flash');
  });

  it('updatePolicy menolak provider non-chat sebagai primer', async () => {
    const repo = fakeRepository();
    repo.listProviders = async () => [
      { id: 'gemini', name: 'Google Gemini', isActive: true, supportsChat: true },
      { id: 'workers-ai', name: 'Workers AI', isActive: true, supportsChat: false },
    ];
    const { service: target } = setupAi(repo);
    const result = await target.updatePolicy(actorWith([INTEGRATIONS_PERMISSIONS.aiManage]), {
      rotationStrategy: 'health_aware', chainStrategy: 'fallback', primaryProviderId: 'workers-ai',
      defaultModel: 'gemini-2.5-flash', fallbackProviderId: null, fallbackModel: 'gemini-2.5-flash',
      maxRetries: 3, cooldownDurationSec: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error.message).toContain('tidak mendukung chat');
  });
});
