import { z } from 'zod';

import { normalizeConfiguredHostname } from '@/core/hostname/normalize-configured-hostname';

export { normalizeConfiguredHostname };

const SECRET_MIN_LENGTH = 8;

function parseCsv(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

const hostnameSchema = z.string().transform((value, context) => {
  const normalized = normalizeConfiguredHostname(value);
  if (normalized === null) {
    context.addIssue({ code: 'custom', message: 'invalid_hostname' });
    return z.NEVER;
  }
  return normalized;
});

const rootHostnameSchema = hostnameSchema.pipe(
  z.string().refine((hostname) => hostname.endsWith('.web.id'), 'root_hostname_must_end_with_web_id'),
);

const csvSchema = z.string().transform(parseCsv);
const secretSchema = z.string().min(SECRET_MIN_LENGTH, 'secret_too_short');
const httpsUrlSchema = z.url().refine((value) => value.startsWith('https://'), 'https_required');

const integerStringSchema = z
  .string()
  .regex(/^\d+$/, 'integer_required')
  .transform((value) => Number(value));

function boundedInteger(defaultValue: number, minimum: number, maximum: number) {
  return z
    .string()
    .optional()
    .transform((value) => value ?? String(defaultValue))
    .pipe(integerStringSchema.pipe(z.number().int().min(minimum).max(maximum)));
}

const rawRuntimeConfigSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_ENVIRONMENT: z.string().regex(/^[a-z0-9-]{1,32}$/).default('development'),
    SCHEMA_GATE_MODE: z.enum(['contract', 'live']).default('contract'),
    DASHBOARD_HOST: hostnameSchema.default('indicate.web.id'),
    API_HOST: hostnameSchema.default('api.indicate.web.id'),
    WEBHOOK_HOST: hostnameSchema.default('webhook.indicate.web.id'),
    MVP_ROOT_HOSTS: csvSchema.pipe(z.array(rootHostnameSchema).length(3)),

    NEXT_PUBLIC_SITE_URL: z.url().default('https://indicate.web.id'),
    NEXT_PUBLIC_SUPABASE_URL: httpsUrlSchema,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(8),
    SUPABASE_PROJECT_REF: z.string().regex(/^[a-z0-9]{8,32}$/),
    SUPABASE_SECRET_KEY: secretSchema,
    DATABASE_POOL_URL: z.url({ protocol: /^postgresql$/ }),
    DATABASE_DIRECT_URL: z.url({ protocol: /^postgresql$/ }),

    CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
    CLOUDFLARE_API_TOKEN: secretSchema,
    CLOUDFLARE_ORIGIN_SECRET: secretSchema,
    CLOUDFLARE_ZONE_IDS: csvSchema.pipe(z.array(z.string().min(1)).min(1).max(3)),
    CLOUDFLARE_EXPECTED_NAMESERVERS: csvSchema.pipe(z.array(hostnameSchema).min(2).max(5)),
    CLOUDFLARE_SSL_MODE: z.literal('full_strict'),

    VERCEL_PROJECT_ID: z.string().min(1),
    VERCEL_TEAM_ID: z.string().min(1),
    VERCEL_API_TOKEN: secretSchema,
    VERCEL_PRODUCTION_TARGET: hostnameSchema,

    R2_ACCOUNT_ID: z.string().min(1),
    R2_BUCKET_NAME: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
    R2_ACCESS_KEY_ID: secretSchema,
    R2_SECRET_ACCESS_KEY: secretSchema,
    MEDIA_MAX_BYTES: boundedInteger(10_485_760, 1_024, 52_428_800),
    MEDIA_UPLOAD_TTL_SECONDS: boundedInteger(600, 60, 900),
    MEDIA_READ_TTL_SECONDS: boundedInteger(300, 30, 900),
    MEDIA_ALLOWED_TYPES: csvSchema.pipe(
      z.array(z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])).min(1),
    ),

    UPSTASH_REDIS_REST_URL: httpsUrlSchema,
    UPSTASH_REDIS_REST_TOKEN: secretSchema,
    UPSTASH_REDIS_RESOURCE_ID: z.string().regex(/^[A-Za-z0-9_-]{3,128}$/),
    REDIS_NAMESPACE: z.string().regex(/^indicate:[a-z0-9-]+:v[1-9][0-9]*$/),

    PUBLISH_MAX_ATTEMPTS: boundedInteger(5, 1, 10),
    PUBLISH_RETRY_DELAYS_SECONDS: csvSchema.pipe(
      z.array(integerStringSchema.pipe(z.number().int().min(1).max(3_600))).min(1).max(9),
    ),
    PUBLISH_LEASE_SECONDS: boundedInteger(30, 10, 300),
    PUBLISH_BATCH_SIZE: boundedInteger(10, 1, 100),
    PUBLISH_FUNCTION_DEADLINE_SECONDS: boundedInteger(50, 10, 300),

    TELEGRAM_BOT_TOKEN: secretSchema,
    TELEGRAM_WEBHOOK_SECRET: secretSchema,
    GENERIC_WEBHOOK_SECRET: secretSchema,
    TELEGRAM_WEBHOOK_URL: httpsUrlSchema,
    WEBHOOK_FRESHNESS_SECONDS: boundedInteger(300, 30, 900),
    WEBHOOK_REPLAY_TTL_SECONDS: boundedInteger(900, 30, 86_400),
    CRON_SECRET: secretSchema,
    REDACTION_POLICY_VERSION: z.string().regex(/^v[1-9][0-9]*$/).default('v1'),

    CACHE_DEFAULT_TTL_SECONDS: boundedInteger(300, 0, 3_600),
    CACHE_VERSION: z.string().regex(/^v[1-9][0-9]*$/).default('v1'),
    RATE_LIMIT_MUTATION_ALLOWANCE: boundedInteger(30, 1, 1_000),
    RATE_LIMIT_MUTATION_WINDOW_SECONDS: boundedInteger(60, 1, 3_600),
    RATE_LIMIT_WEBHOOK_ALLOWANCE: boundedInteger(60, 1, 2_000),
    RATE_LIMIT_WEBHOOK_WINDOW_SECONDS: boundedInteger(60, 1, 3_600),
    RATE_LIMIT_PUBLIC_READ_ALLOWANCE: boundedInteger(300, 1, 10_000),
    RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS: boundedInteger(60, 1, 3_600),
    DEFAULT_LOCALE: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).default('id-ID'),
    SITE_FALLBACK_ASSET_URL: httpsUrlSchema,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production') {
      for (const [name, secret] of [
        ['CLOUDFLARE_ORIGIN_SECRET', value.CLOUDFLARE_ORIGIN_SECRET],
        ['TELEGRAM_WEBHOOK_SECRET', value.TELEGRAM_WEBHOOK_SECRET],
        ['GENERIC_WEBHOOK_SECRET', value.GENERIC_WEBHOOK_SECRET],
        ['CRON_SECRET', value.CRON_SECRET],
      ] as const) {
        if (secret.length < 24 || /(?:change[ -]?me|example|placeholder|sentinel|development|test-secret)/iu.test(secret)) {
          context.addIssue({ code: 'custom', path: [name], message: 'production_secret_not_bounded' });
        }
      }
      for (const [name, secret, minimum] of [
        ['R2_ACCESS_KEY_ID', value.R2_ACCESS_KEY_ID, 20],
        ['R2_SECRET_ACCESS_KEY', value.R2_SECRET_ACCESS_KEY, 32],
      ] as const) {
        if (secret.length < minimum || /(?:change[ -]?me|example|placeholder|sentinel|development|test-secret)/iu.test(secret)) {
          context.addIssue({ code: 'custom', path: [name], message: 'production_credential_not_bounded' });
        }
      }
    }
    if (value.NODE_ENV === 'production' && value.SCHEMA_GATE_MODE !== 'live') {
      context.addIssue({ code: 'custom', path: ['SCHEMA_GATE_MODE'], message: 'live_schema_gate_required_in_production' });
    }
    const controlHosts = [value.DASHBOARD_HOST, value.API_HOST, value.WEBHOOK_HOST];
    if (new Set(controlHosts).size !== controlHosts.length) {
      context.addIssue({ code: 'custom', path: ['DASHBOARD_HOST'], message: 'control_hosts_must_be_distinct' });
    }

    if (new Set(value.MVP_ROOT_HOSTS).size !== value.MVP_ROOT_HOSTS.length) {
      context.addIssue({ code: 'custom', path: ['MVP_ROOT_HOSTS'], message: 'root_hosts_must_be_distinct' });
    }

    if (value.MVP_ROOT_HOSTS.some((host) => controlHosts.includes(host))) {
      context.addIssue({ code: 'custom', path: ['MVP_ROOT_HOSTS'], message: 'root_host_conflicts_with_control_plane' });
    }

    if (new Set(value.CLOUDFLARE_ZONE_IDS).size !== value.CLOUDFLARE_ZONE_IDS.length) {
      context.addIssue({ code: 'custom', path: ['CLOUDFLARE_ZONE_IDS'], message: 'zone_ids_must_be_distinct' });
    }

    const projectRef = value.SUPABASE_PROJECT_REF;
    const supabaseHost = new URL(value.NEXT_PUBLIC_SUPABASE_URL).hostname;
    const pooledDatabase = new URL(value.DATABASE_POOL_URL);
    const directDatabase = new URL(value.DATABASE_DIRECT_URL);
    if (supabaseHost !== `${projectRef}.supabase.co`) {
      context.addIssue({ code: 'custom', path: ['NEXT_PUBLIC_SUPABASE_URL'], message: 'supabase_project_identity_mismatch' });
    }
    if (!pooledDatabase.hostname.endsWith('.pooler.supabase.com') || pooledDatabase.username !== `indicate_runtime.${projectRef}`) {
      context.addIssue({ code: 'custom', path: ['DATABASE_POOL_URL'], message: 'supabase_project_identity_mismatch' });
    }
    if (directDatabase.hostname !== `db.${projectRef}.supabase.co`) {
      context.addIssue({ code: 'custom', path: ['DATABASE_DIRECT_URL'], message: 'supabase_project_identity_mismatch' });
    }

    if (value.PUBLISH_RETRY_DELAYS_SECONDS.length > value.PUBLISH_MAX_ATTEMPTS - 1) {
      context.addIssue({
        code: 'custom',
        path: ['PUBLISH_RETRY_DELAYS_SECONDS'],
        message: 'retry_delays_exceed_available_retries',
      });
    }

    if (value.WEBHOOK_REPLAY_TTL_SECONDS < value.WEBHOOK_FRESHNESS_SECONDS) {
      context.addIssue({
        code: 'custom',
        path: ['WEBHOOK_REPLAY_TTL_SECONDS'],
        message: 'replay_ttl_must_cover_freshness_window',
      });
    }
  });

type ParsedRuntimeEnvironment = z.infer<typeof rawRuntimeConfigSchema>;

export interface RuntimeConfig {
  readonly environment: string;
  readonly schemaGateMode: 'contract' | 'live';
  readonly hosts: {
    readonly dashboard: string;
    readonly api: string;
    readonly webhook: string;
    readonly mvpRoots: readonly [string, string, string];
    readonly reserved: ReadonlySet<string>;
  };
  readonly supabase: {
    readonly projectRef: string;
    readonly url: string;
    readonly publishableKey: string;
    readonly secretKey: string;
    readonly pooledDatabaseUrl: string;
    readonly directDatabaseUrl: string;
  };
  readonly cloudflare: {
    readonly accountId: string;
    readonly apiToken: string;
    readonly originSecret: string;
    readonly zoneIds: readonly string[];
    readonly expectedNameservers: readonly string[];
    readonly sslMode: 'full_strict';
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
  readonly telegram: {
    readonly botToken: string;
    readonly webhookSecret: string;
    readonly webhookUrl: string;
  };
  readonly security: {
    readonly webhookFreshnessSeconds: number;
    readonly webhookReplayTtlSeconds: number;
    readonly genericWebhookSecret: string;
    readonly cronSecret: string;
    readonly redactionPolicyVersion: string;
  };
  readonly cache: {
    readonly defaultTtlSeconds: number;
    readonly version: string;
  };
  readonly rateLimits: Readonly<Record<'mutation' | 'webhook' | 'publicRead', {
    readonly allowance: number;
    readonly windowSeconds: number;
  }>>;
  readonly seo: {
    readonly defaultLocale: string;
    readonly fallbackAssetUrl: string;
  };
}

export interface ConfigValidationIssue {
  readonly path: string;
  readonly category: string;
}

export type RuntimeConfigResult =
  | { readonly success: true; readonly config: RuntimeConfig }
  | { readonly success: false; readonly issues: readonly ConfigValidationIssue[] };

function toRuntimeConfig(value: ParsedRuntimeEnvironment): RuntimeConfig {
  const roots = value.MVP_ROOT_HOSTS as [string, string, string];
  const zones = value.CLOUDFLARE_ZONE_IDS;
  return Object.freeze({
    environment: value.APP_ENVIRONMENT,
    schemaGateMode: value.SCHEMA_GATE_MODE,
    hosts: Object.freeze({
      dashboard: value.DASHBOARD_HOST,
      api: value.API_HOST,
      webhook: value.WEBHOOK_HOST,
      mvpRoots: Object.freeze(roots),
      reserved: new Set([value.DASHBOARD_HOST, value.API_HOST, value.WEBHOOK_HOST]),
    }),
    supabase: Object.freeze({
      projectRef: value.SUPABASE_PROJECT_REF,
      url: value.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      secretKey: value.SUPABASE_SECRET_KEY,
      pooledDatabaseUrl: value.DATABASE_POOL_URL,
      directDatabaseUrl: value.DATABASE_DIRECT_URL,
    }),
    cloudflare: Object.freeze({
      accountId: value.CLOUDFLARE_ACCOUNT_ID,
      apiToken: value.CLOUDFLARE_API_TOKEN,
      originSecret: value.CLOUDFLARE_ORIGIN_SECRET,
      zoneIds: Object.freeze(zones),
      expectedNameservers: Object.freeze(value.CLOUDFLARE_EXPECTED_NAMESERVERS),
      sslMode: value.CLOUDFLARE_SSL_MODE,
    }),
    vercel: Object.freeze({
      projectId: value.VERCEL_PROJECT_ID,
      teamId: value.VERCEL_TEAM_ID,
      apiToken: value.VERCEL_API_TOKEN,
      productionTarget: value.VERCEL_PRODUCTION_TARGET,
    }),
    r2: Object.freeze({
      accountId: value.R2_ACCOUNT_ID,
      bucketName: value.R2_BUCKET_NAME,
      accessKeyId: value.R2_ACCESS_KEY_ID,
      secretAccessKey: value.R2_SECRET_ACCESS_KEY,
      maxBytes: value.MEDIA_MAX_BYTES,
      uploadTtlSeconds: value.MEDIA_UPLOAD_TTL_SECONDS,
      readTtlSeconds: value.MEDIA_READ_TTL_SECONDS,
      allowedTypes: Object.freeze(value.MEDIA_ALLOWED_TYPES),
    }),
    redis: Object.freeze({
      url: value.UPSTASH_REDIS_REST_URL,
      token: value.UPSTASH_REDIS_REST_TOKEN,
      resourceId: value.UPSTASH_REDIS_RESOURCE_ID,
      namespace: value.REDIS_NAMESPACE,
    }),
    publishing: Object.freeze({
      maxAttempts: value.PUBLISH_MAX_ATTEMPTS,
      retryDelaysSeconds: Object.freeze(value.PUBLISH_RETRY_DELAYS_SECONDS),
      leaseSeconds: value.PUBLISH_LEASE_SECONDS,
      batchSize: value.PUBLISH_BATCH_SIZE,
      functionDeadlineSeconds: value.PUBLISH_FUNCTION_DEADLINE_SECONDS,
    }),
    telegram: Object.freeze({
      botToken: value.TELEGRAM_BOT_TOKEN,
      webhookSecret: value.TELEGRAM_WEBHOOK_SECRET,
      webhookUrl: value.TELEGRAM_WEBHOOK_URL,
    }),
    security: Object.freeze({
      webhookFreshnessSeconds: value.WEBHOOK_FRESHNESS_SECONDS,
      webhookReplayTtlSeconds: value.WEBHOOK_REPLAY_TTL_SECONDS,
      genericWebhookSecret: value.GENERIC_WEBHOOK_SECRET,
      cronSecret: value.CRON_SECRET,
      redactionPolicyVersion: value.REDACTION_POLICY_VERSION,
    }),
    cache: Object.freeze({
      defaultTtlSeconds: value.CACHE_DEFAULT_TTL_SECONDS,
      version: value.CACHE_VERSION,
    }),
    rateLimits: Object.freeze({
      mutation: Object.freeze({ allowance: value.RATE_LIMIT_MUTATION_ALLOWANCE, windowSeconds: value.RATE_LIMIT_MUTATION_WINDOW_SECONDS }),
      webhook: Object.freeze({ allowance: value.RATE_LIMIT_WEBHOOK_ALLOWANCE, windowSeconds: value.RATE_LIMIT_WEBHOOK_WINDOW_SECONDS }),
      publicRead: Object.freeze({ allowance: value.RATE_LIMIT_PUBLIC_READ_ALLOWANCE, windowSeconds: value.RATE_LIMIT_PUBLIC_READ_WINDOW_SECONDS }),
    }),
    seo: Object.freeze({
      defaultLocale: value.DEFAULT_LOCALE,
      fallbackAssetUrl: value.SITE_FALLBACK_ASSET_URL,
    }),
  });
}

export function validateRuntimeConfig(environment: Record<string, string | undefined>): RuntimeConfigResult {
  const parsed = rawRuntimeConfigSchema.safeParse(environment);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => ({
        path: issue.path.join('.') || 'configuration',
        category: issue.message,
      }))
      .sort((left, right) => `${left.path}:${left.category}`.localeCompare(`${right.path}:${right.category}`));
    return { success: false, issues: Object.freeze(issues) };
  }
  return { success: true, config: toRuntimeConfig(parsed.data) };
}
