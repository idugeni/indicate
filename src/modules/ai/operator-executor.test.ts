import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/config/runtime/runtime-context', () => ({ getServerRuntimeContext: async () => ({ bootstrap: {}, config: { r2: { accountId: 'account', bucketName: 'bucket', publicBucketName: 'public', accessKeyId: 'key', secretAccessKey: 'secret', maxBytes: 1000, allowedTypes: ['image/webp'], uploadTtlSeconds: 60, readTtlSeconds: 60 }, redis: { url: 'https://redis.example', token: 'token', namespace: 'test', resourceId: 'resource' }, publishing: { maxAttempts: 3, retryDelaysSeconds: [1, 2, 3] } } }) }));
vi.mock('@/data/client', () => ({ getSharedRuntimeDatabase: () => ({ db: {} }) }));
vi.mock('@/data/repos/dashboard', () => ({ DrizzleDashboardRepository: class {} }));
vi.mock('@/core/system/uuid-generator', () => ({ UuidGenerator: class {} }));
vi.mock('@/modules/dashboard/tenant-business-service', () => ({
  TenantBusinessService: class {
    listEditorial = async () => ({ ok: true, value: { articles: [] } });
    listTaxonomy = async () => ({ ok: true, value: { categories: [] } });
    listPublishers = async () => ({ ok: true, value: { publishers: [] } });
    listConfiguration = async () => ({ ok: true, value: { sites: [] } });
    auditLogs = async () => ({ ok: true, value: { entries: [] } });
    operations = async () => ({ ok: true, value: { health: 'ok' } });
  },
}));
vi.mock('@/data/repos/ads', () => ({ DrizzleAdsRepository: class {} }));
vi.mock('@/modules/ads/ads-service', () => ({ AdsService: class { overview = async () => ({ ok: true, value: { campaigns: [] } }); } }));
vi.mock('@/data/repos/publishing/repository', () => ({ DrizzlePublishingRepository: class {} }));
vi.mock('@/modules/publishing/media-service', () => ({ MediaService: class { list = async () => ({ ok: true, value: { items: [] } }); } }));
vi.mock('@/modules/publishing/publication-service', () => ({ PublicationService: class { listJobs = async () => ({ ok: true, value: [] }); } }));
vi.mock('@/integrations/storage/r2-object-storage', () => ({ R2ObjectStorageAdapter: class {} }));
vi.mock('@/integrations/redis/upstash-publication-queue', () => ({ UpstashPublicationQueueAdapter: class {} }));
vi.mock('@/data/repos/integrations', () => ({ DrizzleIntegrationsRepository: class {} }));
vi.mock('@/data/repos/ai', () => ({ DrizzleAiRepository: class {} }));
vi.mock('@/data/repos/dashboard-access-keys', () => ({ DrizzleDashboardAccessKeyRepository: class {} }));
vi.mock('@/data/repos/billing', () => ({ DrizzleBillingRepository: class {} }));
vi.mock('@/data/repos/moderation', () => ({ DrizzleModerationRepository: class {} }));
vi.mock('@/data/repos/content/admin', () => ({ DrizzleContentAdminRepository: class { listContent = async () => ({ marketing: [] }); } }));
vi.mock('@/modules/billing/billing-service', () => ({ BillingService: class { subscriptionState = async () => ({ ok: true, value: { state: 'active' } }); } }));
vi.mock('@/modules/moderation/moderation-service', () => ({ ModerationService: class { listReports = async () => ({ ok: true, value: [] }); } }));
vi.mock('@/modules/integrations/api-key-service', () => ({ ApiKeyService: class { list = async () => ({ ok: true, value: [] }); } }));
vi.mock('@/modules/integrations/customer-service', () => ({ CustomerService: class { readSubscription = async () => ({ ok: true, value: null }); list = async () => ({ ok: true, value: [] }); } }));
vi.mock('@/modules/integrations/ai-service', () => ({ AiService: class { overview = async () => ({ ok: true, value: { configured: true } }); } }));
vi.mock('@/modules/auth/dashboard-access-keys/access-key-service', () => ({ DashboardAccessKeyService: class { list = async () => ({ ok: true, value: [] }); } }));
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

  it('fails closed for an unknown capability', async () => {
    const result = await executeOperatorPlan({ actor, plan: { steps: [{ id: 'step_1', capabilityId: 'system.shell.execute', arguments: {} }] } });
    expect(result).toMatchObject({ ok: false });
  });

  it('executes additional tenant-scoped read handlers', async () => {
    const result = await executeOperatorPlan({ actor, plan: { steps: [{ id: 'step_1', capabilityId: 'taxonomy-studio.taxonomy.read', arguments: {} }] } });
    expect(result).toMatchObject({ ok: true, results: [{ capabilityId: 'taxonomy-studio.taxonomy.read', ok: true }] });
  });

  it('executes additional tenant-scoped read capabilities', async () => {
    for (const capabilityId of ['ads-control-center.ads.read', 'media-library.assets.read', 'distribution-control.deliveries.read', 'live-results.deliveries.read', 'access-integrations.integrations.read', 'ai-control-center.ai-status.read']) {
      const result = await executeOperatorPlan({ actor, plan: { steps: [{ id: 'step_1', capabilityId, arguments: {} }] } });
      expect(result).toMatchObject({ ok: true, results: [{ capabilityId, ok: true }] });
    }
  });

  it('executes the remaining tenant and platform-scoped read handlers', async () => {
    const platformActor = { actorType: 'user' as const, actorId: 'platform-1', verifiedAuthUserId: 'auth-1', organizationId: null, permissionSet: new Set<string>(), platformPermissionSet: new Set(['platform.billing.read', 'platform.moderation.read']), entryPoint: 'dashboard' as const, requestId: 'req-1' };
    for (const capabilityId of ['billing-plan.billing.read', 'trust-moderation.cases.read', 'customer-operations.customers.read', 'public-web-content.content.read']) {
      const result = await executeOperatorPlan({ actor, platformActor, plan: { steps: [{ id: 'step_1', capabilityId, arguments: {} }] } });
      expect(result).toMatchObject({ ok: true, results: [{ capabilityId, ok: true }] });
    }
  });

  it('rejects non-user actors before dispatch', async () => {
    const result = await executeOperatorPlan({ actor: { ...actor, actorType: 'api_key', verifiedAuthUserId: undefined } as never, plan: { steps: [{ id: 'step_1', capabilityId: 'command-center.overview.read', arguments: {} }] } });
    expect(result).toMatchObject({ ok: false });
  });
});
