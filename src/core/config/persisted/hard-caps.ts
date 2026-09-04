import { HARD_SAFETY_CAPS } from '@/core/config/runtime/runtime-constants';

export const HARD_CAPS = Object.freeze({
  mediaMaxBytes: HARD_SAFETY_CAPS.mediaMaxBytes,
  uploadAuthorizationSeconds: HARD_SAFETY_CAPS.mediaUploadAuthorizationSeconds,
  readAuthorizationSeconds: HARD_SAFETY_CAPS.mediaReadAuthorizationSeconds,
  publicationMaxAttempts: HARD_SAFETY_CAPS.publicationMaxAttempts,
  publicationRetryDelaySeconds: HARD_SAFETY_CAPS.publicationRetryDelaySeconds,
  publicationRetryDelayEntries: HARD_SAFETY_CAPS.publicationRetryDelayEntries,
  publicationLeaseSeconds: HARD_SAFETY_CAPS.publicationLeaseAndDeadlineSeconds,
  publicationFunctionDeadlineSeconds: HARD_SAFETY_CAPS.publicationLeaseAndDeadlineSeconds,
  publicationBatchSize: HARD_SAFETY_CAPS.publicationBatchSize,
  webhookFreshnessSeconds: HARD_SAFETY_CAPS.webhookFreshnessSeconds,
  webhookReplayRetentionSeconds: HARD_SAFETY_CAPS.webhookReplayRetentionSeconds,
  publicCacheLifetimeSeconds: HARD_SAFETY_CAPS.publicCacheLifetimeSeconds,
  rateLimitMutationAllowance: HARD_SAFETY_CAPS.rateLimitMutationAllowance,
  rateLimitWebhookAllowance: HARD_SAFETY_CAPS.rateLimitWebhookAllowance,
  rateLimitPublicReadAllowance: HARD_SAFETY_CAPS.rateLimitPublicReadAllowance,
  rateLimitWindowSeconds: HARD_SAFETY_CAPS.rateLimitWindowSeconds,
} as const);

export const FUNCTION_DEADLINE_MIN_SECONDS = 10;

export const RETRY_DELAY_MIN_SECONDS = 1;