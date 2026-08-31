import { createHash } from 'node:crypto';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { validateProductionReadiness } from '@/application/stage7/production-readiness';
import { createCacheIdentity } from '@/application/stage5/cache-identity';
import { PublicContentService } from '@/application/stage5/public-content-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { PublicationWorker } from '@/application/stage4/publication-worker';
import { ApiKeyService, type ApiKeyHasher } from '@/application/stage6/api-key-service';
import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { REVIEWED_MIGRATION_MANIFEST } from '@/domain/stage7/migration-manifest';
import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import { ProductionReadinessAdapter, type ProductionReadinessProbeOverrides } from '@/infrastructure/deployment/production-readiness-adapter';
import { DrizzleStage4Repository } from '@/infrastructure/db/repositories/drizzle-stage4-repository';
import { DrizzleStage5Repository } from '@/infrastructure/db/repositories/drizzle-stage5-repository';
import { DrizzleStage6Repository } from '@/infrastructure/db/repositories/drizzle-stage6-repository';
import { DrizzlePublicationTargetPublisher } from '@/infrastructure/db/drizzle-publication-target-publisher';
import * as schema from '@/infrastructure/db/schema';
import { InMemoryObjectStorage, InMemoryRedisCoordination } from '@/infrastructure/testing/stage4-providers';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import type { PublicSiteCachePort } from '@/ports/public-site-cache';
import { stage7RuntimeConfig } from '../helpers/stage7';

const databaseUrl = process.env.TEST_DATABASE_URL;
const runtimePassword = 'stage7-runtime-contract-password';
const suite = databaseUrl === undefined ? describe.skip : describe;
const NOW = new Date('2026-08-31T08:00:00.000Z');
const idFor = (value: string, suffix: string) => `${value.slice(0, -suffix.length)}${suffix}`;

const PRODUCTION_API_KEY_PATTERN = /^ind_live_[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{43}$/;

class LiveMatrixApiKeyHasher implements ApiKeyHasher {
  async hash(secret: string, salt: string): Promise<string> { return createHash('sha256').update(`${salt}:${secret}`).digest('base64'); }
  async verify(secret: string, salt: string, expectedHash: string): Promise<boolean> { return (await this.hash(secret, salt)) === expectedHash; }
}
function liveCredential(ordinal: number) {
  const lookupId = `s7live${String(ordinal).padStart(10, '0')}`;
  const secret = `${ordinal}${'x'.repeat(42)}`;
  const salt = Buffer.from(`stage7-live-salt-${ordinal}`).toString('base64');
  return { lookupId, secret, salt, plaintext: `ind_live_${lookupId}.${secret}` };
}

describe('Stage 7 live API key credential fixture', () => {
  it('uses the production credential shape with a unique lookup ID for each configured root', () => {
    const credentials = createStage7ReadinessFixture(stage7RuntimeConfig()).roots.map(({ ordinal }) => liveCredential(ordinal));

    expect(credentials).toHaveLength(3);
    for (const credential of credentials) {
      expect(credential.lookupId).toHaveLength(16);
      expect(credential.lookupId).toMatch(/^[A-Za-z0-9_-]{16}$/);
      expect(credential.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(credential.plaintext).toBe(`ind_live_${credential.lookupId}.${credential.secret}`);
      expect(credential.plaintext).toMatch(PRODUCTION_API_KEY_PATTERN);
    }
    expect(new Set(credentials.map(({ lookupId }) => lookupId)).size).toBe(credentials.length);
    expect(new Set(credentials.map(({ plaintext }) => plaintext)).size).toBe(credentials.length);
  });
});

function runtimeUrl(ownerUrl: string): string {
  const value = new URL(ownerUrl);
  value.username = 'indicate_runtime';
  value.password = runtimePassword;
  return value.toString();
}

function providerProbes(): ProductionReadinessProbeOverrides {
  return {
    supabaseAuthHealthy: async () => true,
    r2: async () => ({ healthy: true, dataPlaneHealthy: true, private: true }),
    upstashHealthy: async () => true,
    telegram: async () => ({ healthy: true, webhookMatches: true, secretMatches: true }),
    zone: async (hostname) => ({ hostname, nameserversAuthoritative: true, publicDelegationAuthoritative: true, apexProxied: true, wildcardProxied: true, fullStrict: true }),
    exactDomain: async (hostname) => ({ hostname, associated: true, verified: true }),
    tls: async () => ({ reachable: true, proxied: true }),
  };
}

suite('live PostgreSQL 17 Stage 7 readiness runtime-role contract', () => {
  const owner = databaseUrl === undefined ? null : postgres(databaseUrl, { max: 4, prepare: false });
  const runtime = databaseUrl === undefined ? null : postgres(runtimeUrl(databaseUrl), { max: 4, prepare: false });
  const runtimeDatabase = runtime === null ? null : drizzle(runtime, { schema });
  const baseConfig = stage7RuntimeConfig();
  const fixture = createStage7ReadinessFixture(baseConfig);
  const config = databaseUrl === undefined ? baseConfig : Object.freeze({
    ...baseConfig,
    supabase: Object.freeze({ ...baseConfig.supabase, pooledDatabaseUrl: runtimeUrl(databaseUrl), directDatabaseUrl: databaseUrl }),
  });

  beforeAll(async () => {
    const regionIds = fixture.roots.flatMap((root) => root.regions.map(({ id }) => id));
    expect(regionIds).toHaveLength(9);
    expect(new Set(regionIds).size).toBe(9);
    expect(new Set(fixture.roots.flatMap((root) => root.regions.map(({ externalKey }) => externalKey))).size).toBe(3);
    expect(new Set(fixture.roots.flatMap((root) => root.regions.map(({ slug }) => slug))).size).toBe(3);
    const serverVersion = await owner!<{ server_version_num: string }[]>`SHOW server_version_num`;
    expect(Number(serverVersion[0]?.server_version_num ?? 0)).toBeGreaterThanOrEqual(170000);
    const schema14Migrations = REVIEWED_MIGRATION_MANIFEST.filter(({ version }) => version === 14);
    const schema14Migration = schema14Migrations[0];
    if (schema14Migrations.length !== 1 || schema14Migration === undefined) {
      throw new Error(`reviewed_migration_manifest_invalid:expected_unique_version_14:found_${schema14Migrations.length}`);
    }
    await expect(owner!<{ found: boolean }[]>`
      SELECT EXISTS(
        SELECT 1
          FROM public.indicate_schema_migrations
         WHERE version = ${schema14Migration.version}
           AND name = ${schema14Migration.name}
           AND checksum = ${schema14Migration.checksum}
      ) AS found
    `).resolves.toEqual([{ found: true }]);
    await owner!.unsafe(`ALTER ROLE indicate_runtime PASSWORD '${runtimePassword}'`);

    for (const root of fixture.roots) {
      await owner!`INSERT INTO public.organizations (id, name, slug, status) VALUES (${root.organizationId}::uuid, ${`Stage7 ${root.ordinal}`}, ${`stage7-live-${root.ordinal}`}, 'active')`;
      await owner!`INSERT INTO public.domains (organization_id, id, normalized_hostname, status) VALUES (${root.organizationId}::uuid, ${root.domainId}::uuid, ${root.normalizedHostname}, 'active')`;
      for (const region of root.regions) {
        await owner!`INSERT INTO public.regions (organization_id, id, external_key, name, slug, status) VALUES (${root.organizationId}::uuid, ${region.id}::uuid, ${region.externalKey}, ${region.name}, ${region.slug}, 'active')`;
      }
      await owner!`INSERT INTO public.sites (organization_id, id, domain_id, region_id, normalized_hostname, status, activation_state) VALUES (${root.organizationId}::uuid, ${root.apexSite.id}::uuid, ${root.domainId}::uuid, NULL, ${root.normalizedHostname}, 'active', 'active')`;
      for (const site of root.regionalSites) {
        await owner!`INSERT INTO public.sites (organization_id, id, domain_id, region_id, normalized_hostname, status, activation_state) VALUES (${root.organizationId}::uuid, ${site.id}::uuid, ${root.domainId}::uuid, ${site.regionId}::uuid, ${site.normalizedHostname}, 'active', 'active')`;
        await owner!`INSERT INTO public.site_settings (organization_id, site_id, name, description) VALUES (${root.organizationId}::uuid, ${site.id}::uuid, ${`Stage 7 ${site.normalizedHostname}`}, 'Migrated production-path acceptance contract')`;
        const articleId = idFor(site.id, '700000000001');
        await owner!`INSERT INTO public.articles (organization_id, id, region_id, slug, title, body, source, status, published_at) VALUES (${root.organizationId}::uuid, ${articleId}::uuid, ${site.regionId}::uuid, ${`stage7-${site.normalizedHostname.split('.')[0]}`}, ${`Stage 7 ${site.normalizedHostname}`}, 'Production repository acceptance article.', 'Indicate', 'active', ${NOW})`;
      }
      const credential = liveCredential(root.ordinal);
      const verificationHash = await new LiveMatrixApiKeyHasher().hash(credential.secret, credential.salt);
      await owner!`INSERT INTO public.api_keys (organization_id, id, lookup_id, name, salt, verification_hash, scopes, status) VALUES (${root.organizationId}::uuid, ${idFor(root.organizationId, '700000000020')}::uuid, ${credential.lookupId}, ${`Stage 7 live root ${root.ordinal}`}, ${credential.salt}, ${verificationHash}, ${['publishing.request', 'publishing.read']}::text[], 'active')`;
    }
  }, 30_000);

  afterAll(async () => {
    await runtime?.end({ timeout: 5 });
    await owner?.end({ timeout: 5 });
  });

  it('keeps forced RLS closed while exposing only the bounded exact active host set', async () => {
    await expect(runtime!<{ count: number }[]>`SELECT count(*)::integer AS count FROM public.sites`).resolves.toEqual([{ count: 0 }]);
    const hosts = fixture.allSites.map(({ normalizedHostname }) => normalizedHostname);
    const mappings = await runtime!<{ hostname: string; region_external_key: string | null; region_slug: string | null }[]>`
      SELECT hostname, region_external_key, region_slug
        FROM indicate_private.discover_stage7_active_hosts(${hosts}::text[])
       ORDER BY hostname
    `;
    expect(mappings).toHaveLength(12);
    expect(mappings.filter(({ region_slug: slug }) => slug !== null).map(({ region_slug: slug }) => slug).sort()).toEqual([
      'magelang', 'magelang', 'magelang', 'semarang', 'semarang', 'semarang', 'wonosobo', 'wonosobo', 'wonosobo',
    ]);
    expect(mappings.filter(({ region_external_key: key }) => key !== null).every(({ region_external_key: key }) => key?.startsWith('central-java-'))).toBe(true);
    await expect(runtime!`SELECT * FROM indicate_private.discover_stage7_active_hosts(ARRAY['unknown.example.web.id']::text[])`).resolves.toEqual([]);
    await expect(runtime!`SELECT * FROM indicate_private.discover_stage7_active_hosts(ARRAY[]::text[])`).resolves.toEqual([]);
  });

  it('runs the production database probe as indicate_runtime and validates the complete applied manifest', async () => {
    const adapter = new ProductionReadinessAdapter(config, fetch, process.cwd(), providerProbes());
    const snapshot = await adapter.inspect(fixture);
    expect(snapshot).toMatchObject({ schemaVersion: 14, localMigrationCount: 14, localMigrationSequenceValid: true, appliedMigrationSequenceValid: true });
    expect(snapshot.mappings).toHaveLength(12);
    await expect(validateProductionReadiness(config, fixture, adapter)).resolves.toMatchObject({ ready: true });
  });

  it('publishes all nine scenarios through migrated Drizzle Stage 4 and serves them through exact-host Drizzle Stage 5', async () => {
    if (runtimeDatabase === null) return;
    const stage4 = new DrizzleStage4Repository(runtimeDatabase);
    const stage5 = new DrizzleStage5Repository(runtimeDatabase, config.seo.fallbackAssetUrl);
    const stage6 = new DrizzleStage6Repository(runtimeDatabase);
    const hasher = new LiveMatrixApiKeyHasher();
    const apiKeys = new ApiKeyService(stage6, new UuidGenerator(), undefined, { now: () => NOW }, hasher);
    const queue = new InMemoryRedisCoordination(config.redis.namespace);
    const publication = new PublicationService(stage4, queue, new UuidGenerator(), { maxAttempts: 3, delaysSeconds: [1, 2] }, { now: () => NOW });
    const publicContent = new PublicContentService(stage5);
    const actors = new Map<string, AuthorizedTenantActorContext>();
    const jobs = new Map<string, string>();

    for (const site of fixture.regionalMatrix) {
      const candidates = await stage5.findActiveSitesByExactHostname(site.normalizedHostname);
      expect(candidates).toHaveLength(1);
      await expect(publicContent.load(candidates[0]!, {}, { path: '/', locale: 'id-ID' })).resolves.toMatchObject({ articles: [] });
    }

    for (const root of fixture.roots) {
      const authenticated = await apiKeys.authenticate(liveCredential(root.ordinal).plaintext, 'publishing.request', `stage7-live-auth-${root.ordinal}`);
      expect(authenticated.ok).toBe(true);
      if (!authenticated.ok) continue;
      actors.set(root.organizationId, authenticated.value);
      for (const [index, site] of root.regionalSites.entries()) {
        const requested = await publication.request(authenticated.value, {
          articleId: idFor(site.id, '700000000001'), siteIds: [site.id],
          idempotencyKey: `stage7-live-${root.ordinal}-${index}`, options: { readiness: true },
        });
        expect(requested.ok).toBe(true);
        if (requested.ok) jobs.set(site.id, requested.value.job.id);
      }
    }

    const worker = new PublicationWorker(
      stage4, queue, new DrizzlePublicationTargetPublisher(runtimeDatabase), new InMemoryObjectStorage(() => NOW),
      { maxAttempts: 3, delaysSeconds: [1, 2], leaseSeconds: 30, batchSize: 20, functionDeadlineSeconds: 60 }, { now: () => NOW },
    );
    await expect(worker.run('stage7-live-worker')).resolves.toMatchObject({ claimed: 9, processed: 9 });

    let publishedScenarios = 0;
    for (const root of fixture.roots) for (const [index, site] of root.regionalSites.entries()) {
      const candidate = (await stage5.findActiveSitesByExactHostname(site.normalizedHostname))[0]!;
      const data = await publicContent.load(candidate, {}, { path: '/', locale: 'id-ID' });
      expect(data?.articles.map(({ regionId }) => regionId)).toEqual([site.regionId]);
      expect(data?.articles[0]?.slug).toBe(`stage7-${site.normalizedHostname.split('.')[0]}`);

      const foreignRoot = fixture.roots.find(({ organizationId }) => organizationId !== root.organizationId)!;
      const foreignSite = foreignRoot.regionalSites[index]!;
      const foreignCandidate = (await stage5.findActiveSitesByExactHostname(foreignSite.normalizedHostname))[0]!;
      const foreignData = await publicContent.load(foreignCandidate, {}, { path: '/', locale: 'id-ID' });
      expect(foreignData).not.toBeNull();
      if (data === null || foreignData === null) continue;
      const foreignIdentity = createCacheIdentity({ context: foreignCandidate, locale: 'id-ID', path: '/', query: {}, preview: false, authClass: 'anonymous' })!;
      const foreignCache: PublicSiteCachePort = { read: async () => ({ identity: foreignIdentity, data: foreignData }) };
      const isolated = await new PublicContentService(stage5, foreignCache).load(candidate, {}, { path: '/', locale: 'id-ID' });
      expect(isolated?.context.organizationId).toBe(root.organizationId);
      expect(isolated?.articles.some(({ id }) => foreignData.articles.some((foreign) => foreign.id === id))).toBe(false);

      const ownActor = actors.get(root.organizationId)!;
      const foreignActor = actors.get(foreignRoot.organizationId)!;
      const ownStatus = await publication.status(ownActor, { jobId: jobs.get(site.id)! });
      const crossStatus = await publication.status(foreignActor, { jobId: jobs.get(site.id)! });
      const absentStatus = await publication.status(foreignActor, { jobId: crypto.randomUUID() });
      expect(ownStatus).toMatchObject({ ok: true, value: { result: { finalState: 'published' } } });
      expect(crossStatus).toMatchObject({ ok: false });
      expect(absentStatus).toMatchObject({ ok: false });
      if (!crossStatus.ok && !absentStatus.ok) expect(crossStatus.error.error).toEqual(absentStatus.error.error);
      publishedScenarios += 1;
    }
    expect(publishedScenarios).toBe(9);
  }, 60_000);

  it('omits inactive or incoherent mappings instead of bypassing table policy', async () => {
    const site = fixture.regionalMatrix[0]!;
    await owner!`UPDATE public.regions SET status = 'inactive' WHERE organization_id = ${site.organizationId}::uuid AND id = ${site.regionId}::uuid`;
    const mappings = await runtime!`SELECT * FROM indicate_private.discover_stage7_active_hosts(ARRAY[${site.normalizedHostname}]::text[])`;
    expect(mappings).toEqual([]);
    await owner!`UPDATE public.regions SET status = 'active' WHERE organization_id = ${site.organizationId}::uuid AND id = ${site.regionId}::uuid`;
  });
});
