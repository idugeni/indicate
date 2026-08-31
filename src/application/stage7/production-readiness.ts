import { REQUIRED_SCHEMA_VERSION } from '@/application/deployment/schema-gate';
import type {
  ProductionReadinessCheck,
  ProductionReadinessCheckName,
  ProductionReadinessReport,
  Stage7ProductionConfig,
  Stage7ReadinessFixture,
} from '@/domain/stage7/models';
import type { ProductionReadinessPort, ProductionReadinessSnapshot } from '@/ports/production-readiness';

export const PRODUCTION_READINESS_CHECK_ORDER: readonly ProductionReadinessCheckName[] = Object.freeze([
  'runtime_configuration',
  'migration_manifest',
  'schema_version',
  'supabase_auth',
  'supabase_database',
  'r2_private_bucket',
  'upstash_redis',
  'telegram_webhook',
  'cron_secret',
  'server_secrets',
  'shared_topology',
  'cloudflare_authority',
  'cloudflare_routes_proxy_tls',
  'vercel_exact_domains',
  'active_database_mappings',
]);

function check(name: ProductionReadinessCheckName, passed: boolean, failureCategory: string): ProductionReadinessCheck {
  return Object.freeze({ name, status: passed ? 'passed' : 'failed', category: passed ? 'ready' : failureCategory });
}

function credentialIsProductionBounded(value: string): boolean {
  return value.length >= 24 && !/(?:change[ -]?me|example|placeholder|sentinel|development|test-secret)/iu.test(value);
}

function topologyIsShared(snapshot: ProductionReadinessSnapshot): boolean {
  const topology = snapshot.topology;
  return topology.applicationCount === 1
    && topology.vercelProjectCount === 1
    && topology.supabaseProjectCount === 1
    && topology.supabaseDatabaseCount === 1
    && topology.supabaseAuthCount === 1
    && topology.r2BucketCount === 1
    && topology.upstashResourceCount === 1
    && topology.publicTemplateCount === 1
    && topology.cloudflareAuthority
    && topology.vercelHostingOnly
    && topology.vercelExactDomainsOnly;
}

function hasExactHostSet(actual: readonly string[], expected: ReadonlySet<string>): boolean {
  return actual.length === expected.size && new Set(actual).size === actual.length && actual.every((hostname) => expected.has(hostname));
}

function databaseMappingsAreReady(
  fixture: Stage7ReadinessFixture,
  mappings: readonly ProductionReadinessSnapshot['mappings'][number][],
): boolean {
  const expectedHosts = new Set(fixture.allSites.map(({ normalizedHostname }) => normalizedHostname));
  if (!hasExactHostSet(mappings.map(({ hostname }) => hostname), expectedHosts)
    || new Set(mappings.map(({ siteId }) => siteId)).size !== mappings.length
    || mappings.some((mapping) => !mapping.coherent || mapping.organizationId.length === 0
      || mapping.domainId.length === 0 || mapping.siteId.length === 0)) return false;
  const byHostname = new Map(mappings.map((mapping) => [mapping.hostname, mapping]));
  return fixture.roots.every((root) => {
    const apex = byHostname.get(root.normalizedHostname);
    const regional = root.regionalSites.map((site) => byHostname.get(site.normalizedHostname));
    return apex !== undefined
      && apex.regionId === null
      && apex.regionExternalKey === null
      && apex.regionSlug === null
      && regional.every((mapping, index) => mapping !== undefined
        && mapping.regionId !== null
        && mapping.regionExternalKey === root.regions[index]?.externalKey
        && mapping.regionSlug === root.regions[index]?.slug
        && mapping.organizationId === apex.organizationId
        && mapping.domainId === apex.domainId)
      && new Set(regional.map((mapping) => mapping?.regionId)).size === 3;
  });
}

function evaluate(config: Stage7ProductionConfig, fixture: Stage7ReadinessFixture, snapshot: ProductionReadinessSnapshot): readonly ProductionReadinessCheck[] {
  const expectedRoots = new Set(fixture.roots.map((root) => root.normalizedHostname));
  const expectedSites = new Map(fixture.allSites.map((site) => [site.normalizedHostname, site]));
  const zonesComplete = hasExactHostSet(snapshot.zones.map((zone) => zone.hostname), expectedRoots);
  const authorityValid = zonesComplete && snapshot.zones.every((zone) => zone.nameserversAuthoritative && zone.publicDelegationAuthoritative && zone.fullStrict);
  const routesValid = zonesComplete && snapshot.zones.every((zone) => zone.apexProxied && zone.wildcardProxied && zone.fullStrict);
  const domainsComplete = hasExactHostSet(snapshot.domains.map((domain) => domain.hostname), new Set(expectedSites.keys()));
  const exactDomainsValid = domainsComplete && snapshot.domains.every((domain) => domain.associated && domain.verified);
  const tlsValid = domainsComplete && snapshot.domains.every((domain) => domain.tlsReachable && domain.cloudflareProxied);
  const mappingsValid = databaseMappingsAreReady(fixture, snapshot.mappings);

  return Object.freeze([
    check('runtime_configuration', config.hosts.mvpRoots.length === 3 && expectedRoots.size === 3 && config.schemaGateMode === 'live', 'runtime_configuration_invalid'),
    check('migration_manifest', snapshot.localMigrationCount === REQUIRED_SCHEMA_VERSION && snapshot.localMigrationSequenceValid, 'migration_manifest_invalid'),
    check('schema_version', snapshot.schemaVersion !== null && snapshot.schemaVersion >= REQUIRED_SCHEMA_VERSION && snapshot.appliedMigrationSequenceValid, 'schema_manifest_invalid'),
    check('supabase_auth', snapshot.services.supabaseAuthHealthy, 'supabase_auth_unavailable'),
    check('supabase_database', snapshot.services.supabaseDatabaseHealthy, 'supabase_database_unavailable'),
    check('r2_private_bucket', snapshot.services.r2Healthy && snapshot.services.r2DataPlaneHealthy && snapshot.services.r2Private, 'r2_private_bucket_unavailable'),
    check('upstash_redis', snapshot.services.upstashHealthy, 'upstash_unavailable'),
    check('telegram_webhook', snapshot.services.telegramHealthy && snapshot.services.telegramWebhookMatches && snapshot.services.telegramWebhookSecretMatches, 'telegram_webhook_invalid'),
    check('cron_secret', credentialIsProductionBounded(config.security.cronSecret), 'cron_secret_invalid'),
    check('server_secrets', [config.cloudflare.originSecret, config.telegram.webhookSecret, config.security.genericWebhookSecret].every(credentialIsProductionBounded), 'server_secret_invalid'),
    check('shared_topology', topologyIsShared(snapshot), 'shared_topology_invalid'),
    check('cloudflare_authority', authorityValid, 'cloudflare_authority_invalid'),
    check('cloudflare_routes_proxy_tls', routesValid && tlsValid, 'cloudflare_route_or_tls_invalid'),
    check('vercel_exact_domains', exactDomainsValid, 'vercel_exact_domain_invalid'),
    check('active_database_mappings', mappingsValid, 'active_mapping_invalid'),
  ]);
}

export async function validateProductionReadiness(
  config: Stage7ProductionConfig,
  fixture: Stage7ReadinessFixture,
  port: ProductionReadinessPort,
): Promise<ProductionReadinessReport> {
  let checks: readonly ProductionReadinessCheck[];
  try {
    checks = evaluate(config, fixture, await port.inspect(fixture));
  } catch {
    checks = Object.freeze(PRODUCTION_READINESS_CHECK_ORDER.map((name) => check(name, false, 'inspection_unavailable')));
  }
  return Object.freeze({
    ready: checks.every(({ status }) => status === 'passed'),
    requiredSchemaVersion: REQUIRED_SCHEMA_VERSION,
    checks,
  });
}

export function assertProductionReady(report: ProductionReadinessReport): void {
  if (!report.ready) {
    const categories = report.checks.filter(({ status }) => status === 'failed').map(({ name, category }) => `${name}:${category}`);
    throw new Error(`Production readiness failed: ${categories.join(', ')}`);
  }
}
