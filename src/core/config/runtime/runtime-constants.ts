import 'server-only';

/** App-owned constants: fixed by release, never overridable by env/persisted config/requests. */

export const RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS = 300;

/** Bootstrap grammar: 1 = monolithic, 2 = reduced allowlist. */
export const BOOTSTRAP_GRAMMAR_VERSION = 2;

export const HARD_SAFETY_CAPS = Object.freeze({
  mediaMaxBytes: 52_428_800,
  mediaUploadAuthorizationSeconds: 900,
  mediaReadAuthorizationSeconds: 900,
  publicationMaxAttempts: 10,
  publicationRetryDelaySeconds: 3_600,
  publicationRetryDelayEntries: 9,
  publicationLeaseAndDeadlineSeconds: 300,
  publicationBatchSize: 100,
  webhookFreshnessSeconds: 900,
  webhookReplayRetentionSeconds: 86_400,
  publicCacheLifetimeSeconds: 3_600,
  rateLimitMutationAllowance: 1_000,
  rateLimitWebhookAllowance: 2_000,
  rateLimitPublicReadAllowance: 10_000,
  rateLimitWindowSeconds: 3_600,
} as const);