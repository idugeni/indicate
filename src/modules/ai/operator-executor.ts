import 'server-only';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { fetchCachedAnalytics, fetchCachedDashboard } from '@/modules/dashboard/dashboard-dal';
import { DrizzleAdsRepository } from '@/data/repos/ads';
import { AdsService } from '@/modules/ads/ads-service';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { DrizzleIntegrationsRepository } from '@/data/repos/integrations';
import { DrizzleAiRepository } from '@/data/repos/ai';
import { DrizzleDashboardAccessKeyRepository } from '@/data/repos/dashboard-access-keys';
import { ApiKeyService } from '@/modules/integrations/api-key-service';
import { CustomerService } from '@/modules/integrations/customer-service';
import { AiService } from '@/modules/integrations/ai-service';
import { DashboardAccessKeyService } from '@/modules/auth/dashboard-access-keys/access-key-service';
import { OPERATOR_CAPABILITIES, OPERATOR_EXECUTABLE_READ_CAPABILITY_IDS, OPERATOR_READ_EXECUTION_ENABLED, type OperatorCapabilityDefinition } from '@/modules/ai/operator-capabilities';
import type { OperatorPlan } from '@/modules/ai/operator-plan';

const EXECUTABLE_READ_CAPABILITIES = new Set<string>(OPERATOR_EXECUTABLE_READ_CAPABILITY_IDS);

export type OperatorStepResult =
  | { readonly id: string; readonly capabilityId: string; readonly ok: true; readonly result: unknown }
  | { readonly id: string; readonly capabilityId: string; readonly ok: false; readonly error: string };

function boundedResult(value: unknown): unknown {
  let serialized: string;
  try { serialized = JSON.stringify(value); }
  catch { return { truncated: true, summary: 'Hasil tidak dapat diserialisasi.' }; }
  if (serialized.length <= 12000) return JSON.parse(serialized) as unknown;
  return { truncated: true, preview: serialized.slice(0, 12000) };
}

function catalogCapability(id: string): OperatorCapabilityDefinition | undefined {
  return OPERATOR_CAPABILITIES.find((item) => item.id === id);
}

/** Execute only explicitly implemented read handlers; authorization remains enforced by the existing domain services. */
export async function executeOperatorPlan(input: {
  readonly actor: AuthorizedTenantActorContext;
  readonly plan: OperatorPlan;
}): Promise<{ readonly ok: true; readonly results: readonly OperatorStepResult[] } | { readonly ok: false; readonly error: string }> {
  if (!OPERATOR_READ_EXECUTION_ENABLED) return { ok: false, error: 'Eksekusi baca AI dinonaktifkan.' };
  if (input.actor.actorType !== 'user') return { ok: false, error: 'Jenis aktor ini tidak didukung untuk eksekusi operator.' };
  const capabilities = input.plan.steps.map((step) => ({ step, capability: catalogCapability(step.capabilityId) }));
  if (capabilities.some(({ capability }) => capability === undefined || !EXECUTABLE_READ_CAPABILITIES.has(capability.id))) {
    return { ok: false, error: 'Rencana memuat kemampuan yang belum memiliki handler terverifikasi.' };
  }
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const service = new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator());
  const results: OperatorStepResult[] = [];

  for (const step of input.plan.steps) {
    let result: unknown;
    switch (step.capabilityId) {
      case 'command-center.overview.read':
        result = await fetchCachedDashboard(input.actor);
        break;
      case 'network-intelligence.health.read':
        result = await fetchCachedAnalytics(input.actor, {});
        break;
      case 'editorial-workspace.articles.read':
      case 'content-library.articles.read':
        result = await service.listEditorial(input.actor, {
          ...(typeof step.arguments.search === 'string' && step.arguments.search.trim() !== '' ? { search: step.arguments.search.trim().slice(0, 100) } : {}),
          limit: String(typeof step.arguments.limit === 'number' ? Math.min(20, Math.max(1, Math.trunc(step.arguments.limit))) : 20),
        });
        break;
      case 'taxonomy-studio.taxonomy.read':
        result = await service.listTaxonomy(input.actor);
        break;
      case 'publisher-network.publishers.read':
        result = await service.listPublishers(input.actor, typeof step.arguments.search === 'string' ? { search: step.arguments.search.trim().slice(0, 100) } : {});
        break;
      case 'network-infrastructure.sites.read':
        result = await service.listConfiguration(input.actor, typeof step.arguments.search === 'string' ? { search: step.arguments.search.trim().slice(0, 100) } : {});
        break;
      case 'audit-security.audit.read':
        result = await service.auditLogs(input.actor, { limit: String(typeof step.arguments.limit === 'number' ? Math.min(20, Math.max(1, Math.trunc(step.arguments.limit))) : 20) });
        break;
      case 'system-operations.status.read':
        result = await service.operations(input.actor);
        break;
      case 'ads-control-center.ads.read':
        result = await new AdsService(new DrizzleAdsRepository(runtime.db)).overview(input.actor);
        break;
      case 'media-library.assets.read': {
        const repository = new DrizzlePublishingRepository(runtime.db);
        const storage = new R2ObjectStorageAdapter({ accountId: context.config.r2.accountId, bucketName: context.config.r2.bucketName, publicBucketName: context.config.r2.publicBucketName, accessKeyId: context.config.r2.accessKeyId, secretAccessKey: context.config.r2.secretAccessKey });
        const media = new MediaService(repository, storage, new UuidGenerator(), { maxBytes: context.config.r2.maxBytes, allowedTypes: context.config.r2.allowedTypes, uploadTtlSeconds: context.config.r2.uploadTtlSeconds, readTtlSeconds: context.config.r2.readTtlSeconds });
        result = await media.list(input.actor, { limit: '20' });
        break;
      }
      case 'distribution-control.deliveries.read':
      case 'live-results.deliveries.read': {
        const repository = new DrizzlePublishingRepository(runtime.db);
        const queue = new UpstashPublicationQueueAdapter({ url: context.config.redis.url, token: context.config.redis.token, namespace: context.config.redis.namespace, resourceId: context.config.redis.resourceId });
        const publication = new PublicationService(repository, queue, new UuidGenerator(), { maxAttempts: context.config.publishing.maxAttempts, delaysSeconds: context.config.publishing.retryDelaysSeconds });
        result = await publication.listJobs(input.actor);
        break;
      }
      case 'access-integrations.integrations.read': {
        const repository = new DrizzleIntegrationsRepository(runtime.db);
        const identifiers = new UuidGenerator();
        const apiKeys = await new ApiKeyService(repository, identifiers).list(input.actor);
        const accessKeys = await new DashboardAccessKeyService(new DrizzleDashboardAccessKeyRepository(runtime.db), identifiers).list(input.actor);
        const subscription = await new CustomerService(repository, identifiers).readSubscription(input.actor);
        result = apiKeys.ok && accessKeys.ok && subscription.ok
          ? { ok: true, value: { apiKeys: apiKeys.value, accessKeys: accessKeys.value, subscription: subscription.value } }
          : { ok: false };
        break;
      }
      case 'ai-control-center.ai-status.read':
        result = await new AiService(new DrizzleAiRepository(runtime.db)).overview(input.actor);
        break;
      default:
        return { ok: false, error: 'Kemampuan tidak tersedia untuk eksekusi.' };
    }

    if (typeof result === 'object' && result !== null && 'ok' in result && (result as { readonly ok?: unknown }).ok === false) {
      results.push({ id: step.id, capabilityId: step.capabilityId, ok: false, error: 'Operasi ditolak atau gagal pada layanan domain.' });
      continue;
    }
    results.push({ id: step.id, capabilityId: step.capabilityId, ok: true, result: boundedResult(result) });
  }

  return { ok: true, results };
}
