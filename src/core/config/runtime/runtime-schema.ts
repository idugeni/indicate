/**
 * Service configuration shape: every field is sourced from either the
 * Bootstrap environment (connections, secrets, hosts, build-time values) or
 * the PostgreSQL runtime snapshot (policies, deployment identifiers), assembled
 * fail-closed by `getServerRuntimeContext()`. Nothing here is read from
 * per-feature environment variables.
 */
export interface RuntimeConfig {
  readonly environment: string;
  readonly schemaGateMode: 'contract' | 'live';
  readonly hosts: {
    readonly dashboard: string;
    readonly api: string;
    readonly webhook: string;
    readonly reserved: ReadonlySet<string>;
  };
  readonly supabase: {
    readonly pooledDatabaseUrl: string;
  };
  readonly cloudflare: {
    readonly accountId: string;
    readonly apiToken: string;
    readonly originSecret: string;
  };
  readonly vercel: {
    readonly projectId: string;
    readonly teamId: string;
    readonly apiToken: string;
    readonly productionTarget: string;
  };
  readonly r2: {
    readonly accountId: string;
    readonly bucketName: string;
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly maxBytes: number;
    readonly uploadTtlSeconds: number;
    readonly readTtlSeconds: number;
    readonly allowedTypes: readonly string[];
    /** Public media bucket + host; null when unconfigured (route URLs stay authoritative). */
    readonly publicBucketName: string | null;
    readonly publicHost: string | null;
    /** Daily WORM audit bucket; null when unconfigured (export disabled). */
    readonly audit: {
      readonly bucketName: string;
      readonly accessKeyId: string;
      readonly secretAccessKey: string;
    } | null;
  };
  readonly redis: {
    readonly url: string;
    readonly token: string;
    readonly resourceId: string;
    readonly namespace: string;
  };
  readonly publishing: {
    readonly maxAttempts: number;
    readonly retryDelaysSeconds: readonly number[];
    readonly leaseSeconds: number;
    readonly batchSize: number;
    readonly functionDeadlineSeconds: number;
  };
  /** Resend transactional email; null when unconfigured (sender disabled). */
  readonly email: {
    readonly apiKey: string;
    readonly defaultFrom: string;
    /** Resend webhook signing secret; null when the endpoint is disabled. */
    readonly webhookSecret: string | null;
  } | null;
  readonly security: {
    readonly webhookFreshnessSeconds: number;
    readonly webhookReplayTtlSeconds: number;
    readonly genericWebhookSecret: string;
    readonly cronSecret: string;
  };
  readonly cache: {
    readonly defaultTtlSeconds: number;
  };
  readonly rateLimits: Readonly<Record<'mutation' | 'webhook' | 'publicRead', {
    readonly allowance: number;
    readonly windowSeconds: number;
  }>>;
  readonly seo: {
    readonly defaultLocale: string;
    readonly defaultAssetUrl: string;
  };
}
