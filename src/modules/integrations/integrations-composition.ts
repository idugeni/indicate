import 'server-only';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { PublicationWorker } from '@/modules/publishing/publication-worker';
import { HttpSharePrewarm } from '@/modules/publishing/share-prewarm';
import { ApiKeyService } from '@/modules/integrations/api-key-service';
import { CustomerService } from '@/modules/integrations/customer-service';
import { RateLimitService } from '@/modules/integrations/rate-limit-service';
import { WebhookService } from '@/modules/integrations/webhook-service';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { DrizzlePublicationTargetPublisher } from '@/data/repos/publishing/publication-target-publisher';
import { DrizzleIntegrationsRepository } from '@/data/repos/integrations';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { UpstashRateLimitAdapter } from '@/integrations/redis/upstash-rate-limit';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { createResendEmailApiAdapter } from '@/integrations/email/resend-email-api';
import { createResendEventVerifier } from '@/integrations/email/resend-webhook-verify';
import { EmailWelcomeService } from '@/modules/integrations/email-welcome-service';
import { ResendWebhookService } from '@/modules/integrations/resend-webhook-service';
import { VercelSpendWebhookService } from '@/modules/integrations/vercel-spend-webhook-service';
import { VercelDeployWebhookService } from '@/modules/integrations/vercel-deploy-webhook-service';
import { UuidGenerator } from '@/core/system/uuid-generator';

export function createProductionIntegrations(config: RuntimeConfig, bootstrap: BootstrapConfig) {
  const runtime = getSharedRuntimeDatabase(bootstrap); const identifiers = new UuidGenerator();
  const repository = new DrizzleIntegrationsRepository(runtime.db); const dashboard = new DrizzleDashboardRepository(runtime.db); const publishing = new DrizzlePublishingRepository(runtime.db);
  const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, publicBucketName: config.r2.publicBucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
  const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
  const email = config.email === null ? null : createResendEmailApiAdapter(config.email.apiKey, config.email.defaultFrom);
  const emailWebhooks =
    config.email === null || config.email.webhookSecret === null
      ? null
      : new ResendWebhookService(repository, createResendEventVerifier(config.email.apiKey, config.email.webhookSecret));
  const sharedFactory = { create: () => ({
    articles: new TenantBusinessService(dashboard, identifiers, undefined, undefined),
    media: new MediaService(publishing, storage, identifiers, { maxBytes: config.r2.maxBytes, allowedTypes: config.r2.allowedTypes, uploadTtlSeconds: config.r2.uploadTtlSeconds, readTtlSeconds: config.r2.readTtlSeconds }),
    publication: new PublicationService(publishing, queue, identifiers, { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds }),
  }) };
  return {
    repository, sharedFactory,
    apiKeys: new ApiKeyService(repository, identifiers), customer: new CustomerService(repository, identifiers),
    rateLimits: new RateLimitService(new UpstashRateLimitAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })),
    webhooks: new WebhookService(repository, { generic: config.security.genericWebhookSecret }, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds),
    spendWebhooks:
      config.vercel.spendWebhookSecret === null
        ? null
        : new VercelSpendWebhookService(repository, config.vercel.teamId, config.vercel.spendWebhookSecret),
    deployWebhooks:
      config.vercel.deployWebhookSecret === null
        ? null
        : new VercelDeployWebhookService(repository, config.vercel.projectId, config.vercel.deployWebhookSecret),
    email,
    emailWebhooks,
    emailWelcome: new EmailWelcomeService(email),
  };
}

export async function createProductionIntegrationsContext() {
  const context = await getServerRuntimeContext();
  return createProductionIntegrations(context.config, context.bootstrap);
}

export interface PublicationWorkerComposition {
  readonly queue: UpstashPublicationQueueAdapter;
  /**
   * Build a worker bound to the shared runtime database.
   *
   * @remarks Deferred behind a factory so a poller can read the queue on an
   * idle tick without paying for the Postgres pool, the R2 client, or the
   * target publisher it does not need.
   */
  worker(): PublicationWorker;
}

/**
 * Compose the publication worker and its coordination queue.
 *
 * @param config - Assembled runtime configuration.
 * @param bootstrap - Validated bootstrap environment.
 * @returns Queue plus a worker factory bound to the shared runtime database.
 */
export function createPublicationWorkerComposition(config: RuntimeConfig, bootstrap: BootstrapConfig): PublicationWorkerComposition {
  const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
  return {
    queue,
    worker: () => {
      const runtime = getSharedRuntimeDatabase(bootstrap);
      return new PublicationWorker(
        new DrizzlePublishingRepository(runtime.db),
        queue,
        new DrizzlePublicationTargetPublisher(runtime.db),
        new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, publicBucketName: config.r2.publicBucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey }),
        {
          maxAttempts: config.publishing.maxAttempts,
          delaysSeconds: config.publishing.retryDelaysSeconds,
          leaseSeconds: config.publishing.leaseSeconds,
          batchSize: config.publishing.batchSize,
          functionDeadlineSeconds: config.publishing.functionDeadlineSeconds,
        },
        undefined,
        undefined,
        new HttpSharePrewarm(),
      );
    },
  };
}

export async function createPublicationWorkerContext(): Promise<PublicationWorkerComposition> {
  const context = await getServerRuntimeContext();
  return createPublicationWorkerComposition(context.config, context.bootstrap);
}
