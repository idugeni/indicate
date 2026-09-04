import { z } from 'zod';

import { BOOTSTRAP_ENVIRONMENTS } from '@/core/config/bootstrap/bootstrap-env';
import { FUNCTION_DEADLINE_MIN_SECONDS, HARD_CAPS, RETRY_DELAY_MIN_SECONDS } from '@/core/config/persisted/hard-caps';
import type { RateLimitEndpointClass } from '@/core/config/persisted/read-model';

const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;
const SEO_ROBOTS_DIRECTIVES = ['index,follow', 'noindex,nofollow'] as const;
const MAX_SCHEMA_VERSION = 2_147_483_647;

function unicodeLength(value: string): number {
  return Array.from(value).length;
}

const hostnameField = z
  .string()
  .min(1)
  .max(253)
  .refine((value) => /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value), 'normalized_hostname_shape');

export const sharedDeploymentSchema = z
  .object({
    supabaseProjectRef: z.string().regex(/^[a-z0-9]{8,32}$/),
    cloudflareAccountId: z.string().min(1),
    vercelProjectId: z.string().min(1),
    vercelTeamId: z.string().min(1),
    vercelProductionTargetHostname: hostnameField,
    r2AccountId: z.string().min(1),
    r2BucketName: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/),
    upstashRedisResourceId: z.string().min(1),
    version: z.number().int().positive(),
    updatedAt: z.string(),
  })
  .strict();

export const mediaPolicySchema = z
  .object({
    allowedMimeTypes: z
      .array(z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']))
      .min(1)
      .refine((mimes) => new Set(mimes).size === mimes.length, 'mime_types_must_be_distinct'),
    maxObjectBytes: z.number().int().positive().max(HARD_CAPS.mediaMaxBytes),
    uploadAuthorizationSeconds: z.number().int().positive().max(HARD_CAPS.uploadAuthorizationSeconds),
    readAuthorizationSeconds: z.number().int().positive().max(HARD_CAPS.readAuthorizationSeconds),
    version: z.number().int().positive(),
  })
  .strict();

export const publicationPolicySchema = z
  .object({
    maxAttempts: z.number().int().positive().max(HARD_CAPS.publicationMaxAttempts),
    retryDelaysSeconds: z
      .array(z.number().int().min(RETRY_DELAY_MIN_SECONDS).max(HARD_CAPS.publicationRetryDelaySeconds))
      .min(1)
      .max(HARD_CAPS.publicationRetryDelayEntries),
    leaseSeconds: z.number().int().positive().max(HARD_CAPS.publicationLeaseSeconds),
    batchSize: z.number().int().positive().max(HARD_CAPS.publicationBatchSize),
    functionDeadlineSeconds: z
      .number()
      .int()
      .min(FUNCTION_DEADLINE_MIN_SECONDS)
      .max(HARD_CAPS.publicationFunctionDeadlineSeconds),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.retryDelaysSeconds.length <= value.maxAttempts - 1, 'retry_delays_exceed_available_retries');

export const webhookPolicySchema = z
  .object({
    freshnessSeconds: z.number().int().positive().max(HARD_CAPS.webhookFreshnessSeconds),
    replayRetentionSeconds: z.number().int().positive().max(HARD_CAPS.webhookReplayRetentionSeconds),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.replayRetentionSeconds >= value.freshnessSeconds, 'replay_retention_below_freshness');

export const cachePolicySchema = z
  .object({
    publicCacheSeconds: z.number().int().nonnegative().max(HARD_CAPS.publicCacheLifetimeSeconds),
    cacheVersion: z.number().int().positive(),
    version: z.number().int().positive(),
  })
  .strict();

export const rateLimitPolicySchema = z
  .object({
    endpointClass: z.enum(['mutation', 'webhook', 'public_read']),
    allowance: z.number().int().positive(),
    windowSeconds: z.number().int().positive().max(HARD_CAPS.rateLimitWindowSeconds),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((value) => {
    const cap =
      value.endpointClass === 'mutation'
        ? HARD_CAPS.rateLimitMutationAllowance
        : value.endpointClass === 'webhook'
          ? HARD_CAPS.rateLimitWebhookAllowance
          : HARD_CAPS.rateLimitPublicReadAllowance;
    return value.allowance <= cap;
  }, 'allowance_exceeds_endpoint_cap');

export const siteSettingsSchema = z
  .object({
    organizationId: z.uuid(),
    siteId: z.uuid(),
    locale: z.string().regex(LOCALE_PATTERN),
    seoDefaultTitle: z.string().refine((value) => unicodeLength(value) >= 1 && unicodeLength(value) <= 160),
    seoDefaultDescription: z.string().refine((value) => unicodeLength(value) >= 1 && unicodeLength(value) <= 1_000),
    seoRobotsDirective: z.enum(SEO_ROBOTS_DIRECTIVES),
    seoOpenGraphSiteName: z.string().refine((value) => unicodeLength(value) >= 1 && unicodeLength(value) <= 160),
    seoSchemaVersion: z.number().int().min(1).max(MAX_SCHEMA_VERSION),
    fallbackMediaId: z.uuid().nullable(),
    fallbackMediaObjectKey: z.string().min(1).nullable(),
    fallbackMediaState: z.string().min(1),
    fallbackMediaOrganizationId: z.uuid().nullable(),
    version: z.number().int().positive(),
  })
  .strict();

export const runtimeDomainSchema = z
  .object({
    organizationId: z.uuid(),
    domainId: z.uuid(),
    normalizedHostname: hostnameField,
    cloudflareZoneId: z.string().min(1),
    routingVersion: z.number().int().positive(),
    version: z.number().int().positive(),
  })
  .strict();

export const runtimeSiteSchema = z
  .object({
    organizationId: z.uuid(),
    siteId: z.uuid(),
    domainId: z.uuid(),
    normalizedHostname: hostnameField,
    regionId: z.uuid().nullable(),
    routingVersion: z.number().int().positive(),
    contentVersion: z.number().int().min(0),
    version: z.number().int().positive(),
    domainOrganizationId: z.uuid(),
    domainNormalizedHostname: hostnameField,
    settingsVersion: z.number().int().positive(),
  })
  .strict();

export const persistedReadModelSchema = z
  .object({
    environment: z.enum(BOOTSTRAP_ENVIRONMENTS),
    configurationVersion: z.number().int().positive(),
    readAt: z.string(),
    sharedDeployment: sharedDeploymentSchema,
    mediaPolicy: mediaPolicySchema,
    publicationPolicy: publicationPolicySchema,
    webhookPolicy: webhookPolicySchema,
    cachePolicy: cachePolicySchema,
    rateLimitPolicies: z.array(rateLimitPolicySchema),
    domains: z.array(runtimeDomainSchema),
    sites: z.array(runtimeSiteSchema),
    siteSettings: z.array(siteSettingsSchema),
  })
  .strict();

export type ParsedPersistedReadModel = z.infer<typeof persistedReadModelSchema>;
export type ParsedSiteSettings = z.infer<typeof siteSettingsSchema>;

export type { RateLimitEndpointClass };