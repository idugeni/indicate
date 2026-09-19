import { sql } from 'drizzle-orm';

import type { ActorContext } from '@/core/operation-context';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { getSharedRuntimeDatabase } from '@/data/client';

type RuntimeDatabase = Awaited<ReturnType<typeof getSharedRuntimeDatabase>>['db'];

/**
 * Resolve the sole platform administrator for owner-only Telegram calls.
 *
 * @param db - Runtime database handle.
 * @returns Active super-admin user id plus auth id, or null when absent or shared.
 * @remarks Solo-admin model: exactly one active `platform.super_admin` must
 * exist. Zero or several matches fail closed so a Telegram owner call never
 * impersonates the wrong administrator.
 */
export async function resolveSolePlatformAdmin(db: RuntimeDatabase): Promise<{ readonly userId: string; readonly authUserId: string } | null> {
  const rows = await db.execute<{ id: string; auth_user_id: string }>(sql`
    SELECT u.id, u.auth_user_id
    FROM public.platform_user_permissions AS g
    JOIN public.permissions AS p ON p.id = g.permission_id
    JOIN public.users AS u ON u.id = g.user_id
    WHERE p.scope = 'platform' AND p.organization_id IS NULL
      AND p.name = 'platform.super_admin' AND u.status = 'active'
    LIMIT 2
  `);
  if (rows.length !== 1 || rows[0] === undefined) return null;
  return { userId: rows[0].id, authUserId: rows[0].auth_user_id };
}

/**
 * Build a platform user actor for a verified Telegram owner call.
 *
 * @param admin - Sole administrator ids from `resolveSolePlatformAdmin`.
 * @param targetOrganizationId - Organization the call operates on.
 * @param requestId - Request id for audit correlation.
 * @returns User actor carrying the super-admin grant via Telegram entry point.
 */
export function ownerAdminActor(
  admin: { readonly userId: string; readonly authUserId: string },
  targetOrganizationId: string,
  requestId: string,
): ActorContext {
  return {
    actorType: 'user',
    actorId: admin.userId,
    verifiedAuthUserId: admin.authUserId,
    organizationId: targetOrganizationId,
    permissionSet: new Set<string>(),
    platformPermissionSet: new Set<string>([INTEGRATIONS_PERMISSIONS.superAdmin]),
    entryPoint: 'telegram',
    requestId,
  };
}
