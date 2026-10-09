import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/config/runtime/runtime-context', () => ({ getServerRuntimeContext: async () => ({ bootstrap: {} }) }));
vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: () => ({ db: {} }) }));
vi.mock('@/data/repos/dashboard', () => ({ DrizzleDashboardRepository: class {} }));
vi.mock('@/core/system/uuid-generator', () => ({ UuidGenerator: class {} }));
vi.mock('@/modules/dashboard/tenant-business-service', () => ({
  TenantBusinessService: class {
    listEditorial = async () => ({ ok: true, value: { articles: [] } });
    operations = async () => ({ ok: true, value: { health: 'ok' } });
  },
}));
vi.mock('@/modules/dashboard/dashboard-dal', () => ({
  fetchCachedDashboard: async () => ({ ok: true, value: { totals: { articles: 3 } } }),
  fetchCachedAnalytics: async () => ({ ok: true, value: { totals: { views: 10 } } }),
}));

import { executeOperatorPlan } from '@/modules/ai/operator-executor';

const actor = {
  actorType: 'user' as const,
  actorId: 'user-1',
  verifiedAuthUserId: 'auth-1',
  organizationId: '11111111-1111-4111-8111-111111111111',
  permissionSet: new Set(['dashboard.read', 'analytics.read', 'article.read']),
  entryPoint: 'dashboard' as const,
  requestId: 'req-1',
};

describe('executeOperatorPlan', () => {
  it('executes a registered read capability through its handler', async () => {
    const result = await executeOperatorPlan({ actor, plan: { steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] } });
    expect(result).toMatchObject({ ok: true, results: [{ id: 'step_1', ok: true, result: { ok: true, value: { totals: { articles: 3 } } } }] });
  });

  it('fails closed when a catalog item has no verified handler', async () => {
    const result = await executeOperatorPlan({ actor, plan: { steps: [{ id: 'step_1', capabilityId: 'taxonomy-studio.taxonomy.read', arguments: {} }] } });
    expect(result).toMatchObject({ ok: false });
  });

  it('rejects non-user actors before dispatch', async () => {
    const result = await executeOperatorPlan({ actor: { ...actor, actorType: 'api_key', verifiedAuthUserId: undefined } as never, plan: { steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] } });
    expect(result).toMatchObject({ ok: false });
  });
});
