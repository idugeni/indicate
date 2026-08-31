import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { REVIEWED_MIGRATION_MANIFEST, matchesReviewedMigrationManifest, migrationBodyChecksum } from '@/domain/stage7/migration-manifest';
import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import { decidePromotion, STAGE7_QUALITY_STAGES, validateRollback } from '@/application/stage7/release-gate';
import { PRODUCTION_READINESS_CHECK_ORDER, validateProductionReadiness } from '@/application/stage7/production-readiness';
import { parseProductionReadinessEvidence, parseQualityGateEvidence, parseStage7AcceptanceEvidence } from '@/application/stage7/evidence-validation';
import type { ProductionReadinessPort } from '@/ports/production-readiness';
import { healthyStage7Snapshot, stage7RuntimeConfig } from '../helpers/stage7';

describe('Stage 7 readiness fixtures', () => {
  it('derives exactly three roots, three required regions, nine regional scenarios, and twelve Sites from Runtime Configuration', () => {
    const config = stage7RuntimeConfig();
    const fixture = createStage7ReadinessFixture(config);
    expect(fixture.roots.map(({ normalizedHostname }) => normalizedHostname)).toEqual(config.hosts.mvpRoots);
    expect(fixture.roots.every((root) => root.regions.map(({ name }) => name).join(',') === 'Wonosobo,Magelang,Semarang')).toBe(true);
    expect(fixture.regions).toHaveLength(9);
    expect(new Set(fixture.regions.map(({ id }) => id)).size).toBe(9);
    expect(new Set(fixture.regions.map(({ externalKey }) => externalKey)).size).toBe(3);
    expect(new Set(fixture.regions.map(({ slug }) => slug)).size).toBe(3);
    expect(fixture.regionalMatrix).toHaveLength(9);
    expect(fixture.allSites).toHaveLength(12);
    expect(new Set(fixture.allSites.map(({ id }) => id)).size).toBe(12);
    for (const root of fixture.roots) {
      expect(root.apexSite.normalizedHostname).toBe(root.normalizedHostname);
      expect(root.regionalSites.map(({ normalizedHostname }) => normalizedHostname)).toEqual([
        `wonosobo.${root.normalizedHostname}`,
        `magelang.${root.normalizedHostname}`,
        `semarang.${root.normalizedHostname}`,
      ]);
    }
  });

  it('changes every generated root scenario when the configured roots change', () => {
    const first = createStage7ReadinessFixture(stage7RuntimeConfig());
    const second = createStage7ReadinessFixture(stage7RuntimeConfig({ MVP_ROOT_HOSTS: 'delta.preview.web.id,epsilon.preview.web.id,zeta.preview.web.id' }));
    expect(second.roots.map(({ normalizedHostname }) => normalizedHostname)).toEqual(['delta.preview.web.id', 'epsilon.preview.web.id', 'zeta.preview.web.id']);
    expect(second.allSites.map(({ id }) => id)).not.toEqual(first.allSites.map(({ id }) => id));
  });
});

describe('production readiness', () => {
  it('matches every required migration version, name, and reviewed checksum in order', () => {
    const applied = REVIEWED_MIGRATION_MANIFEST.map(({ version, name, checksum }) => ({ version, name, checksum }));
    expect(matchesReviewedMigrationManifest(applied)).toBe(true);
    expect(matchesReviewedMigrationManifest(applied.filter(({ version }) => version !== 7))).toBe(false);
    expect(matchesReviewedMigrationManifest(applied.map((entry) => entry.version === 9 ? { ...entry, checksum: 'mismatch' } : entry))).toBe(false);
    expect(matchesReviewedMigrationManifest([...applied].reverse())).toBe(false);
  });

  it('binds every reviewed checksum to the complete canonical migration body', () => {
    const root = resolve(import.meta.dirname, '../..');
    const files = REVIEWED_MIGRATION_MANIFEST.map((migration) => readFileSync(resolve(root, 'drizzle', `${migration.tag}.sql`), 'utf8'));
    const checksums = files.map((content, index) => migrationBodyChecksum(content, REVIEWED_MIGRATION_MANIFEST[index]!));
    expect(checksums).toEqual(REVIEWED_MIGRATION_MANIFEST.map(({ checksum }) => checksum));
    for (const { checksum } of REVIEWED_MIGRATION_MANIFEST) {
      expect(files[13]).toContain(`'${checksum}'`);
    }

    const markerCommentTampering = files[5]!.replace(
      /\nINSERT INTO indicate_schema_migrations/u,
      "\n-- (6, 'stage3_discovery_outcome_timestamp', 'unchanged-label')\nINSERT INTO indicate_schema_migrations",
    );
    expect(migrationBodyChecksum(markerCommentTampering, REVIEWED_MIGRATION_MANIFEST[5]!)).not.toBe(REVIEWED_MIGRATION_MANIFEST[5]!.checksum);

    const trailingExecutableSql = `${files[12]!}\nGRANT SELECT ON public.users TO indicate_runtime;\n`;
    expect(migrationBodyChecksum(trailingExecutableSql, REVIEWED_MIGRATION_MANIFEST[12]!)).not.toBe(REVIEWED_MIGRATION_MANIFEST[12]!.checksum);
    expect(migrationBodyChecksum(files[7]!, REVIEWED_MIGRATION_MANIFEST[7]!)).not.toBe(REVIEWED_MIGRATION_MANIFEST[8]!.checksum);
    expect(migrationBodyChecksum(files[8]!, REVIEWED_MIGRATION_MANIFEST[8]!)).not.toBe(REVIEWED_MIGRATION_MANIFEST[7]!.checksum);
  });

  it('fails closed when a required self-registration is moved into a comment, malformed, or duplicated', () => {
    const root = resolve(import.meta.dirname, '../..');
    const migration = REVIEWED_MIGRATION_MANIFEST[5]!;
    const content = readFileSync(resolve(root, 'drizzle', `${migration.tag}.sql`), 'utf8');
    const registrationStart = content.lastIndexOf('\nINSERT INTO indicate_schema_migrations');
    expect(registrationStart).toBeGreaterThan(0);
    const registration = content.slice(registrationStart + 1);
    const body = content.slice(0, registrationStart + 1);

    expect(() => migrationBodyChecksum(`${body}/* ${registration} */`, migration)).toThrow('migration_registration_invalid:not_unique');
    expect(() => migrationBodyChecksum(content.replace('(version, name, checksum)', '(version, name, digest)'), migration)).toThrow('migration_registration_invalid:unexpected_structure');
    expect(() => migrationBodyChecksum(`${content}\n${registration}`, migration)).toThrow('migration_registration_invalid:not_unique');
  });

  it('passes only a complete schema-14, provider-healthy, private, exact, active shared topology', async () => {
    const config = stage7RuntimeConfig();
    const fixture = createStage7ReadinessFixture(config);
    const port: ProductionReadinessPort = { inspect: async () => healthyStage7Snapshot(config, fixture) };
    const report = await validateProductionReadiness(config, fixture, port);
    expect(report.ready).toBe(true);
    expect(report.checks).toHaveLength(15);
    expect(report.checks.every(({ category }) => category === 'ready')).toBe(true);
  });

  it('accepts coherent live database identifiers without requiring generated fixture UUIDs', async () => {
    const config = stage7RuntimeConfig();
    const fixture = createStage7ReadinessFixture(config);
    const healthy = healthyStage7Snapshot(config, fixture);
    const mappings = healthy.mappings.map((mapping) => {
      const rootIndex = fixture.roots.findIndex((root) => mapping.hostname === root.normalizedHostname
        || mapping.hostname.endsWith(`.${root.normalizedHostname}`));
      const root = fixture.roots[rootIndex]!;
      const regionIndex = root.regionalSites.findIndex(({ normalizedHostname }) => normalizedHostname === mapping.hostname);
      return {
        ...mapping,
        organizationId: `live-organization-${rootIndex}`,
        domainId: `live-domain-${rootIndex}`,
        siteId: `live-site-${mapping.hostname}`,
        regionId: regionIndex < 0 ? null : `live-region-${rootIndex}-${regionIndex}`,
      };
    });
    const report = await validateProductionReadiness(config, fixture, { inspect: async () => ({ ...healthy, mappings }) });
    expect(report.ready).toBe(true);
  });

  it('fails closed with sanitized categories for provider, mapping, topology, and inspection failures', async () => {
    const secret = 'prod_cron_private_89d6015194424de5';
    const config = stage7RuntimeConfig({ CRON_SECRET: secret });
    const fixture = createStage7ReadinessFixture(config);
    const healthy = healthyStage7Snapshot(config, fixture);
    const broken: ProductionReadinessPort = { inspect: async () => ({
      ...healthy,
      schemaVersion: 11,
      services: { ...healthy.services, r2Private: false, telegramWebhookMatches: false },
      mappings: healthy.mappings.slice(1),
      topology: { ...healthy.topology, r2BucketCount: 2 },
    }) };
    const report = await validateProductionReadiness(config, fixture, broken);
    expect(report.ready).toBe(false);
    expect(report.checks.filter(({ status }) => status === 'failed').map(({ name }) => name)).toEqual(expect.arrayContaining([
      'schema_version', 'r2_private_bucket', 'telegram_webhook', 'shared_topology', 'active_database_mappings',
    ]));
    expect(JSON.stringify(report)).not.toContain(secret);

    const unavailable = await validateProductionReadiness(config, fixture, { inspect: async () => { throw new Error(secret); } });
    expect(unavailable.ready).toBe(false);
    expect(unavailable.checks.every(({ category }) => category === 'inspection_unavailable')).toBe(true);
    expect(JSON.stringify(unavailable)).not.toContain(secret);
  });
});

describe('promotion and rollback gates', () => {
  const readiness = { ready: true, requiredSchemaVersion: 14, checks: PRODUCTION_READINESS_CHECK_ORDER.map((name) => ({ name, status: 'passed' as const, category: 'ready' })) } as const;
  const acceptance = { accepted: true, scenarioCount: 9, failures: [] } as const;
  const diagnostics = STAGE7_QUALITY_STAGES.map((stage) => ({ stage, passed: true, category: 'passed' }));

  it('allows promotion only when readiness, the complete matrix, and every quality stage pass', () => {
    expect(decidePromotion({ readiness, acceptance, diagnostics })).toEqual({ promote: true, failures: [] });
    expect(decidePromotion({ readiness: { ...readiness, ready: false }, acceptance, diagnostics }).promote).toBe(false);
    expect(decidePromotion({ readiness, acceptance: { ...acceptance, scenarioCount: 8 }, diagnostics }).promote).toBe(false);
    expect(decidePromotion({ readiness, acceptance, diagnostics: diagnostics.map((item) => item.stage === 'integration' ? { ...item, passed: false } : item) }).promote).toBe(false);
    expect(decidePromotion({ readiness, acceptance, diagnostics: diagnostics.slice(1) }).failures).toContain('quality_gate_incomplete');
  });

  it('rejects malformed, truncated, duplicate, stale, and contradictory evidence before promotion', () => {
    expect(parseProductionReadinessEvidence(readiness)).toEqual(readiness);
    expect(() => parseProductionReadinessEvidence({ ...readiness, checks: readiness.checks.slice(1) })).toThrow('readiness_evidence_invalid');
    expect(() => parseProductionReadinessEvidence({ ...readiness, checks: [...readiness.checks, readiness.checks[0]] })).toThrow('readiness_evidence_invalid');
    expect(() => parseProductionReadinessEvidence({ ...readiness, requiredSchemaVersion: 12 })).toThrow('readiness_evidence_invalid');
    expect(() => parseProductionReadinessEvidence({ ...readiness, ready: false })).toThrow('readiness_evidence_invalid');
    expect(() => parseProductionReadinessEvidence({ ...readiness, unexpected: true })).toThrow('readiness_evidence_invalid');

    expect(parseStage7AcceptanceEvidence(acceptance)).toEqual(acceptance);
    expect(() => parseStage7AcceptanceEvidence({ ...acceptance, failures: ['tenant_leak'] })).toThrow('acceptance_evidence_invalid');
    expect(() => parseStage7AcceptanceEvidence({ ...acceptance, accepted: false })).toThrow('acceptance_evidence_invalid');
    expect(() => parseStage7AcceptanceEvidence({ ...acceptance, scenarioCount: 8 })).toThrow('acceptance_evidence_invalid');

    expect(parseQualityGateEvidence(diagnostics)).toEqual(diagnostics);
    expect(() => parseQualityGateEvidence(diagnostics.slice(1))).toThrow('quality_evidence_invalid');
    expect(() => parseQualityGateEvidence([...diagnostics.slice(0, -1), diagnostics[0]])).toThrow('quality_evidence_invalid');
    expect(() => parseQualityGateEvidence(diagnostics.map((entry) => entry.stage === 'unit' ? { ...entry, category: 'stale' } : entry))).toThrow('quality_evidence_invalid');
  });

  it('permits rollback only to a schema-compatible release in the same topology with Cloudflare authority and resumable work', () => {
    const safe = { targetSchemaCompatible: true, singleVercelProject: true, cloudflareAuthorityPreserved: true, durableRecovery: { activation: true, cleanup: true, transitionReceipt: true, lease: true, invalidation: true, queue: true, webhookOutcome: true }, createsAdditionalTopology: false };
    expect(validateRollback(safe)).toEqual({ promote: true, failures: [] });
    expect(validateRollback({ ...safe, targetSchemaCompatible: false }).promote).toBe(false);
    expect(validateRollback({ ...safe, cloudflareAuthorityPreserved: false }).promote).toBe(false);
    expect(validateRollback({ ...safe, createsAdditionalTopology: true }).promote).toBe(false);
  });
});
