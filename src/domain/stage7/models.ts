export const MVP_REGION_DESCRIPTORS = Object.freeze([
  Object.freeze({ externalKey: 'central-java-wonosobo', name: 'Wonosobo', slug: 'wonosobo' }),
  Object.freeze({ externalKey: 'central-java-magelang', name: 'Magelang', slug: 'magelang' }),
  Object.freeze({ externalKey: 'central-java-semarang', name: 'Semarang', slug: 'semarang' }),
] as const);

export type MvpRegionDescriptor = (typeof MVP_REGION_DESCRIPTORS)[number];

export type ReadinessRegionFixture = MvpRegionDescriptor & Readonly<{
  id: string;
}>;

export interface Stage7FixtureConfig {
  readonly hosts: Readonly<{
    readonly mvpRoots: readonly string[];
    readonly reserved: ReadonlySet<string>;
  }>;
}

export interface Stage7ProductionConfig extends Stage7FixtureConfig {
  readonly schemaGateMode: 'contract' | 'live';
  readonly cloudflare: Readonly<{ readonly originSecret: string }>;
  readonly telegram: Readonly<{ readonly webhookSecret: string }>;
  readonly security: Readonly<{
    readonly genericWebhookSecret: string;
    readonly cronSecret: string;
  }>;
}

export interface ReadinessSiteFixture {
  readonly id: string;
  readonly organizationId: string;
  readonly domainId: string;
  readonly regionId: string | null;
  readonly normalizedHostname: string;
  readonly kind: 'apex' | 'regional';
}

export interface ReadinessRootFixture {
  readonly ordinal: 1 | 2 | 3;
  readonly organizationId: string;
  readonly domainId: string;
  readonly normalizedHostname: string;
  readonly apexSite: ReadinessSiteFixture;
  readonly regions: readonly ReadinessRegionFixture[];
  readonly regionalSites: readonly ReadinessSiteFixture[];
}

export interface Stage7ReadinessFixture {
  readonly roots: readonly [ReadinessRootFixture, ReadinessRootFixture, ReadinessRootFixture];
  readonly regions: readonly ReadinessRegionFixture[];
  readonly regionalMatrix: readonly ReadinessSiteFixture[];
  readonly allSites: readonly ReadinessSiteFixture[];
}

export type ProductionReadinessCheckName =
  | 'runtime_configuration'
  | 'migration_manifest'
  | 'schema_version'
  | 'supabase_auth'
  | 'supabase_database'
  | 'r2_private_bucket'
  | 'upstash_redis'
  | 'telegram_webhook'
  | 'cron_secret'
  | 'server_secrets'
  | 'shared_topology'
  | 'cloudflare_authority'
  | 'cloudflare_routes_proxy_tls'
  | 'vercel_exact_domains'
  | 'active_database_mappings';

export interface ProductionReadinessCheck {
  readonly name: ProductionReadinessCheckName;
  readonly status: 'passed' | 'failed';
  readonly category: string;
}

export interface ProductionReadinessReport {
  readonly ready: boolean;
  readonly requiredSchemaVersion: number;
  readonly checks: readonly ProductionReadinessCheck[];
}

export interface Stage7AcceptanceObservation {
  readonly organizationId: string;
  readonly siteId: string;
  readonly hostname: string;
  readonly regionSlug: string;
  readonly publication: Readonly<{ state: 'published' | 'failed'; successfulCount: number; urls: readonly string[] }>;
  readonly publicSelectionIsIsolated: boolean;
  readonly publicArticleRegionIds: readonly (string | null)[];
  readonly media: Readonly<{ authorizedKey: string | null; crossTenantDenied: boolean }>;
  readonly seoUrls: readonly string[];
  readonly cacheIdentity: string;
  readonly foreignCacheRejected: boolean;
  readonly denialShape: string;
  readonly credentialCrossTenantDenied: boolean;
  readonly analyticsOrganizationId: string;
  readonly analyticsArticleCount: number;
  readonly telegram: Readonly<{ state: string; urls: readonly string[] }>;
  readonly auditOrganizationIds: readonly string[];
}

export interface Stage7AcceptanceReport {
  readonly accepted: boolean;
  readonly scenarioCount: number;
  readonly failures: readonly string[];
}

export interface QualityGateDiagnostic {
  readonly stage: string;
  readonly passed: boolean;
  readonly category: string;
}

export interface PromotionDecision {
  readonly promote: boolean;
  readonly failures: readonly string[];
}

export type DurableRecoveryFamily = 'activation' | 'cleanup' | 'transitionReceipt' | 'lease' | 'invalidation' | 'queue' | 'webhookOutcome';

export interface RollbackEvidence {
  readonly targetSchemaCompatible: boolean;
  readonly singleVercelProject: boolean;
  readonly cloudflareAuthorityPreserved: boolean;
  readonly durableRecovery: Readonly<Record<DurableRecoveryFamily, boolean>>;
  readonly createsAdditionalTopology: boolean;
}
