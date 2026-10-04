import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { AiService, type AiRepositoryPort } from '@/modules/integrations/ai-service';
import { aiPolicyUpdateSchema } from '@/modules/integrations/ai-schemas';

function actor(): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set(['dashboard.read']),
    platformPermissionSet: new Set([INTEGRATIONS_PERMISSIONS.aiManage]),
    regionScopeId: null,
    entryPoint: 'dashboard',
    requestId: 'req-1',
  };
}

function stubRepository(captured: { policyInput?: unknown }): AiRepositoryPort {
  return {
    listCredentials: async () => [],
    createCredential: async () => { throw new Error('unused'); },
    updateCredentialStatus: async () => null,
    deleteCredential: async () => false,
    decryptCredentialKey: async () => null,
    recordCredentialTest: async () => {},
    recordBlockedCredential: async () => {},
    getPolicy: async () => ({
      rotationStrategy: 'health_aware',
      chainStrategy: 'fallback',
      costMode: 'throughput',
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
    }),
    upsertPolicy: async (actor, input) => {
      captured.policyInput = { ...input };
      return {
        rotationStrategy: input.rotationStrategy,
        chainStrategy: input.chainStrategy,
        costMode: input.costMode,
        primaryProviderId: input.primaryProviderId,
        defaultModel: input.defaultModel,
        fallbackProviderId: input.fallbackProviderId,
        fallbackModel: input.fallbackModel,
        maxRetries: input.maxRetries,
        perKeyRetryLimit: input.perKeyRetryLimit,
        cooldownDurationSec: input.cooldownDurationSec,
        requestTimeoutMs: input.requestTimeoutMs,
        globalConcurrencyLimit: input.globalConcurrencyLimit,
        version: 2,
        updatedAt: '2026-09-30T01:00:00.000Z',
      };
    },
    listModels: async () => [],
    listAllModels: async () => [],
    updateModelActive: async () => true,
    listProviders: async () => [
      { id: 'gemini', name: 'Google Gemini', isActive: true, supportsChat: true },
      { id: 'openrouter', name: 'OpenRouter', isActive: true, supportsChat: true },
      { id: 'backup', name: 'Backup', isActive: true, supportsChat: true },
    ],
    listRequestLogs: async () => [],
    listQueryInsights: async () => [],
    getTokenUsageByOrg: async () => [],
    getMasterStatus: async () => ({ provisioned: false, version: null, fingerprint: null, rotatedAt: null, createdAt: null }),
    provisionMaster: async () => 1,
    createInsight: async () => { throw new Error('unused'); },
    resolveInsight: async () => null,
    recordDenial: async () => {},
  };
}

describe('aiPolicyUpdateSchema fallback terkonfigurasi', () => {
  it('mewajibkan fallbackModel eksplisit tanpa default statis', () => {
    expect(() =>
      aiPolicyUpdateSchema.parse({
        rotationStrategy: 'health_aware',
        defaultModel: 'openai/gpt-4o-mini',
        maxRetries: 3,
        cooldownDurationSec: 60,
      }),
    ).toThrow();
  });

  it('menerima chainStrategy fallback sebagai default', () => {
    const parsed = aiPolicyUpdateSchema.parse({
      rotationStrategy: 'health_aware',
      defaultModel: 'openai/gpt-4o-mini',
      fallbackModel: 'inclusionai/ling-3.1-flash-free',
      maxRetries: 3,
      cooldownDurationSec: 60,
    });
    expect(parsed.chainStrategy).toBe('fallback');
    expect(parsed.perKeyRetryLimit).toBe(2);
    expect(parsed.requestTimeoutMs).toBe(60000);
    expect(parsed.globalConcurrencyLimit).toBe(100);
    expect(parsed.fallbackProviderId).toBeNull();
    expect(parsed.fallbackModel).toBe('inclusionai/ling-3.1-flash-free');
  });

  it('menerima rantai fallback eksplisit', () => {
    const parsed = aiPolicyUpdateSchema.parse({
      rotationStrategy: 'round_robin',
      defaultModel: 'gemini-3.6-flash',
      fallbackProviderId: 'backup',
      fallbackModel: 'gemini-2.5-flash',
      maxRetries: 5,
      cooldownDurationSec: 300,
    });
    expect(parsed.fallbackProviderId).toBe('backup');
    expect(parsed.fallbackModel).toBe('gemini-2.5-flash');
  });

  it('menolak field tak dikenal karena strict', () => {
    expect(() =>
      aiPolicyUpdateSchema.parse({
        rotationStrategy: 'health_aware',
        defaultModel: 'gemini-2.5-flash',
        maxRetries: 3,
        cooldownDurationSec: 60,
        contact: '0812-000',
      }),
    ).toThrow();
  });
});

describe('AiService.updatePolicy fallback', () => {
  it('meneruskan primaryProviderId, fallbackProviderId, dan fallbackModel ke repository', async () => {
    const captured: { policyInput?: unknown } = {};
    const service = new AiService(stubRepository(captured), { now: () => new Date('2026-09-30T00:00:00.000Z') });
    const result = await service.updatePolicy(actor(), {
      rotationStrategy: 'health_aware',
      chainStrategy: 'round_robin',
      primaryProviderId: 'openrouter',
      defaultModel: 'openai/gpt-4o-mini',
      fallbackProviderId: 'backup',
      fallbackModel: 'gemini-2.5-flash',
      maxRetries: 5,
      cooldownDurationSec: 300,
    });
    expect(result.ok).toBe(true);
    expect(captured.policyInput).toMatchObject({ chainStrategy: 'round_robin', primaryProviderId: 'openrouter', fallbackProviderId: 'backup', fallbackModel: 'gemini-2.5-flash' });
    if (result.ok) {
      expect(result.value.chainStrategy).toBe('round_robin');
      expect(result.value.primaryProviderId).toBe('openrouter');
      expect(result.value.fallbackProviderId).toBe('backup');
      expect(result.value.fallbackModel).toBe('gemini-2.5-flash');
    }
  });
});
