import { describe, expect, it } from 'vitest';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { AiService, type AiRepositoryPort } from '@/modules/integrations/ai-service';
import type { AiMasterStatus, AiQueryInsightRow } from '@/modules/integrations/ai-models';

function actorWith(platform: readonly string[], tenant: readonly string[] = []): AuthorizedTenantActorContext {
  return {
    actorType: 'user',
    actorId: 'user-1',
    verifiedAuthUserId: 'auth-1',
    organizationId: 'org-1',
    permissionSet: new Set(tenant),
    platformPermissionSet: new Set(platform),
    regionScopeId: null,
    entryPoint: 'dashboard',
    requestId: 'req-1',
  };
}

const MANAGER = actorWith([INTEGRATIONS_PERMISSIONS.aiManage]);
const EDITOR = actorWith([], ['article.manage']);
const READER = actorWith([], ['article.read']);
const OUTSIDER = actorWith([], ['dashboard.read']);

interface MasterRow {
  version: number;
  active: boolean;
}

function statefulRepository(): AiRepositoryPort & { masters: MasterRow[]; insights: AiQueryInsightRow[] } {
  const masters: MasterRow[] = [];
  const insights: AiQueryInsightRow[] = [];
  let insightCounter = 0;
  const repository: AiRepositoryPort = {
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
    upsertPolicy: async () => { throw new Error('unused'); },
    listModels: async () => [],
    listProviders: async () => [],
    listRequestLogs: async () => [],
    listQueryInsights: async () => [...insights],
    getTokenUsageByOrg: async () => [],
    getMasterStatus: async (): Promise<AiMasterStatus> => {
      const active = masters.find((row) => row.active);
      if (active === undefined) {
        return { provisioned: false, version: null, fingerprint: null, rotatedAt: null, createdAt: null };
      }
      return { provisioned: true, version: active.version, fingerprint: 'deadbeef', rotatedAt: null, createdAt: '2026-09-30T00:00:00.000Z' };
    },
    provisionMaster: async (_actor, input) => {
      const active = masters.find((row) => row.active);
      if (active !== undefined && !input.rotate) throw new Error('AI_MASTER_CONFLICT');
      if (active !== undefined && input.rotate && input.expectedVersion !== active.version) throw new Error('AI_MASTER_CONFLICT');
      if (active !== undefined) active.active = false;
      const version = active === undefined ? 1 : active.version + 1;
      masters.push({ version, active: true });
      return version;
    },
    createInsight: async (_actor, input) => {
      insightCounter += 1;
      const row: AiQueryInsightRow = {
        id: `40000000-4000-4000-8000-${String(insightCounter).padStart(12, '0')}`,
        query: input.query,
        channel: input.channel,
        status: 'open',
        feedbackReason: input.feedbackReason ?? null,
        createdAt: '2026-09-30T00:00:00.000Z',
      };
      insights.push(row);
      return row;
    },
    resolveInsight: async (_actor, id) => {
      const target = insights.find((row) => row.id === id);
      if (target === undefined) return null;
      const resolved: AiQueryInsightRow = { ...target, status: 'resolved' };
      insights.splice(insights.indexOf(target), 1, resolved);
      return resolved;
    },
    recordDenial: async () => {},
  };
  return { ...repository, masters, insights };
}

function setup(): { service: AiService; store: AiRepositoryPort & { masters: MasterRow[]; insights: AiQueryInsightRow[] } } {
  const store = statefulRepository();
  return { service: new AiService(store, { now: () => new Date('2026-09-30T00:00:00.000Z') }), store };
}

describe('ai master provision', () => {
  it('provision pertama ok tanpa plain di response', async () => {
    const { service } = setup();
    const result = await service.provisionMaster(MANAGER, {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe(1);
    expect(result.value.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('provision kedua tanpa rotate ditolak CONFLICT', async () => {
    const { service } = setup();
    expect((await service.provisionMaster(MANAGER, {})).ok).toBe(true);
    const second = await service.provisionMaster(MANAGER, {});
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.error.code).toBe('CONFLICT');
  });

  it('rotate menonaktifkan versi lama dan menaikkan versi', async () => {
    const { service, store } = setup();
    expect((await service.provisionMaster(MANAGER, {})).ok).toBe(true);
    const rotated = await service.provisionMaster(MANAGER, { rotate: true, expectedVersion: 1 });
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.value.version).toBe(2);
    expect(store.masters.filter((row) => row.active)).toHaveLength(1);
    expect(store.masters.find((row) => row.version === 1)?.active).toBe(false);
  });

  it('rotate tanpa expectedVersion atau versi salah ditolak', async () => {
    const { service } = setup();
    expect((await service.provisionMaster(MANAGER, {})).ok).toBe(true);
    const missing = await service.provisionMaster(MANAGER, { rotate: true });
    expect(missing.ok).toBe(false);
    const wrong = await service.provisionMaster(MANAGER, { rotate: true, expectedVersion: 99 });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error.error.code).toBe('CONFLICT');
  });
});

describe('ai insight feedback', () => {
  it('editor dan reader boleh lapor, outsider ditolak', async () => {
    const { service } = setup();
    expect((await service.reportInsight(EDITOR, { query: 'hasil aneh', channel: 'draft' })).ok).toBe(true);
    expect((await service.reportInsight(READER, { query: 'hasil aneh', channel: 'moderation' })).ok).toBe(true);
    const denied = await service.reportInsight(OUTSIDER, { query: 'hasil aneh', channel: 'draft' });
    expect(denied.ok).toBe(false);
  });

  it('insert valid berstatus open lalu resolve flips status', async () => {
    const { service } = setup();
    const reported = await service.reportInsight(EDITOR, { query: 'ringkasan ngawur', channel: 'draft', feedbackReason: 'thumbs-down' });
    expect(reported.ok).toBe(true);
    if (!reported.ok) return;
    expect(reported.value.status).toBe('open');
    const resolved = await service.resolveInsight(MANAGER, { id: reported.value.id });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value.status).toBe('resolved');
  });

  it('kontak anon tidak ikut tersimpan karena skema strict', async () => {
    const { service, store } = setup();
    const rejected = await service.reportInsight(EDITOR, {
      query: 'hasil aneh',
      channel: 'moderation',
      feedbackReason: 'flag',
      contact: '0812-000',
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error.error.code).toBe('INVALID_INPUT');
    expect(store.insights).toHaveLength(0);
  });
});
