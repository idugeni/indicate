import 'server-only';

import { unstable_cache } from 'next/cache';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { createTelegramNotificationService } from '@/modules/integrations/integrations-composition';
import type { AnalyticsProjection, DashboardSnapshot, DashboardProjection } from '@/modules/dashboard/models';
import { analyticsFilterSchema } from '@/modules/dashboard/schemas';
import { createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { orgTag } from '@/modules/dashboard/cache-tags';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import type { VerifiedAuthIdentity } from '@/integrations/supabase/ports';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';

/** Snapshot cache keyed by (org, actor, sorted perms); failures throw so only successes cache (60s TTL). */
const DASHBOARD_REVALIDATE_SECONDS = 60;
/** Analytics cache key adds the date range; same TTL and org tag as the dashboard snapshot. */
const ANALYTICS_REVALIDATE_SECONDS = 60;

function loadDashboardProjection(input: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly verifiedAuthUserId: string;
  readonly permissions: readonly string[];
  readonly regionScopeId: string | null;
}): Promise<DashboardProjection> {
  const permissionKey = [...input.permissions].sort().join(',');
  const cached = unstable_cache(
    async (): Promise<DashboardProjection> => {
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
    },
    ['dashboard-snapshot', input.organizationId, input.actorId, permissionKey, input.regionScopeId ?? ''],
    { tags: [orgTag(input.organizationId)], revalidate: DASHBOARD_REVALIDATE_SECONDS },
  );
  return cached();
}

/**
 * Load proyeksi analitik lewat cache 60 detik per (org, aktor, izin, rentang).
 *
 * @param input - Identitas org/aktor, izin terurut, scope region, dan rentang `from`/`to` tervalidasi.
 * @returns Proyeksi analitik beku; gagal bila izin analitik tidak terpenuhi.
 */
function loadAnalyticsProjection(input: {
  readonly organizationId: string;
  readonly actorId: string;
  readonly verifiedAuthUserId: string;
  readonly permissions: readonly string[];
  readonly regionScopeId: string | null;
  readonly from: string | undefined;
  readonly to: string | undefined;
}): Promise<AnalyticsProjection> {
  const permissionKey = [...input.permissions].sort().join(',');
  const cached = unstable_cache(
    async (): Promise<AnalyticsProjection> => {
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
    },
    ['analytics-snapshot', input.organizationId, input.actorId, permissionKey, input.regionScopeId ?? '', input.from ?? '', input.to ?? ''],
    { tags: [orgTag(input.organizationId)], revalidate: ANALYTICS_REVALIDATE_SECONDS },
  );
  return cached();
}

/**
 * Baca analitik dengan validasi filter dan cache snapshot.
 *
 * @param actor - Aktor user tenant dari route workspace (sesi cookie selalu user).
 * @param rawFilter - Filter mentah `from`/`to`; divalidasi sebelum menyentuh cache.
 * @returns Proyeksi analitik atau envelope input-tidak-valid; cache hanya menyimpan sukses.
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
    return { ok: true, value };
  } catch {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', actor.requestId) };
  }
}

/** Server-first dashboard read; fail-soft to null so the client falls back to live fetch. */
export async function getDashboardSnapshot(organizationId: string, identity: VerifiedAuthIdentity): Promise<DashboardSnapshot | null> {
  try {
    const context = await getServerRuntimeContext();
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const authorization = new DrizzleAuthorizationRepository(runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
    if (!local.ok) return null;
    const membership = await authorization.findActiveMembership(organizationId, local.value.id);
    if (membership === null || !membership.roleActive) return null;
    const permissions = [...membership.orgPermissions, ...membership.platformPermissions].sort();
    const projectionInput = {
      organizationId,
      actorId: local.value.id,
      verifiedAuthUserId: identity.authUserId,
      permissions,
      regionScopeId: membership.regionId,
    };
    const [data, analytics] = await Promise.all([
      loadDashboardProjection(projectionInput),
      loadAnalyticsProjection({ ...projectionInput, from: undefined, to: undefined }).catch(() => null),
    ]);
    return { organizationId, data: analytics === null ? data : { ...data, analytics } };
  } catch {
    return null;
  }
}
