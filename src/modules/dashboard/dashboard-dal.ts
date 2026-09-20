import 'server-only';

import { unstable_cache } from 'next/cache';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { createTelegramNotificationService } from '@/modules/integrations/integrations-composition';
import type { DashboardSnapshot, DashboardProjection } from '@/modules/dashboard/models';
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
    const data = await loadDashboardProjection({
      organizationId,
      actorId: local.value.id,
      verifiedAuthUserId: identity.authUserId,
      permissions,
      regionScopeId: membership.regionId,
    });
    return { organizationId, data };
  } catch {
    return null;
  }
}
