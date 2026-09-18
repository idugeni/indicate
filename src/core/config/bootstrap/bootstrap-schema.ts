import 'server-only';

import { z } from 'zod';

import { normalizeConfiguredHostname } from '@/core/hostname/normalize-configured-hostname';
import { BOOTSTRAP_ENVIRONMENTS, type BootstrapEnvironment, type SchemaGateMode } from '@/core/config/bootstrap/bootstrap-env';
import { SecretString } from '@/core/config/secret-string';

export { normalizeConfiguredHostname };

const SECRET_MIN_LENGTH = 8;

/** `INDICATE_*` prefixes owned here: unknown keys under them fail; unrelated platform keys ignored. */
const INDICATE_NAMESPACE_PREFIXES = [
  'DASHBOARD_',
  'API_',
  'WEBHOOK_',
  'NEXT_PUBLIC_SUPABASE_',
  'SUPABASE_',
  'DATABASE_',
  'CLOUDFLARE_',
  'VERCEL_',
  'R2_',
  'UPSTASH_',
  'TELEGRAM_',
  'RESEND_',
  'GENERIC_',
  'CRON_',
  'DEFAULT_',
  'SITE_',
  'APP_',
] as const;

const BOOTSTRAP_ALLOWED_KEYS = new Set<string>([
  'NODE_ENV',
  'DASHBOARD_HOST',
  'API_HOST',
  'WEBHOOK_HOST',
  'DOCS_HOST',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'DEFAULT_LOCALE',
  'SITE_DEFAULT_ASSET_URL',
  'SUPABASE_PROJECT_REF',
  'DATABASE_POOL_URL',
  'DATABASE_DIRECT_URL',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ORIGIN_SECRET',
  'VERCEL_API_TOKEN',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_AUDIT_BUCKET_NAME',
  'R2_AUDIT_ACCESS_KEY_ID',
  'R2_AUDIT_SECRET_ACCESS_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'RESEND_DEFAULT_FROM',
  'RESEND_WEBHOOK_SECRET',
  'GENERIC_WEBHOOK_SECRET',
  'CRON_SECRET',
]);

const hostnameSchema = z
  .string()
  .transform((value, context) => {
    const normalized = normalizeConfiguredHostname(value);
    if (normalized === null) {
      context.addIssue({ code: 'custom', message: 'invalid_hostname' });
      return z.NEVER;
    }
    return normalized;
  })
  .pipe(z.string());

const secretSchema = z.string().min(SECRET_MIN_LENGTH, 'secret_too_short');
const httpsUrlSchema = z.url().refine((value) => value.startsWith('https://'), 'https_required');

const bootstrapSchema = z
  .object({
    NODE_ENV: z.enum(BOOTSTRAP_ENVIRONMENTS).default('development'),
    DASHBOARD_HOST: hostnameSchema.default('indicate.web.id'),
    API_HOST: hostnameSchema.default('api.indicate.web.id'),
    WEBHOOK_HOST: hostnameSchema.default('webhook.indicate.web.id'),
    DOCS_HOST: hostnameSchema.default('docs.indicate.web.id'),

    NEXT_PUBLIC_SUPABASE_URL: httpsUrlSchema,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(8).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(8).optional(),
    DEFAULT_LOCALE: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).default('id-ID'),
    SITE_DEFAULT_ASSET_URL: httpsUrlSchema.default('https://indicate.web.id/assets/default.png'),
    SUPABASE_PROJECT_REF: z.string().regex(/^[a-z0-9]{8,32}$/).optional(),
    DATABASE_POOL_URL: z.url({ protocol: /^postgresql$/ }),
    DATABASE_DIRECT_URL: z.url({ protocol: /^postgresql$/ }),

    CLOUDFLARE_API_TOKEN: secretSchema,
    CLOUDFLARE_ORIGIN_SECRET: secretSchema,
    VERCEL_API_TOKEN: secretSchema,
    R2_ACCESS_KEY_ID: secretSchema,
    R2_SECRET_ACCESS_KEY: secretSchema,
    R2_AUDIT_BUCKET_NAME: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/).optional(),
    R2_AUDIT_ACCESS_KEY_ID: secretSchema.optional(),
    R2_AUDIT_SECRET_ACCESS_KEY: secretSchema.optional(),
    UPSTASH_REDIS_REST_URL: httpsUrlSchema,
    UPSTASH_REDIS_REST_TOKEN: secretSchema,
    TELEGRAM_BOT_TOKEN: secretSchema,
    TELEGRAM_WEBHOOK_SECRET: secretSchema,
    RESEND_API_KEY: secretSchema.optional(),
    RESEND_DEFAULT_FROM: z.string().min(3).max(320).optional(),
    RESEND_WEBHOOK_SECRET: secretSchema.optional(),
    GENERIC_WEBHOOK_SECRET: secretSchema,
    CRON_SECRET: secretSchema,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production') {
      for (const [name, secret] of [
        ['CLOUDFLARE_API_TOKEN', value.CLOUDFLARE_API_TOKEN],
        ['CLOUDFLARE_ORIGIN_SECRET', value.CLOUDFLARE_ORIGIN_SECRET],
        ['VERCEL_API_TOKEN', value.VERCEL_API_TOKEN],
        ['TELEGRAM_BOT_TOKEN', value.TELEGRAM_BOT_TOKEN],
        ['TELEGRAM_WEBHOOK_SECRET', value.TELEGRAM_WEBHOOK_SECRET],
        ['GENERIC_WEBHOOK_SECRET', value.GENERIC_WEBHOOK_SECRET],
        ['CRON_SECRET', value.CRON_SECRET],
      ] as const) {
        if (secret.length < 24 || /(?:change[ -]?me|example|placeholder|sentinel|development|test-secret)/iu.test(secret)) {
          context.addIssue({ code: 'custom', path: [name], message: 'production_secret_not_bounded' });
        }
      }
      if (
        value.RESEND_API_KEY !== undefined &&
        (value.RESEND_API_KEY.length < 24 || /(?:change[ -]?me|example|placeholder|sentinel|development|test-secret)/iu.test(value.RESEND_API_KEY))
      ) {
        context.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'production_secret_not_bounded' });
      }
    }
    if ((value.RESEND_API_KEY === undefined) !== (value.RESEND_DEFAULT_FROM === undefined)) {
      context.addIssue({
        code: 'custom',
        path: [value.RESEND_API_KEY === undefined ? 'RESEND_API_KEY' : 'RESEND_DEFAULT_FROM'],
        message: 'resend_email_incomplete',
      });
    }
    const controlHosts = [value.DASHBOARD_HOST, value.API_HOST, value.WEBHOOK_HOST, value.DOCS_HOST];
    if (new Set(controlHosts).size !== controlHosts.length) {
      context.addIssue({ code: 'custom', path: ['DASHBOARD_HOST'], message: 'control_hosts_must_be_distinct' });
    }
  })
  .superRefine((value, context) => {
    const projectRef = value.SUPABASE_PROJECT_REF;
    if (projectRef !== undefined) {
      const supabaseHost = new URL(value.NEXT_PUBLIC_SUPABASE_URL).hostname;
      const pooledDatabase = new URL(value.DATABASE_POOL_URL);
      const directDatabase = new URL(value.DATABASE_DIRECT_URL);
      if (supabaseHost !== `${projectRef}.supabase.co`) {
        context.addIssue({ code: 'custom', path: ['NEXT_PUBLIC_SUPABASE_URL'], message: 'supabase_project_identity_mismatch' });
      }
      if (value.DATABASE_POOL_URL.includes(projectRef) === false && !pooledDatabase.hostname.endsWith('.pooler.supabase.com')) {
        context.addIssue({ code: 'custom', path: ['DATABASE_POOL_URL'], message: 'supabase_project_identity_mismatch' });
      }
      if (directDatabase.hostname !== `db.${projectRef}.supabase.co`) {
        context.addIssue({ code: 'custom', path: ['DATABASE_DIRECT_URL'], message: 'supabase_project_identity_mismatch' });
      }
    }
  });

type ParsedBootstrap = z.infer<typeof bootstrapSchema>;

export interface BootstrapConfig {
  readonly environment: BootstrapEnvironment;
  readonly schemaGateMode: SchemaGateMode;
  readonly controlHosts: Readonly<{
    readonly dashboard: string;
    readonly api: string;
    readonly webhook: string;
    readonly docs: string;
    readonly reserved: ReadonlySet<string>;
  }>;
  readonly seo: Readonly<{
    readonly defaultLocale: string;
    readonly defaultAssetUrl: string;
  }>;
  readonly supabase: Readonly<{
    readonly projectRef?: string;
    readonly url: string;
    /** Public, client-safe anonymized key (not a secret). */
    readonly anonKey: string;
  }>;
  readonly database: Readonly<{
    readonly pooledUrl: SecretString;
    readonly directUrl: SecretString;
  }>;
  readonly credentials: Readonly<{
    readonly cloudflareApiToken: SecretString;
    readonly cloudflareOriginSecret: SecretString;
    readonly vercelApiToken: SecretString;
    readonly r2AccessKeyId: SecretString;
    readonly r2SecretAccessKey: SecretString;
    /** WORM audit bucket (opsional; export audit mati bila null). Kredensial audit scoped terpisah bila diisi. */
    readonly r2AuditBucketName: string | null;
    readonly r2AuditAccessKeyId: SecretString | null;
    readonly r2AuditSecretAccessKey: SecretString | null;
    readonly upstashRestUrl: string;
    readonly upstashRestToken: SecretString;
    readonly telegramBotToken: SecretString;
    readonly telegramWebhookSecret: SecretString;
    /** Pasangan kredensial Resend; null bila email transaksional belum dikonfigurasi. */
    readonly resendApiKey: SecretString | null;
    readonly resendDefaultFrom: string | null;
    /** Secret penandatangan webhook Resend (Svix); null bila endpoint nonaktif. */
    readonly resendWebhookSecret: SecretString | null;
    readonly genericWebhookSecret: SecretString;
    readonly cronSecret: SecretString;
  }>;
}

export interface ConfigIssue {
  readonly path: string;
  readonly category: string;
}

export type BootstrapConfigResult =
  | { readonly success: true; readonly config: BootstrapConfig }
  | { readonly success: false; readonly issues: readonly ConfigIssue[] };

function toBootstrapConfig(value: ParsedBootstrap): BootstrapConfig {
  const anonKey = value.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  const projectRef = value.SUPABASE_PROJECT_REF;
  return Object.freeze({
    environment: 'production' as const,
    schemaGateMode: 'live' as const,
    controlHosts: Object.freeze({
      dashboard: value.DASHBOARD_HOST,
      api: value.API_HOST,
      webhook: value.WEBHOOK_HOST,
      docs: value.DOCS_HOST,
      reserved: new Set([value.DASHBOARD_HOST, value.API_HOST, value.WEBHOOK_HOST, value.DOCS_HOST]),
    }),
    seo: Object.freeze({
      defaultLocale: value.DEFAULT_LOCALE,
      defaultAssetUrl: value.SITE_DEFAULT_ASSET_URL,
    }),
    supabase: Object.freeze({
      projectRef,
      url: value.NEXT_PUBLIC_SUPABASE_URL,
      anonKey,
    }),
    database: Object.freeze({
      pooledUrl: SecretString.fromPlain(value.DATABASE_POOL_URL),
      directUrl: SecretString.fromPlain(value.DATABASE_DIRECT_URL),
    }),
    credentials: Object.freeze({
      cloudflareApiToken: SecretString.fromPlain(value.CLOUDFLARE_API_TOKEN),
      cloudflareOriginSecret: SecretString.fromPlain(value.CLOUDFLARE_ORIGIN_SECRET),
      vercelApiToken: SecretString.fromPlain(value.VERCEL_API_TOKEN),
      r2AccessKeyId: SecretString.fromPlain(value.R2_ACCESS_KEY_ID),
      r2SecretAccessKey: SecretString.fromPlain(value.R2_SECRET_ACCESS_KEY),
      r2AuditBucketName: value.R2_AUDIT_BUCKET_NAME ?? null,
      r2AuditAccessKeyId: value.R2_AUDIT_ACCESS_KEY_ID === undefined ? null : SecretString.fromPlain(value.R2_AUDIT_ACCESS_KEY_ID),
      r2AuditSecretAccessKey: value.R2_AUDIT_SECRET_ACCESS_KEY === undefined ? null : SecretString.fromPlain(value.R2_AUDIT_SECRET_ACCESS_KEY),
      upstashRestUrl: value.UPSTASH_REDIS_REST_URL,
      upstashRestToken: SecretString.fromPlain(value.UPSTASH_REDIS_REST_TOKEN),
      telegramBotToken: SecretString.fromPlain(value.TELEGRAM_BOT_TOKEN),
      telegramWebhookSecret: SecretString.fromPlain(value.TELEGRAM_WEBHOOK_SECRET),
      resendApiKey: value.RESEND_API_KEY === undefined ? null : SecretString.fromPlain(value.RESEND_API_KEY),
      resendDefaultFrom: value.RESEND_DEFAULT_FROM ?? null,
      resendWebhookSecret: value.RESEND_WEBHOOK_SECRET === undefined ? null : SecretString.fromPlain(value.RESEND_WEBHOOK_SECRET),
      genericWebhookSecret: SecretString.fromPlain(value.GENERIC_WEBHOOK_SECRET),
      cronSecret: SecretString.fromPlain(value.CRON_SECRET),
    }),
  } as BootstrapConfig);
}

/** Validate Bootstrap configuration purely.
 *
 * @param environment - Raw environment map to validate.
 * @returns Validated config or stable issues.
 * @remarks No PostgreSQL/provider init; failures expose only allowlisted paths plus stable categories. Single production environment — authority is NODE_ENV (`next start` forces it to production). Namespace milik Vercel (VERCEL_ENV, VERCEL_URL, VERCEL_REGION, ...) disuntik platform saat build/run dan bukan milik kontrak konfigurasi ini. Kunci fungsional VERCEL_API_TOKEN tetap wajib via skema, jadi typo di sana tetap gagal validasi.
 */
export function validateBootstrapConfig(environment: Record<string, string | undefined>): BootstrapConfigResult {
  const postCutover = environment.NODE_ENV === 'production';
  const unknown = postCutover ? detectUnknownIndicateKeys(environment, BOOTSTRAP_ALLOWED_KEYS) : [];
  const parsed = bootstrapSchema.safeParse(environment);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => ({
        path: issue.path.join('.') || 'configuration',
        category: issue.message,
      }))
      .concat(unknown)
      .sort((left, right) => `${left.path}:${left.category}`.localeCompare(`${right.path}:${right.category}`));
    return { success: false, issues: Object.freeze(issues) };
  }
  if (unknown.length > 0) {
    return { success: false, issues: Object.freeze(unknown) };
  }
  return { success: true, config: toBootstrapConfig(parsed.data) };
}

function detectUnknownIndicateKeys(
  environment: Record<string, string | undefined>,
  allowed: ReadonlySet<string>,
): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  for (const key of Object.keys(environment)) {
    if (allowed.has(key) || key === 'NODE_ENV' || key.startsWith('_') || key.startsWith('npm_') || key.startsWith('NPM_')) {
      continue;
    }
    if (key.startsWith('VERCEL_')) {
      continue;
    }
    if (INDICATE_NAMESPACE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      issues.push({ path: key, category: 'unknown_configuration_key' });
    }
  }
  return issues;
}