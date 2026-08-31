import environment from '../fixtures/stage1-runtime-environment.json';

import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import { validateRuntimeConfig, type RuntimeConfig } from '@/config/schema';
import type { Stage7ReadinessFixture } from '@/domain/stage7/models';
import type { ProductionReadinessSnapshot } from '@/ports/production-readiness';

export function stage7RuntimeConfig(overrides: Record<string, string> = {}): RuntimeConfig {
  const parsed = validateRuntimeConfig({
    ...environment,
    NODE_ENV: 'production',
    APP_ENVIRONMENT: 'production',
    SCHEMA_GATE_MODE: 'live',
    STAGE2_E2E_MODE: undefined,
    CRON_SECRET: 'prod_cron_7f4f678c63b24437b4eb2a88',
    CLOUDFLARE_ORIGIN_SECRET: 'prod_origin_4de950a83132408a96731e48',
    TELEGRAM_WEBHOOK_SECRET: 'prod_telegram_webhook_24fa9321c7894c91',
    GENERIC_WEBHOOK_SECRET: 'prod_generic_webhook_808d8277eb274cf1',
    R2_ACCESS_KEY_ID: 'R2PRODUCTIONACCESSKEY7F4F678C63B2',
    R2_SECRET_ACCESS_KEY: 'R2ProductionSecretAccessKey89D6015194424DE5A83132408A96731E48',
    ...overrides,
  });
  if (!parsed.success) throw new Error(`Invalid Stage 7 test environment: ${JSON.stringify(parsed.issues)}`);
  return parsed.config;
}

export function healthyStage7Snapshot(config: RuntimeConfig, fixture: Stage7ReadinessFixture = createStage7ReadinessFixture(config)): ProductionReadinessSnapshot {
  return Object.freeze({
    localMigrationCount: 14,
    localMigrationSequenceValid: true,
    appliedMigrationSequenceValid: true,
    schemaVersion: 14,
    services: Object.freeze({
      supabaseAuthHealthy: true,
      supabaseDatabaseHealthy: true,
      r2Healthy: true,
      r2DataPlaneHealthy: true,
      r2Private: true,
      upstashHealthy: true,
      telegramHealthy: true,
      telegramWebhookMatches: true,
      telegramWebhookSecretMatches: true,
    }),
    zones: Object.freeze(fixture.roots.map((root) => Object.freeze({
      hostname: root.normalizedHostname,
      nameserversAuthoritative: true,
      publicDelegationAuthoritative: true,
      apexProxied: true,
      wildcardProxied: true,
      fullStrict: true,
    }))),
    domains: Object.freeze(fixture.allSites.map((site) => Object.freeze({
      hostname: site.normalizedHostname,
      associated: true,
      verified: true,
      tlsReachable: true,
      cloudflareProxied: true,
    }))),
    mappings: Object.freeze(fixture.allSites.map((site) => Object.freeze({
      hostname: site.normalizedHostname,
      organizationId: site.organizationId,
      domainId: site.domainId,
      siteId: site.id,
      regionId: site.regionId,
      regionExternalKey: site.regionId === null ? null : fixture.regions.find(({ id }) => id === site.regionId)?.externalKey ?? null,
      regionSlug: site.regionId === null ? null : fixture.regions.find(({ id }) => id === site.regionId)?.slug ?? null,
      coherent: true,
    }))),
    topology: Object.freeze({
      applicationCount: 1,
      vercelProjectCount: 1,
      supabaseProjectCount: 1,
      supabaseDatabaseCount: 1,
      supabaseAuthCount: 1,
      r2BucketCount: 1,
      upstashResourceCount: 1,
      publicTemplateCount: 1,
      cloudflareAuthority: true,
      vercelHostingOnly: true,
      vercelExactDomainsOnly: true,
    }),
  });
}
