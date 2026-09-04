import { persistedReadModelSchema, type ParsedPersistedReadModel } from '@/core/config/persisted/persisted-schema';
import type { PersistedRuntimeConfigReadModel, RateLimitEndpointClass } from '@/core/config/persisted/read-model';

export interface SharedDeploymentConfig {
  readonly supabaseProjectRef: string;
  readonly cloudflareAccountId: string;
  readonly vercelProjectId: string;
  readonly vercelTeamId: string;
  readonly vercelProductionTargetHostname: string;
  readonly r2AccountId: string;
  readonly r2BucketName: string;
  readonly upstashRedisResourceId: string;
  readonly version: number;
}

export interface MediaPolicy {
  readonly allowedMimeTypes: readonly string[];
  readonly maxObjectBytes: number;
  readonly uploadAuthorizationSeconds: number;
  readonly readAuthorizationSeconds: number;
  readonly version: number;
}

export interface PublicationPolicy {
  readonly maxAttempts: number;
  readonly retryDelaysSeconds: readonly number[];
  readonly leaseSeconds: number;
  readonly batchSize: number;
  readonly functionDeadlineSeconds: number;
  readonly version: number;
}

export interface WebhookPolicy {
  readonly freshnessSeconds: number;
  readonly replayRetentionSeconds: number;
  readonly version: number;
}

export interface CachePolicy {
  readonly publicCacheSeconds: number;
  readonly cacheVersion: number;
  readonly version: number;
}

export interface RateLimitPolicy {
  readonly endpointClass: RateLimitEndpointClass;
  readonly allowance: number;
  readonly windowSeconds: number;
  readonly version: number;
}

export interface RuntimeDomain {
  readonly organizationId: string;
  readonly domainId: string;
  readonly normalizedHostname: string;
  readonly cloudflareZoneId: string;
  readonly routingVersion: number;
  readonly version: number;
}

export interface RuntimeSite {
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

export interface SiteSettings {
  readonly organizationId: string;
  readonly siteId: string;
  readonly locale: string;
  readonly seoDefaultTitle: string;
  readonly seoDefaultDescription: string;
  readonly seoRobotsDirective: 'index,follow' | 'noindex,nofollow';
  readonly seoOpenGraphSiteName: string;
  readonly seoSchemaVersion: number;
  readonly fallbackMediaId: string | null;
  readonly fallbackMediaObjectKey: string | null;
  readonly fallbackMediaState: string | null;
  readonly fallbackMediaOrganizationId: string | null;
  readonly version: number;
}

export interface RuntimePolicies {
  readonly media: MediaPolicy;
  readonly publication: PublicationPolicy;
  readonly webhook: WebhookPolicy;
  readonly cache: CachePolicy;
  readonly rateLimit: Readonly<Record<RateLimitEndpointClass, RateLimitPolicy>>;
}

/** Deeply immutable snapshot built all-or-nothing; replace the whole pointer to update. */
export interface RuntimeConfigSnapshot {
  readonly environment: 'development' | 'test' | 'production';
  readonly configurationVersion: number;
  readonly readAt: string;
  readonly sharedDeployment: SharedDeploymentConfig;
  readonly policies: RuntimePolicies;
  readonly domains: readonly RuntimeDomain[];
  readonly sites: readonly RuntimeSite[];
  readonly domainById: ReadonlyMap<string, RuntimeDomain>;
  readonly domainByHostname: ReadonlyMap<string, RuntimeDomain>;
  readonly siteById: ReadonlyMap<string, RuntimeSite>;
  readonly siteByHostname: ReadonlyMap<string, RuntimeSite>;
  readonly settingsByOrganizationSite: ReadonlyMap<string, SiteSettings>;
}

export interface ConfigIssue {
  readonly path: string;
  readonly category: string;
}

export type PersistedParseResult =
  | { readonly success: true; readonly snapshot: RuntimeConfigSnapshot }
  | { readonly success: false; readonly issues: readonly ConfigIssue[] };

const RATE_LIMIT_CLASSES = ['mutation', 'webhook', 'public_read'] as const;

function freezeDeep<T>(value: T): Readonly<T> {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeDeep)) as unknown as Readonly<T>;
  }
  if (value !== null && typeof value === 'object') {
    const record = Object.entries(value as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    for (const [key, child] of record) {
      out[key] = freezeDeep(child);
    }
    return Object.freeze(out) as unknown as Readonly<T>;
  }
  return value as Readonly<T>;
}

/** Validates a complete persisted read into one frozen snapshot; any missing/duplicate/malformed/cap-violating/cross-tenant row rejects all — never partial. */
export function parsePersistedReadModel(
  readModel: PersistedRuntimeConfigReadModel,
  initialEnvironment: string,
): PersistedParseResult {
  if (readModel.environment !== initialEnvironment) {
    return {
      success: false,
      issues: Object.freeze([{ path: 'environment', category: 'environment_mismatch' }]),
    };
  }

  const parsedResult = persistedReadModelSchema.safeParse(readModel);
  if (!parsedResult.success) {
    const issues = parsedResult.error.issues
      .map((issue) => ({ path: issue.path.join('.') || 'configuration', category: issue.message }))
      .sort((left, right) => `${left.path}:${left.category}`.localeCompare(`${right.path}:${right.category}`));
    return { success: false, issues: Object.freeze(issues) };
  }
  const parsed = parsedResult.data as ParsedPersistedReadModel;

  const proof: ConfigIssue[] = [];

  const byClass = new Map<RateLimitEndpointClass, ParsedPersistedReadModel['rateLimitPolicies'][number]>();
  for (const row of parsed.rateLimitPolicies) {
    if (byClass.has(row.endpointClass)) {
      proof.push({ path: `rateLimitPolicies.${row.endpointClass}`, category: 'duplicate_rate_limit_policy' });
    } else {
      byClass.set(row.endpointClass, row);
    }
  }
  for (const endpointClass of RATE_LIMIT_CLASSES) {
    if (!byClass.has(endpointClass)) {
      proof.push({ path: `rateLimitPolicies.${endpointClass}`, category: 'missing_rate_limit_policy' });
    }
  }
  if (proof.length > 0) {
    return { success: false, issues: Object.freeze(proof) };
  }

  const domainById = new Map<string, RuntimeDomain>();
  const domainByHostname = new Map<string, RuntimeDomain>();
  const zoneOwners = new Map<string, string>();
  for (const raw of parsed.domains) {
    if (domainById.has(raw.domainId)) {
      proof.push({ path: `domains.${raw.domainId}`, category: 'duplicate_domain' });
    } else {
      domainById.set(raw.domainId, { ...raw, organizationId: raw.organizationId });
    }
    if (raw.cloudflareZoneId.trim() === '') {
      proof.push({ path: `domains.${raw.domainId}.cloudflareZoneId`, category: 'domain_zone_missing' });
    }
    if (domainByHostname.has(raw.normalizedHostname)) {
      proof.push({ path: `domains.${raw.normalizedHostname}`, category: 'duplicate_domain_hostname' });
    } else {
      domainByHostname.set(raw.normalizedHostname, raw);
    }
    const owner = zoneOwners.get(raw.cloudflareZoneId);
    if (owner !== undefined && owner !== raw.domainId) {
      proof.push({ path: `domains.${raw.domainId}.cloudflareZoneId`, category: 'duplicate_zone_owner' });
    } else {
      zoneOwners.set(raw.cloudflareZoneId, raw.domainId);
    }
  }

  const siteById = new Map<string, RuntimeSite>();
  const siteByHostname = new Map<string, RuntimeSite>();
  for (const raw of parsed.sites) {
    if (siteById.has(raw.siteId)) {
      proof.push({ path: `sites.${raw.siteId}`, category: 'duplicate_site' });
    } else {
      siteById.set(raw.siteId, raw);
    }
    if (siteByHostname.has(raw.normalizedHostname)) {
      proof.push({ path: `sites.${raw.normalizedHostname}`, category: 'duplicate_site_hostname' });
    } else {
      siteByHostname.set(raw.normalizedHostname, raw);
    }
    const domain = domainById.get(raw.domainId);
    if (domain === undefined) {
      proof.push({ path: `sites.${raw.siteId}.domainId`, category: 'site_domain_missing' });
    } else if (domain.organizationId !== raw.organizationId) {
      proof.push({ path: `sites.${raw.siteId}.domainId`, category: 'site_domain_cross_tenant' });
    } else if (domain.normalizedHostname !== raw.domainNormalizedHostname) {
      proof.push({ path: `sites.${raw.siteId}.domainNormalizedHostname`, category: 'site_domain_hostname_mismatch' });
    }
  }

  const settingsByKey = new Map<string, SiteSettings>();
  const settingsOrgSite = new Map<string, SiteSettings>();
  for (const raw of parsed.siteSettings) {
    const key = `${raw.organizationId}:${raw.siteId}`;
    if (settingsOrgSite.has(key)) {
      proof.push({ path: `siteSettings.${key}`, category: 'duplicate_site_settings' });
    } else {
      settingsOrgSite.set(key, raw);
    }
    settingsByKey.set(key, raw);
  }
  for (const raw of parsed.sites) {
    const settings = settingsOrgSite.get(`${raw.organizationId}:${raw.siteId}`);
    if (settings === undefined) {
      proof.push({ path: `sites.${raw.siteId}.siteSettings`, category: 'site_settings_missing' });
    } else if (settings.organizationId !== raw.organizationId || settings.siteId !== raw.siteId) {
      proof.push({ path: `sites.${raw.siteId}.siteSettings`, category: 'site_settings_cross_tenant' });
    } else if (settings.fallbackMediaId !== null) {
      if (settings.fallbackMediaState !== 'active') {
        proof.push({ path: `siteSettings.${key(settings)}.fallbackMediaId`, category: 'fallback_media_inactive' });
      }
      if (settings.fallbackMediaOrganizationId !== raw.organizationId) {
        proof.push({ path: `siteSettings.${key(settings)}.fallbackMediaId`, category: 'fallback_media_cross_tenant' });
      }
      if (settings.fallbackMediaObjectKey === null) {
        proof.push({ path: `siteSettings.${key(settings)}.fallbackMediaId`, category: 'fallback_media_missing_object' });
      }
    }
  }

  if (proof.length > 0) {
    return { success: false, issues: Object.freeze(proof) };
  }

  const sharedDeployment = freezeDeep(parsed.sharedDeployment);
  const policies: RuntimePolicies = freezeDeep({
    media: parsed.mediaPolicy,
    publication: parsed.publicationPolicy,
    webhook: parsed.webhookPolicy,
    cache: parsed.cachePolicy,
    rateLimit: Object.freeze({
      mutation: byClass.get('mutation')!,
      webhook: byClass.get('webhook')!,
      public_read: byClass.get('public_read')!,
    }),
  });

  const snapshot: RuntimeConfigSnapshot = Object.freeze({
    environment: parsed.environment,
    configurationVersion: parsed.configurationVersion,
    readAt: parsed.readAt,
    sharedDeployment,
    policies,
    domains: freezeDeep(parsed.domains),
    sites: freezeDeep(parsed.sites),
    domainById: new ReadonlyMapView(domainById),
    domainByHostname: new ReadonlyMapView(domainByHostname),
    siteById: new ReadonlyMapView(siteById),
    siteByHostname: new ReadonlyMapView(siteByHostname),
    settingsByOrganizationSite: new ReadonlyMapView(settingsByKey),
  });

  return { success: true, snapshot };
}

function key(settings: SiteSettings): string {
  return `${settings.organizationId}:${settings.siteId}`;
}

class ReadonlyMapView<K, V> implements ReadonlyMap<K, V> {
  readonly #inner: Map<K, V>;

  constructor(inner: Map<K, V>) {
    this.#inner = inner;
  }

  get size(): number {
    return this.#inner.size;
  }

  get(key: K): V | undefined {
    return this.#inner.get(key);
  }

  has(key: K): boolean {
    return this.#inner.has(key);
  }

  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void): void {
    this.#inner.forEach((value, key) => callbackfn(value, key, this));
  }

  entries(): MapIterator<[K, V]> {
    return this.#inner.entries();
  }

  keys(): MapIterator<K> {
    return this.#inner.keys();
  }

  values(): MapIterator<V> {
    return this.#inner.values();
  }

  *[Symbol.iterator](): MapIterator<[K, V]> {
    yield* this.#inner.entries();
  }
}