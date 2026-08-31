import 'server-only';

import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RuntimeConfig } from '@/config/schema';
import { REVIEWED_MIGRATION_MANIFEST, matchesReviewedMigrationManifest, migrationBodyChecksum } from '@/domain/stage7/migration-manifest';
import type { Stage7ReadinessFixture } from '@/domain/stage7/models';
import { CloudflareAuthorityAdapter } from '@/infrastructure/cloudflare/cloudflare-authority';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { APPLICATION_HOST, DNS_AUTHORITY, SHARED_RESOURCES } from '@/infrastructure/deployment/topology';
import { R2ObjectStorageAdapter } from '@/infrastructure/storage/r2-object-storage';
import { TelegramBotApiAdapter } from '@/infrastructure/telegram/telegram-bot-api';
import { VercelExactDomainAdapter } from '@/infrastructure/vercel/exact-domain-adapter';
import type {
  ProductionReadinessDatabaseMapping,
  ProductionReadinessDomainSnapshot,
  ProductionReadinessPort,
  ProductionReadinessSnapshot,
  ProductionReadinessZoneSnapshot,
} from '@/ports/production-readiness';

interface CloudflareEnvelope<T> { readonly success: boolean; readonly result: T }
interface TelegramWebhookEnvelope { readonly ok: boolean; readonly result?: { readonly url?: string } }

export interface ProductionReadinessProbeOverrides {
  readonly migrationManifest?: () => Promise<{ readonly count: number; readonly valid: boolean }>;
  readonly database?: (fixture: Stage7ReadinessFixture) => Promise<{ readonly healthy: boolean; readonly schemaVersion: number | null; readonly appliedMigrationSequenceValid: boolean; readonly mappings: readonly ProductionReadinessDatabaseMapping[] }>;
  readonly supabaseAuthHealthy?: () => Promise<boolean>;
  readonly r2?: () => Promise<{ readonly healthy: boolean; readonly dataPlaneHealthy: boolean; readonly private: boolean }>;
  readonly r2DataPlaneHealthy?: () => Promise<boolean>;
  readonly upstashHealthy?: () => Promise<boolean>;
  readonly telegram?: () => Promise<{ readonly healthy: boolean; readonly webhookMatches: boolean; readonly secretMatches: boolean }>;
  readonly zone?: (hostname: string) => Promise<ProductionReadinessZoneSnapshot>;
  readonly exactDomain?: (hostname: string) => Promise<{ readonly hostname: string; readonly associated: boolean; readonly verified: boolean }>;
  readonly tls?: (hostname: string) => Promise<{ readonly reachable: boolean; readonly proxied: boolean }>;
}

function countResource(kind: (typeof SHARED_RESOURCES)[number]['kind']): number {
  return SHARED_RESOURCES.find((resource) => resource.kind === kind)?.count ?? 0;
}

export class ProductionReadinessAdapter implements ProductionReadinessPort {
  private readonly cloudflare: CloudflareAuthorityAdapter;
  private readonly vercel: VercelExactDomainAdapter;
  private readonly telegram: TelegramBotApiAdapter;

  constructor(
    private readonly config: RuntimeConfig,
    private readonly fetcher: typeof fetch = fetch,
    private readonly repositoryRoot = process.cwd(),
    private readonly overrides: ProductionReadinessProbeOverrides = {},
    publicNsResolver?: (hostname: string) => Promise<readonly string[]>,
  ) {
    this.cloudflare = new CloudflareAuthorityAdapter(
      config.cloudflare.accountId,
      config.cloudflare.apiToken,
      config.cloudflare.zoneIds,
      config.cloudflare.expectedNameservers,
      config.vercel.productionTarget,
      publicNsResolver,
      fetcher,
    );
    this.vercel = new VercelExactDomainAdapter(config.vercel.projectId, config.vercel.teamId, config.vercel.apiToken, fetcher);
    this.telegram = new TelegramBotApiAdapter(config.telegram.botToken, config.r2.maxBytes, fetcher);
  }

  private async migrationManifest(): Promise<{ count: number; valid: boolean }> {
    if (this.overrides.migrationManifest !== undefined) return this.overrides.migrationManifest();
    try {
      const journal = JSON.parse(await readFile(join(this.repositoryRoot, 'drizzle/meta/_journal.json'), 'utf8')) as {
        entries?: readonly { idx?: number; tag?: string }[];
      };
      const entries = journal.entries ?? [];
      if (entries.length !== REVIEWED_MIGRATION_MANIFEST.length) return { count: entries.length, valid: false };
      const sqlFiles = await Promise.all(REVIEWED_MIGRATION_MANIFEST.map(async (expected, index) => {
        const journalEntry = entries[index];
        if (journalEntry?.idx !== index || journalEntry.tag !== expected.tag) return null;
        const path = join(this.repositoryRoot, 'drizzle', `${expected.tag}.sql`);
        await access(path);
        const content = await readFile(path, 'utf8');
        return migrationBodyChecksum(content, expected) === expected.checksum;
      }));
      return { count: entries.length, valid: sqlFiles.every((value) => value === true) };
    } catch {
      return { count: 0, valid: false };
    }
  }

  private async authHealthy(): Promise<boolean> {
    if (this.overrides.supabaseAuthHealthy !== undefined) return this.overrides.supabaseAuthHealthy();
    try {
      const response = await this.fetcher(`${this.config.supabase.url}/auth/v1/health`, {
        headers: { apikey: this.config.supabase.anonKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      return response.ok;
    } catch { return false; }
  }

  private async r2Healthy(): Promise<boolean> {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.config.r2.accountId)}/r2/buckets/${encodeURIComponent(this.config.r2.bucketName)}`;
    try {
      const response = await this.fetcher(endpoint, {
        headers: { Authorization: `Bearer ${this.config.cloudflare.apiToken}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return false;
      const body = await response.json() as CloudflareEnvelope<{ readonly name?: string }>;
      return body.success && body.result.name === this.config.r2.bucketName;
    } catch { return false; }
  }

  private async upstashIsHealthy(): Promise<boolean> {
    try {
      const response = await this.fetcher(new URL('/ping', this.config.redis.url), {
        headers: { Authorization: `Bearer ${this.config.redis.token}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) return false;
      const body = await response.json() as { readonly result?: string };
      return body.result === 'PONG';
    } catch { return false; }
  }

  private async r2DataPlaneHealthy(): Promise<boolean> {
    const storage = new R2ObjectStorageAdapter({
      accountId: this.config.r2.accountId,
      bucketName: this.config.r2.bucketName,
      accessKeyId: this.config.r2.accessKeyId,
      secretAccessKey: this.config.r2.secretAccessKey,
    });
    return (await storage.check()).status === 'healthy';
  }

  private async r2IsPrivate(): Promise<boolean> {
    const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.config.r2.accountId)}/r2/buckets/${encodeURIComponent(this.config.r2.bucketName)}/domains`;
    const headers = { Authorization: `Bearer ${this.config.cloudflare.apiToken}` };
    try {
      const [customResponse, managedResponse] = await Promise.all([
        this.fetcher(`${base}/custom`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10_000) }),
        this.fetcher(`${base}/managed`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10_000) }),
      ]);
      if (!customResponse.ok || !managedResponse.ok) return false;
      const custom = await customResponse.json() as CloudflareEnvelope<{ readonly domains?: readonly unknown[] }>;
      const managed = await managedResponse.json() as CloudflareEnvelope<{ readonly enabled?: boolean }>;
      const customDomains = custom.result.domains;
      return custom.success && managed.success && Array.isArray(customDomains)
        && customDomains.length === 0 && managed.result.enabled === false;
    } catch { return false; }
  }

  private async telegramWebhookMatches(): Promise<boolean> {
    if (this.overrides.telegram !== undefined) return (await this.overrides.telegram()).webhookMatches;
    try {
      const base = `https://api.telegram.org/bot${encodeURIComponent(this.config.telegram.botToken)}`;
      const response = await this.fetcher(`${base}/getWebhookInfo`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return false;
      const body = await response.json() as TelegramWebhookEnvelope;
      return body.ok && body.result?.url === this.config.telegram.webhookUrl;
    } catch { return false; }
  }

  private async telegramSecretMatches(): Promise<boolean> {
    try {
      const configuredWebhook = new URL(this.config.telegram.webhookUrl);
      if (configuredWebhook.protocol !== 'https:' || configuredWebhook.hostname !== this.config.hosts.webhook) return false;
      const challengeUrl = new URL('/api/webhooks/readiness/telegram-secret', configuredWebhook);
      const headers = {
        'x-indicate-cloudflare-origin': this.config.cloudflare.originSecret,
        'x-telegram-bot-api-secret-token': this.config.telegram.webhookSecret,
        'user-agent': 'indicate-production-readiness/1',
      };
      const response = await this.fetcher(challengeUrl, { method: 'POST', headers, cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      return response.status === 204;
    } catch { return false; }
  }

  private async tls(hostname: string): Promise<{ reachable: boolean; proxied: boolean }> {
    if (this.overrides.tls !== undefined) return this.overrides.tls(hostname);
    try {
      const response = await this.fetcher(`https://${hostname}/robots.txt`, {
        redirect: 'manual',
        cache: 'no-store',
        headers: { 'User-Agent': 'indicate-production-readiness/1' },
        signal: AbortSignal.timeout(10_000),
      });
      const server = response.headers.get('server')?.toLowerCase() ?? '';
      return { reachable: response.ok, proxied: response.headers.has('cf-ray') || server.includes('cloudflare') };
    } catch { return { reachable: false, proxied: false }; }
  }

  private async database(fixture: Stage7ReadinessFixture): Promise<{ healthy: boolean; schemaVersion: number | null; appliedMigrationSequenceValid: boolean; mappings: readonly ProductionReadinessDatabaseMapping[] }> {
    if (this.overrides.database !== undefined) return this.overrides.database(fixture);
    const runtime = createRuntimeDatabase(this.config);
    try {
      const ping = await runtime.client<{ ready: number }[]>`SELECT 1::integer AS ready`;
      const applied = await runtime.client<{ version: number; name: string; checksum: string }[]>`
        SELECT version::integer, name, checksum
          FROM public.indicate_schema_migrations
         WHERE version <= ${REVIEWED_MIGRATION_MANIFEST.length}
         ORDER BY version
      `;
      const versions = await runtime.client<{ version: number | null }[]>`SELECT max(version)::integer AS version FROM public.indicate_schema_migrations`;
      const expectedHosts = fixture.allSites.map((site) => site.normalizedHostname);
      const rows = await runtime.client<ProductionReadinessDatabaseMapping[]>`
        SELECT hostname,
               organization_id::text AS "organizationId",
               domain_id::text AS "domainId",
               site_id::text AS "siteId",
               region_id::text AS "regionId",
               region_external_key AS "regionExternalKey",
               region_slug AS "regionSlug",
               coherent
          FROM indicate_private.discover_stage7_active_hosts(${expectedHosts}::text[])
      `;
      return {
        healthy: ping[0]?.ready === 1,
        schemaVersion: versions[0]?.version ?? null,
        appliedMigrationSequenceValid: matchesReviewedMigrationManifest(applied),
        mappings: Object.freeze(rows.map((row) => Object.freeze({ ...row }))),
      };
    } catch {
      return { healthy: false, schemaVersion: null, appliedMigrationSequenceValid: false, mappings: [] };
    } finally {
      await runtime.close();
    }
  }

  async inspect(fixture: Stage7ReadinessFixture): Promise<ProductionReadinessSnapshot> {
    const database = await this.database(fixture);
    const [manifest, authHealthy, r2Status, upstashHealthy, telegramStatus] = await Promise.all([
      this.migrationManifest(),
      this.authHealthy(),
      this.overrides.r2?.() ?? Promise.all([this.r2Healthy(), this.overrides.r2DataPlaneHealthy?.() ?? this.r2DataPlaneHealthy(), this.r2IsPrivate()]).then(([healthy, dataPlaneHealthy, privateBucket]) => ({ healthy, dataPlaneHealthy, private: privateBucket })),
      this.overrides.upstashHealthy?.() ?? this.upstashIsHealthy(),
      this.overrides.telegram?.() ?? Promise.all([this.telegram.check(), this.telegramWebhookMatches(), this.telegramSecretMatches()]).then(([health, webhookMatches, secretMatches]) => ({ healthy: health.status === 'healthy', webhookMatches, secretMatches })),
    ]);

    const zones: ProductionReadinessZoneSnapshot[] = [];
    for (const root of fixture.roots) {
      try {
        if (this.overrides.zone !== undefined) {
          zones.push(Object.freeze(await this.overrides.zone(root.normalizedHostname)));
          continue;
        }
        const zone = await this.cloudflare.verifyRootZone(root.normalizedHostname);
        zones.push(Object.freeze({
          hostname: root.normalizedHostname,
          nameserversAuthoritative: zone.nameserversAuthoritative,
          publicDelegationAuthoritative: zone.publicDelegationAuthoritative,
          apexProxied: zone.apexProxied,
          wildcardProxied: zone.wildcardProxied,
          fullStrict: zone.sslMode === 'full_strict',
        }));
      } catch {
        zones.push(Object.freeze({ hostname: root.normalizedHostname, nameserversAuthoritative: false, publicDelegationAuthoritative: false, apexProxied: false, wildcardProxied: false, fullStrict: false }));
      }
    }

    const domains: ProductionReadinessDomainSnapshot[] = [];
    for (const site of fixture.allSites) {
      const [association, transport] = await Promise.all([
        (this.overrides.exactDomain?.(site.normalizedHostname) ?? this.vercel.inspectExactDomain(site.normalizedHostname)).catch(() => ({ hostname: site.normalizedHostname, associated: false, verified: false })),
        this.tls(site.normalizedHostname),
      ]);
      domains.push(Object.freeze({
        hostname: site.normalizedHostname,
        associated: association.associated && association.hostname === site.normalizedHostname,
        verified: association.verified,
        tlsReachable: transport.reachable,
        cloudflareProxied: transport.proxied,
      }));
    }

    return Object.freeze({
      localMigrationCount: manifest.count,
      localMigrationSequenceValid: manifest.valid,
      appliedMigrationSequenceValid: database.appliedMigrationSequenceValid,
      schemaVersion: database.schemaVersion,
      services: Object.freeze({
        supabaseAuthHealthy: authHealthy,
        supabaseDatabaseHealthy: database.healthy,
        r2Healthy: r2Status.healthy,
        r2DataPlaneHealthy: r2Status.dataPlaneHealthy,
        r2Private: r2Status.private,
        upstashHealthy,
        telegramHealthy: telegramStatus.healthy,
        telegramWebhookMatches: telegramStatus.webhookMatches,
        telegramWebhookSecretMatches: telegramStatus.secretMatches,
      }),
      zones: Object.freeze(zones),
      domains: Object.freeze(domains),
      mappings: database.mappings,
      topology: Object.freeze({
        applicationCount: countResource('next_application'),
        vercelProjectCount: APPLICATION_HOST.projectCount,
        supabaseProjectCount: countResource('supabase_project'),
        supabaseDatabaseCount: countResource('supabase_database'),
        supabaseAuthCount: countResource('supabase_auth'),
        r2BucketCount: countResource('r2_bucket'),
        upstashResourceCount: countResource('upstash_redis'),
        publicTemplateCount: countResource('public_news_template'),
        cloudflareAuthority: DNS_AUTHORITY.provider === 'cloudflare',
        vercelHostingOnly: APPLICATION_HOST.responsibility === 'application_hosting_only',
        vercelExactDomainsOnly: APPLICATION_HOST.domainAssociation === 'exact_only'
          && !APPLICATION_HOST.nameserverTransferAllowed
          && !APPLICATION_HOST.wildcardRegistrationAllowed,
      }),
    });
  }
}
