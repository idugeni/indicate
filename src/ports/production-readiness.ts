import type { Stage7ReadinessFixture } from '@/domain/stage7/models';

export interface ProductionReadinessServiceSnapshot {
  readonly supabaseAuthHealthy: boolean;
  readonly supabaseDatabaseHealthy: boolean;
  readonly r2Healthy: boolean;
  readonly r2DataPlaneHealthy: boolean;
  readonly r2Private: boolean;
  readonly upstashHealthy: boolean;
  readonly telegramHealthy: boolean;
  readonly telegramWebhookMatches: boolean;
  readonly telegramWebhookSecretMatches: boolean;
}

export interface ProductionReadinessZoneSnapshot {
  readonly hostname: string;
  readonly nameserversAuthoritative: boolean;
  readonly publicDelegationAuthoritative: boolean;
  readonly apexProxied: boolean;
  readonly wildcardProxied: boolean;
  readonly fullStrict: boolean;
}

export interface ProductionReadinessDomainSnapshot {
  readonly hostname: string;
  readonly associated: boolean;
  readonly verified: boolean;
  readonly tlsReachable: boolean;
  readonly cloudflareProxied: boolean;
}

export interface ProductionReadinessDatabaseMapping {
  readonly hostname: string;
  readonly organizationId: string;
  readonly domainId: string;
  readonly siteId: string;
  readonly regionId: string | null;
  readonly regionExternalKey: string | null;
  readonly regionSlug: string | null;
  readonly coherent: boolean;
}

export interface ProductionReadinessSnapshot {
  readonly localMigrationCount: number;
  readonly localMigrationSequenceValid: boolean;
  readonly appliedMigrationSequenceValid: boolean;
  readonly schemaVersion: number | null;
  readonly services: ProductionReadinessServiceSnapshot;
  readonly zones: readonly ProductionReadinessZoneSnapshot[];
  readonly domains: readonly ProductionReadinessDomainSnapshot[];
  readonly mappings: readonly ProductionReadinessDatabaseMapping[];
  readonly topology: Readonly<{
    applicationCount: number;
    vercelProjectCount: number;
    supabaseProjectCount: number;
    supabaseDatabaseCount: number;
    supabaseAuthCount: number;
    r2BucketCount: number;
    upstashResourceCount: number;
    publicTemplateCount: number;
    cloudflareAuthority: boolean;
    vercelHostingOnly: boolean;
    vercelExactDomainsOnly: boolean;
  }>;
}

export interface ProductionReadinessPort {
  inspect(fixture: Stage7ReadinessFixture): Promise<ProductionReadinessSnapshot>;
}
