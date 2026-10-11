import { cookies } from 'next/headers';

import { isPlatformOnlyWithoutTicket } from '@/core/routing/platform-guard';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import type * as schema from '@/data/schema';
import { NextDashboardCacheInvalidator } from '@/modules/dashboard/dashboard-dal';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type AiOperatorDashboardContext = {
  readonly actor: AuthorizedTenantActorContext;
  readonly service: TenantBusinessService;
  readonly db: PostgresJsDatabase<typeof schema>;
};

/** Resolve a tenant-scoped dashboard actor for operator APIs; fail closed on platform-only access. */
export async function resolveAiOperatorDashboardContext(
  organizationId: string,
  requestId: string,
  headers: Headers,
): Promise<AiOperatorDashboardContext | null> {
  const cookieStore = await cookies();
  const runtimeContext = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(runtimeContext.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return null;

  const actor: AuthorizedTenantActorContext | null =
    await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null) return null;

  if (isPlatformOnlyWithoutTicket({
    orgPermissionCount: actor.permissionSet.size,
    platformPermissionCount: actor.platformPermissionSet?.size ?? 0,
    headers,
  })) return null;

  return {
    actor,
    db: runtime.db,
    service: new TenantBusinessService(
      new DrizzleDashboardRepository(runtime.db),
      new UuidGenerator(),
      undefined,
      undefined,
      new NextDashboardCacheInvalidator(),
    ),
  };
}
