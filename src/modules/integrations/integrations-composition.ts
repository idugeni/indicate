import 'server-only';

import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { ApiKeyService } from '@/modules/integrations/api-key-service';
import { CustomerService } from '@/modules/integrations/customer-service';
import { RateLimitService } from '@/modules/integrations/rate-limit-service';
import { TelegramMappingService } from '@/modules/integrations/telegram-mapping-service';
import { TelegramWorkflowService } from '@/modules/integrations/telegram-workflow-service';
import { WebhookService } from '@/modules/integrations/webhook-service';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { DrizzleIntegrationsRepository } from '@/data/repos/integrations';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { UpstashRateLimitAdapter } from '@/integrations/redis/upstash-rate-limit';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { createResendEmailApiAdapter } from '@/integrations/email/resend-email-api';
import { createResendEventVerifier } from '@/integrations/email/resend-webhook-verify';
import { TelegramBotApiAdapter } from '@/integrations/telegram/telegram-bot-api';
import { EmailWelcomeService } from '@/modules/integrations/email-welcome-service';
import { ResendWebhookService } from '@/modules/integrations/resend-webhook-service';
import { UuidGenerator } from '@/core/system/uuid-generator';

export function createProductionIntegrations(config: RuntimeConfig, bootstrap: BootstrapConfig) {
  const runtime = getSharedRuntimeDatabase(bootstrap); const identifiers = new UuidGenerator();
  const repository = new DrizzleIntegrationsRepository(runtime.db); const dashboard = new DrizzleDashboardRepository(runtime.db); const publishing = new DrizzlePublishingRepository(runtime.db);
  const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
  const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
  const telegram = new TelegramBotApiAdapter(config.telegram.botToken, config.r2.maxBytes);
  const email = config.email === null ? null : createResendEmailApiAdapter(config.email.apiKey, config.email.defaultFrom);
  const emailWebhooks =
    config.email === null || config.email.webhookSecret === null
      ? null
      : new ResendWebhookService(repository, createResendEventVerifier(config.email.apiKey, config.email.webhookSecret));
  const sharedFactory = { create: () => ({
    articles: new TenantBusinessService(dashboard, identifiers),
    media: new MediaService(publishing, storage, identifiers, { maxBytes: config.r2.maxBytes, allowedTypes: config.r2.allowedTypes, uploadTtlSeconds: config.r2.uploadTtlSeconds, readTtlSeconds: config.r2.readTtlSeconds }),
    publication: new PublicationService(publishing, queue, identifiers, { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds }),
  }) };
  return {
    repository, sharedFactory,
    apiKeys: new ApiKeyService(repository, identifiers), customer: new CustomerService(repository, identifiers), telegramMappings: new TelegramMappingService(repository, identifiers),
    rateLimits: new RateLimitService(new UpstashRateLimitAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })),
    webhooks: new WebhookService(repository, { generic: config.security.genericWebhookSecret }, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds),
    email,
    emailWebhooks,
    emailWelcome: new EmailWelcomeService(email),
    telegram: new TelegramWorkflowService(repository, sharedFactory, telegram, telegram, config.telegram.webhookSecret, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds, `https://${config.hosts.dashboard}/brand/telegram-welcome.png`, undefined, `https://${config.hosts.dashboard}/tg/app`),
  };
}

export async function createProductionIntegrationsContext() {
  const context = await getServerRuntimeContext();
  return createProductionIntegrations(context.config, context.bootstrap);
}
