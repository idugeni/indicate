import 'server-only';

/** App-owned constants: fixed by release, never overridable by env/persisted config/requests. */

export const RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS = 300;

/**
 * Lifetime of the shared (Redis) runtime snapshot, independent of the
 * in-process entry.
 *
 * @remarks The key embeds `configurationVersion`, so a committed revision
 * already misses every older key and correctness never depends on this value —
 * it only bounds how long a dead revision's blob occupies Redis. Measured on the
 * tenant fleet it decides how often Postgres re-reads the whole configuration:
 * with the shared TTL pinned to the 300-second in-process entry, every window
 * fell through to a full read of `read_runtime_config_active_sites()` plus
 * `read_runtime_config_site_settings()` — 3.65 MB on the wire for 4,422 sites,
 * about 2.2 GB/day against a 5 GB monthly Supabase Free egress quota. A hit
 * slides this window forward, so the full read now happens once per committed
 * revision instead of once per window. Two further guards keep the monthly
 * Upstash bandwidth inside quota: the refresh re-adopts the in-process
 * snapshot without downloading the shared blob when the revision is unchanged
 * (steady state costs one revision check plus a best-effort touch), and the
 * shared blob is gzip+base64 encoded (`UpstashSnapshotStore`), which measured
 * ~50x smaller on repetitive site-settings JSON.
 */
export const RUNTIME_CONFIG_SNAPSHOT_SHARED_TTL_SECONDS = 3_600;

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