import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { cookies } from 'next/headers';

import type { ActorContext, AuthorizedTenantActorContext } from '@/core/operation-context';
import { getPublicConfig } from '@/core/config/public-config';
import { UuidGenerator } from '@/core/system/uuid-generator';
import {
  createHardenedSupabaseCookieStore,
  createSupabaseSsrAuthAdapter,
} from '@/integrations/supabase/supabase-ssr';
import type * as schema from '@/data/schema';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DASHBOARD_ACCESS_KEY_COOKIE } from '@/modules/auth/dashboard-access-keys/cookie';
import {
  resolveAccessKeyActor,
  type ResolvedAccessKeyActor,
} from '@/modules/auth/dashboard-access-keys/resolve-access-key-actor';
import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';

type Database = PostgresJsDatabase<typeof schema>;
type CookieStore = Awaited<ReturnType<typeof cookies>>;

export interface DashboardUser {
  readonly authUserId: string;
  readonly localUserId: string;
  readonly avatarUrl: string | null;
  readonly accessKey: ResolvedAccessKeyActor | null;
}

/**
 * Authenticate a dashboard request through either login condition.
 *
 * @param database - Shared runtime database handle.
 * @param cookieStore - Request cookie store carrying either credential.
 * @param requestId - Correlation id stamped onto key-derived actors.
 * @returns Authenticated user, or null when neither credential verifies.
 * @remarks Supabase cookie sessions and dashboard access-key bearers are equal
 * citizens here: every dashboard route authenticates through this function, so
 * no route carries its own second auth branch.
 */
export async function authenticateDashboardUser(
  database: Database,
  cookieStore: CookieStore,
  requestId: string,
): Promise<DashboardUser | null> {
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      set: (name, value, options) => {
        cookieStore.set(name, value, options);
      },
    }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity !== null) {
    const authorization = new DrizzleAuthorizationRepository(database);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
    if (!local.ok || local.value.status !== 'active') return null;
    return {
      authUserId: identity.authUserId,
      localUserId: local.value.id,
      avatarUrl: identity.avatarUrl,
      accessKey: null,
    };
  }
  const bearer = cookieStore.get(DASHBOARD_ACCESS_KEY_COOKIE)?.value ?? null;
  if (bearer === null) return null;
  const resolved = await resolveAccessKeyActor(database, bearer, requestId).catch(() => null);
  if (resolved === null) return null;
  return {
    authUserId: resolved.identity.authUserId,
    localUserId: resolved.localUser.id,
    avatarUrl: resolved.avatarUrl,
    accessKey: resolved,
  };
}

/**
 * Bind an authenticated dashboard user to one organization.
 *
 * @param database - Shared runtime database handle.
 * @param user - Authenticated user from either login condition.
 * @param organizationId - Tenant the request targets.
 * @param requestId - Correlation id stamped onto session-derived actors.
 * @returns Tenant-bound actor, or null when the binding fails.
 * @remarks Access-key bearers stay bound to the organization that issued them;
 * session users bind through their live membership, so revoking the membership
 * revokes both conditions immediately.
 */
export async function authorizeDashboardOrganization(
  database: Database,
  user: DashboardUser,
  organizationId: string,
  requestId: string,
): Promise<AuthorizedTenantActorContext | null> {
  if (user.accessKey !== null) {
    return user.accessKey.actor.organizationId === organizationId ? user.accessKey.actor : null;
  }
  const authorization = new DrizzleAuthorizationRepository(database);
  const membership = await authorization
    .findActiveMembership(organizationId, user.localUserId)
    .catch(() => null);
  if (membership === null || !membership.roleActive) return null;
  return {
    actorType: 'user',
    actorId: user.localUserId,
    verifiedAuthUserId: user.authUserId,
    organizationId,
    permissionSet: new Set(membership.orgPermissions),
    platformPermissionSet: new Set(membership.platformPermissions),
    regionScopeId: membership.regionId ?? null,
    entryPoint: 'dashboard',
    requestId,
  };
}

/**
 * Build a platform-scoped actor for an authenticated dashboard user.
 *
 * @param database - Shared runtime database handle.
 * @param user - Authenticated user from either login condition.
 * @param requestId - Correlation id stamped onto session-derived actors.
 * @param organizationId - Optional tenant the request targets; key bearers must match it.
 * @returns Platform actor, or null when the grants cannot be resolved.
 */
export async function authorizeDashboardPlatform(
  database: Database,
  user: DashboardUser,
  requestId: string,
  organizationId?: string,
): Promise<ActorContext | null> {
  if (user.accessKey !== null) {
    if (organizationId !== undefined && user.accessKey.actor.organizationId !== organizationId) {
      return null;
    }
    return user.accessKey.actor;
  }
  const authorization = new DrizzleAuthorizationRepository(database);
  let platformPermissions: readonly string[];
  try {
    platformPermissions = await authorization.listPlatformPermissions(
      user.localUserId,
      organizationId,
    );
  } catch {
    return null;
  }
  return {
    actorType: 'user',
    actorId: user.localUserId,
    verifiedAuthUserId: user.authUserId,
    organizationId: null,
    permissionSet: new Set(),
    platformPermissionSet: new Set(platformPermissions),
    entryPoint: 'dashboard',
    requestId,
  };
}
