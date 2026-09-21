import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import type { LocalUserIdentity, MembershipAuthorization } from '@/modules/auth/rbac';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { createTelegramNotificationService } from '@/modules/integrations/integrations-composition';
import type { AnalyticsProjection, DashboardSnapshot, DashboardProjection } from '@/modules/dashboard/models';
import { analyticsFilterSchema } from '@/modules/dashboard/schemas';
import { createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { readPageviewCounts } from '@/integrations/redis/pageview-buffer';
import { UpstashSnapshotStore } from '@/integrations/redis/upstash-snapshot-store';
import { orgTag } from '@/modules/dashboard/cache-tags';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { articleSites } from '@/data/schema';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { buildPageviewKey } from '@/modules/site/pageview-contract';
import type { VerifiedAuthIdentity } from '@/integrations/supabase/ports';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';

/** Snapshot cache keyed by (org, actor, sorted perms); failures throw so only successes cache (60s TTL). */
const DASHBOARD_REVALIDATE_SECONDS = 60;
/** Analytics cache key adds the date range; same TTL and org tag as the dashboard snapshot. */
const ANALYTICS_REVALIDATE_SECONDS = 60;
/** Shared Redis layer over the local cache; dashboard metrics stay fresh for 180s across instances. */
const DASHBOARD_REDIS_TTL_SECONDS = 180;
/** Shared Redis layer for analytics projections; same TTL as the dashboard snapshot. */
const ANALYTICS_REDIS_TTL_SECONDS = 180;

interface ProjectionInput {
  readonly organizationId: string;
  readonly actorId: string;
  readonly verifiedAuthUserId: string;
  readonly permissions: readonly string[];
  readonly regionScopeId: string | null;
}

interface AnalyticsInput extends ProjectionInput {
  readonly from: string | undefined;
  readonly to: string | undefined;
}

/** Pre-resolved identity forwarded by the RSC shell to skip duplicate auth lookups. */
export interface ResolvedDashboardIdentity {
  readonly localUser: LocalUserIdentity;
  readonly membership: MembershipAuthorization;
}

function permissionFingerprint(permissions: readonly string[]): string {
  const sorted = [...permissions].sort().join(',');
  let hash = 5381;
  for (let index = 0; index < sorted.length; index += 1) {
    hash = ((hash << 5) + hash + sorted.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(16);
}

function resolveDashboardStore(): UpstashSnapshotStore | null {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;
  try {
    const bootstrap = getBootstrapConfig();
    return new UpstashSnapshotStore({
      url: bootstrap.credentials.upstashRestUrl,
      token: bootstrap.credentials.upstashRestToken.reveal(),
      namespace: `indicate:dashboard:${bootstrap.environment}`,
    });
  } catch {
    return null;
  }
}

function dashboardRedisKey(input: ProjectionInput): string {
  return `snapshot:${input.organizationId}:${input.actorId}:${permissionFingerprint(input.permissions)}:${input.regionScopeId ?? '-'}`;
}

function analyticsRedisKey(input: AnalyticsInput): string {
  return `analytics:${input.organizationId}:${input.actorId}:${permissionFingerprint(input.permissions)}:${input.regionScopeId ?? '-'}:${input.from ?? '-'}_${input.to ?? '-'}`;
}

function fullSnapshotRedisKey(input: ProjectionInput): string {
  return `full:${input.organizationId}:${input.actorId}:${permissionFingerprint(input.permissions)}:${input.regionScopeId ?? '-'}`;
}

function isDashboardProjection(value: unknown): value is DashboardProjection {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.activeDomains === 'number'
    && typeof record.activeSites === 'number'
    && typeof record.activeArticles === 'number';
}

function isAnalyticsProjection(value: unknown): value is AnalyticsProjection {
  if (typeof value !== 'object' || value === null) return false;
  return Array.isArray((value as { readonly articlesByRegion?: unknown }).articlesByRegion);
}

interface SnapshotData extends DashboardProjection {
  readonly analytics: AnalyticsProjection;
}

function isFullSnapshot(value: unknown, organizationId: string): value is DashboardSnapshot & { readonly data: SnapshotData } {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as { readonly organizationId?: unknown; readonly data?: unknown };
  if (record.organizationId !== organizationId) return false;
  if (typeof record.data !== 'object' || record.data === null) return false;
  const data = record.data as Record<string, unknown>;
  return isDashboardProjection(data) && isAnalyticsProjection(data.analytics);
}

const PAGEVIEW_BUFFER_ARTICLE_LIMIT = 100;

async function mergePageviewBuffer(organizationId: string, projection: AnalyticsProjection): Promise<AnalyticsProjection> {
  try {
    const rows = projection.viewsByArticle ?? [];
    if (rows.length === 0) return projection;
    if (process.env.NEXT_PHASE === 'phase-production-build') return projection;
    const context = await getServerRuntimeContext();
    const articleIds = [...new Set(rows.map((row) => row.key))].slice(0, PAGEVIEW_BUFFER_ARTICLE_LIMIT);
    if (articleIds.length === 0) return projection;
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const mappings = await runtime.db
      .select({ id: articleSites.id, siteId: articleSites.siteId, articleId: articleSites.articleId })
      .from(articleSites)
      .where(and(eq(articleSites.organizationId, organizationId), inArray(articleSites.articleId, articleIds)));
    if (mappings.length === 0) return projection;
    const keys = mappings.map((mapping) =>
      buildPageviewKey(context.bootstrap.environment, { o: organizationId, s: mapping.siteId, a: mapping.id }),
    );
    const counts = await readPageviewCounts({ url: context.config.redis.url, token: context.config.redis.token, keys });
    const perArticle = new Map<string, number>();
    const perSite = new Map<string, number>();
    let total = 0;
    mappings.forEach((mapping, index) => {
      const count = counts[index] ?? 0;
      if (count <= 0) return;
      perArticle.set(mapping.articleId, (perArticle.get(mapping.articleId) ?? 0) + count);
      perSite.set(mapping.siteId, (perSite.get(mapping.siteId) ?? 0) + count);
      total += count;
    });
    if (total === 0) return projection;
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...projection,
      viewsByArticle: (projection.viewsByArticle ?? []).map((row) => {
        const pending = perArticle.get(row.key) ?? 0;
        return pending === 0 ? row : { ...row, views: row.views + pending };
      }),
      viewsBySite: (projection.viewsBySite ?? []).map((row) => {
        const pending = perSite.get(row.key) ?? 0;
        return pending === 0 ? row : { ...row, views: row.views + pending };
      }),
      viewsHarian: (projection.viewsHarian ?? []).map((row) =>
        row.hari === today ? { ...row, views: row.views + total } : row,
      ),
      totalViews: (projection.totalViews ?? 0) + total,
    };
  } catch {
    return projection;
  }
}

async function loadDashboardProjectionFromDatabase(input: ProjectionInput): Promise<DashboardProjection> {
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const service = new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator(), undefined, createTelegramNotificationService(context.config, context.bootstrap));
  const actor: AuthorizedTenantActorContext = {
    actorType: 'user',
    actorId: input.actorId,
    verifiedAuthUserId: input.verifiedAuthUserId,
    organizationId: input.organizationId,
    permissionSet: new Set(input.permissions),
    regionScopeId: input.regionScopeId,
    entryPoint: 'dashboard',
    requestId: crypto.randomUUID(),
  };
  const result = await service.dashboard(actor);
  if (!result.ok) throw new Error(`dashboard_snapshot_unavailable:${result.error.error.code}`);
  return result.value;
}

function loadDashboardProjection(input: ProjectionInput): Promise<DashboardProjection> {
  const permissionKey = [...input.permissions].sort().join(',');
  const cached = unstable_cache(
    async (): Promise<DashboardProjection> => {
      const store = resolveDashboardStore();
      const key = dashboardRedisKey(input);
      if (store !== null) {
        const hit = await store.readKey(key);
        if (isDashboardProjection(hit)) return hit;
      }
      const value = await loadDashboardProjectionFromDatabase(input);
      if (store !== null) await store.writeKey(key, value, DASHBOARD_REDIS_TTL_SECONDS);
      return value;
    },
    ['dashboard-snapshot', input.organizationId, input.actorId, permissionKey, input.regionScopeId ?? ''],
    { tags: [orgTag(input.organizationId)], revalidate: DASHBOARD_REVALIDATE_SECONDS },
  );
  return cached();
}

async function loadAnalyticsProjectionFromDatabase(input: AnalyticsInput): Promise<AnalyticsProjection> {
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const service = new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator(), undefined, createTelegramNotificationService(context.config, context.bootstrap));
  const actor: AuthorizedTenantActorContext = {
    actorType: 'user',
    actorId: input.actorId,
    verifiedAuthUserId: input.verifiedAuthUserId,
    organizationId: input.organizationId,
    permissionSet: new Set(input.permissions),
    regionScopeId: input.regionScopeId,
    entryPoint: 'dashboard',
    requestId: crypto.randomUUID(),
  };
  const result = await service.analytics(actor, { ...(input.from === undefined ? {} : { from: input.from }), ...(input.to === undefined ? {} : { to: input.to }) });
  if (!result.ok) throw new Error(`analytics_snapshot_unavailable:${result.error.error.code}`);
  return result.value;
}

/**
 * Load the analytics projection through the 60-second cache per (org, actor, permissions, range).
 *
 * @param input - Org/actor identity, sorted permissions, region scope, and validated `from`/`to` range.
 * @returns Frozen analytics projection; fails when analytics permission is unmet.
 */
function loadAnalyticsProjection(input: AnalyticsInput): Promise<AnalyticsProjection> {
  const permissionKey = [...input.permissions].sort().join(',');
  const cached = unstable_cache(
    async (): Promise<AnalyticsProjection> => {
      const store = resolveDashboardStore();
      const key = analyticsRedisKey(input);
      if (store !== null) {
        const hit = await store.readKey(key);
        if (isAnalyticsProjection(hit)) return hit;
      }
      const value = await loadAnalyticsProjectionFromDatabase(input);
      if (store !== null) await store.writeKey(key, value, ANALYTICS_REDIS_TTL_SECONDS);
      return value;
    },
    ['analytics-snapshot', input.organizationId, input.actorId, permissionKey, input.regionScopeId ?? '', input.from ?? '', input.to ?? ''],
    { tags: [orgTag(input.organizationId)], revalidate: ANALYTICS_REVALIDATE_SECONDS },
  );
  return cached();
}

/**
 * Read dashboard metrics through the shared cache layer without a full query on hit.
 *
 * @param actor - Tenant user actor; org and platform permissions merge into the cache key.
 * @returns Count projection or unavailability envelope; the cache stores successes only.
 */
export async function fetchCachedDashboard(
  actor: Extract<AuthorizedTenantActorContext, { readonly actorType: 'user' }>,
): Promise<Result<DashboardProjection, PublicErrorEnvelope>> {
  try {
    const permissions = [...actor.permissionSet, ...(actor.platformPermissionSet ?? [])];
    const value = await loadDashboardProjection({
      organizationId: actor.organizationId,
      actorId: actor.actorId,
      verifiedAuthUserId: actor.verifiedAuthUserId,
      permissions,
      regionScopeId: actor.regionScopeId ?? null,
    });
    return { ok: true, value };
  } catch {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', actor.requestId) };
  }
}

/**
 * Read analytics with filter validation and snapshot caching.
 *
 * @param actor - Tenant user actor from the workspace route (cookie sessions are always users).
 * @param rawFilter - Raw `from`/`to` filter; validated before touching the cache.
 * @returns Analytics projection or invalid-input envelope; the cache stores successes only.
 */
export async function fetchCachedAnalytics(
  actor: Extract<AuthorizedTenantActorContext, { readonly actorType: 'user' }>,
  rawFilter: unknown,
): Promise<Result<AnalyticsProjection, PublicErrorEnvelope>> {
  const parsed = analyticsFilterSchema.safeParse(rawFilter ?? {});
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.') || 'request';
      fields[path] = [...(fields[path] ?? []), issue.message];
    }
    return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', actor.requestId, fields) };
  }
  try {
    const permissions = [...actor.permissionSet, ...(actor.platformPermissionSet ?? [])];
    const value = await loadAnalyticsProjection({
      organizationId: actor.organizationId,
      actorId: actor.actorId,
      verifiedAuthUserId: actor.verifiedAuthUserId,
      permissions,
      regionScopeId: actor.regionScopeId ?? null,
      from: parsed.data.from,
      to: parsed.data.to,
    });
    return { ok: true, value: await mergePageviewBuffer(actor.organizationId, value) };
  } catch {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', actor.requestId) };
  }
}

/**
 * Server-first dashboard read with a shared full-snapshot fast path.
 *
 * @param organizationId - Organization to snapshot; must match the resolved membership.
 * @param identity - Verified Supabase Auth identity for the session owner.
 * @param preResolved - Local user plus membership already resolved by the caller; skips duplicate lookups.
 * @returns Complete snapshot with embedded analytics, or null so the client falls back to live fetch.
 */
export async function getDashboardSnapshot(organizationId: string, identity: VerifiedAuthIdentity, preResolved?: ResolvedDashboardIdentity): Promise<DashboardSnapshot | null> {
  try {
    let actorId: string;
    let verifiedAuthUserId: string;
    let permissions: string[];
    let regionScopeId: string | null;
    if (preResolved !== undefined) {
      if (preResolved.membership.organizationId !== organizationId || !preResolved.membership.roleActive) return null;
      actorId = preResolved.localUser.id;
      verifiedAuthUserId = identity.authUserId;
      permissions = [...preResolved.membership.orgPermissions, ...preResolved.membership.platformPermissions].sort();
      regionScopeId = preResolved.membership.regionId;
    } else {
      const context = await getServerRuntimeContext();
      const runtime = getSharedRuntimeDatabase(context.bootstrap);
      const authorization = new DrizzleAuthorizationRepository(runtime.db);
      const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
      if (!local.ok) return null;
      const membership = await authorization.findActiveMembership(organizationId, local.value.id);
      if (membership === null || !membership.roleActive) return null;
      actorId = local.value.id;
      verifiedAuthUserId = identity.authUserId;
      permissions = [...membership.orgPermissions, ...membership.platformPermissions].sort();
      regionScopeId = membership.regionId;
    }
    const projectionInput = {
      organizationId,
      actorId,
      verifiedAuthUserId,
      permissions,
      regionScopeId,
    };
    const store = resolveDashboardStore();
    if (store !== null) {
      const fullKey = fullSnapshotRedisKey(projectionInput);
      const dashboardKey = dashboardRedisKey(projectionInput);
      const analyticsKey = analyticsRedisKey({ ...projectionInput, from: undefined, to: undefined });
      const [fullHit, dashboardHit, analyticsHit] = await store.readMany([fullKey, dashboardKey, analyticsKey]);
      if (isFullSnapshot(fullHit, organizationId)) {
        return {
          organizationId,
          data: { ...fullHit.data, analytics: await mergePageviewBuffer(organizationId, fullHit.data.analytics) },
        };
      }
      if (isDashboardProjection(dashboardHit) && isAnalyticsProjection(analyticsHit)) {
        const snapshot: DashboardSnapshot = {
          organizationId,
          data: { ...dashboardHit, analytics: await mergePageviewBuffer(organizationId, analyticsHit) },
        };
        await store.writeKey(fullKey, snapshot, DASHBOARD_REDIS_TTL_SECONDS);
        return snapshot;
      }
    }
    const [data, analytics] = await Promise.all([
      loadDashboardProjection(projectionInput),
      loadAnalyticsProjection({ ...projectionInput, from: undefined, to: undefined }).catch(() => null),
    ]);
    if (analytics === null) return { organizationId, data };
    const snapshot: DashboardSnapshot = {
      organizationId,
      data: { ...data, analytics: await mergePageviewBuffer(organizationId, analytics) },
    };
    if (store !== null) await store.writeKey(fullSnapshotRedisKey(projectionInput), snapshot, DASHBOARD_REDIS_TTL_SECONDS);
    return snapshot;
  } catch {
    return null;
  }
}
