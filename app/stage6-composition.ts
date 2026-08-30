import 'server-only';

import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { ApiKeyService } from '@/application/stage6/api-key-service';
import { CustomerService } from '@/application/stage6/customer-service';
import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { TelegramMappingService } from '@/application/stage6/telegram-mapping-service';
import { TelegramWorkflowService } from '@/application/stage6/telegram-workflow-service';
import { WebhookService } from '@/application/stage6/webhook-service';
import type { RuntimeConfig } from '@/config/schema';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleStage3Repository } from '@/infrastructure/db/repositories/drizzle-stage3-repository';
import { DrizzleStage4Repository } from '@/infrastructure/db/repositories/drizzle-stage4-repository';
import { DrizzleStage6Repository } from '@/infrastructure/db/repositories/drizzle-stage6-repository';
import { UpstashPublicationQueueAdapter } from '@/infrastructure/redis/upstash-publication-queue';
import { UpstashRateLimitAdapter } from '@/infrastructure/redis/upstash-rate-limit';
import { R2ObjectStorageAdapter } from '@/infrastructure/storage/r2-object-storage';
import { TelegramBotApiAdapter } from '@/infrastructure/telegram/telegram-bot-api';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';

export function createProductionStage6(config: RuntimeConfig) {
  const runtime = createRuntimeDatabase(config); const identifiers = new UuidGenerator();
  const repository = new DrizzleStage6Repository(runtime.db); const stage3 = new DrizzleStage3Repository(runtime.db); const stage4 = new DrizzleStage4Repository(runtime.db);
  const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
  const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
  const telegram = new TelegramBotApiAdapter(config.telegram.botToken, config.r2.maxBytes);
  const sharedFactory = { create: () => ({
    articles: new TenantBusinessService(stage3, identifiers),
    media: new MediaService(stage4, storage, identifiers, { maxBytes: config.r2.maxBytes, allowedTypes: config.r2.allowedTypes, uploadTtlSeconds: config.r2.uploadTtlSeconds, readTtlSeconds: config.r2.readTtlSeconds }),
    publication: new PublicationService(stage4, queue, identifiers, { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds }),
  }) };
  return {
    repository, sharedFactory,
    apiKeys: new ApiKeyService(repository, identifiers), customer: new CustomerService(repository, identifiers), telegramMappings: new TelegramMappingService(repository, identifiers),
    rateLimits: new RateLimitService(new UpstashRateLimitAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace })),
    webhooks: new WebhookService(repository, { generic: config.security.genericWebhookSecret }, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds),
    telegram: new TelegramWorkflowService(repository, sharedFactory, telegram, telegram, config.telegram.webhookSecret, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds),
    close: runtime.close,
  };
}
