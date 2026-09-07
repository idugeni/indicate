import type { BootstrapEnvironment } from '@/core/config/bootstrap/bootstrap-env';

export type RateLimitEndpointClass = 'mutation' | 'webhook' | 'public_read';

export type ConfigMutationKind =
  | 'shared_deployment_config'
  | 'media_policy'
  | 'publication_policy'
  | 'webhook_policy'
  | 'cache_policy'
  | 'rate_limit_policy'
  | 'domain_provider_mapping'
  | 'site_settings';

export interface PersistedSharedDeploymentRow {
  readonly supabaseProjectRef: string;
  readonly cloudflareAccountId: string;
  readonly vercelProjectId: string;
  readonly vercelTeamId: string;
  readonly vercelProductionTargetHostname: string;
  readonly r2AccountId: string;
  readonly r2BucketName: string;
  readonly upstashRedisResourceId: string;
  readonly version: number;
  readonly updatedAt: string;
}

export interface PersistedMediaPolicyRow {
  readonly allowedMimeTypes: readonly string[];
  readonly maxObjectBytes: number;
  readonly uploadAuthorizationSeconds: number;
  readonly readAuthorizationSeconds: number;
  readonly version: number;
}

export interface PersistedPublicationPolicyRow {
  readonly maxAttempts: number;
  readonly retryDelaysSeconds: readonly number[];
  readonly leaseSeconds: number;
  readonly batchSize: number;
  readonly functionDeadlineSeconds: number;
  readonly version: number;
}

export interface PersistedWebhookPolicyRow {
  readonly freshnessSeconds: number;
  readonly replayRetentionSeconds: number;
  readonly version: number;
}

export interface PersistedCachePolicyRow {
  readonly publicCacheSeconds: number;
  readonly cacheVersion: number;
  readonly version: number;
}

export interface PersistedRateLimitPolicyRow {
  readonly endpointClass: RateLimitEndpointClass;
  readonly allowance: number;
  readonly windowSeconds: number;
  readonly version: number;
}

export interface PersistedRuntimeDomain {
  readonly organizationId: string;
  readonly domainId: string;
  readonly normalizedHostname: string;
  readonly cloudflareZoneId: string;
  readonly routingVersion: number;
  readonly version: number;
}

export interface PersistedRuntimeSite {
  readonly organizationId: string;
  readonly siteId: string;
  readonly domainId: string;
  readonly normalizedHostname: string;
  readonly regionId: string | null;
  readonly routingVersion: number;
  readonly contentVersion: number;
  readonly version: number;
  readonly domainOrganizationId: string;
  readonly domainNormalizedHostname: string;
  readonly settingsVersion: number;
}

export interface PersistedSiteSettings {
  readonly organizationId: string;
  readonly siteId: string;
  readonly locale: string;
  readonly seoDefaultTitle: string;
  readonly seoDefaultDescription: string;
  readonly seoRobotsDirective: 'index,follow' | 'noindex,nofollow';
  readonly seoOpenGraphSiteName: string;
  readonly seoSchemaVersion: number;
  readonly defaultMediaId: string | null;
  readonly defaultMediaObjectKey: string | null;
  readonly defaultMediaState: 'active' | string;
  readonly defaultMediaOrganizationId: string | null;
  readonly version: number;
}

/** Complete read inside one repeatable-read transaction; the parser converts it all-or-nothing. */
export interface PersistedRuntimeConfigReadModel {
  readonly environment: BootstrapEnvironment;
  readonly configurationVersion: number;
  readonly readAt: string;
  readonly sharedDeployment: PersistedSharedDeploymentRow;
  readonly mediaPolicy: PersistedMediaPolicyRow;
  readonly publicationPolicy: PersistedPublicationPolicyRow;
  readonly webhookPolicy: PersistedWebhookPolicyRow;
  readonly cachePolicy: PersistedCachePolicyRow;
  readonly rateLimitPolicies: readonly PersistedRateLimitPolicyRow[];
  readonly domains: readonly PersistedRuntimeDomain[];
  readonly sites: readonly PersistedRuntimeSite[];
  readonly siteSettings: readonly PersistedSiteSettings[];
}