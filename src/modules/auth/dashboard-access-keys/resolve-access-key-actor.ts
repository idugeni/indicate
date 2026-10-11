import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { LocalUserIdentity, MembershipAuthorization } from '@/modules/auth/rbac';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import {
  DrizzleDashboardAccessKeyRepository,
  type DashboardAccessKeyIdentity,
} from '@/data/repos/dashboard-access-keys';
import { parseAccessKeyCredential, verifyAccessKeySecret } from '@/modules/auth/dashboard-access-keys/access-key-service';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;

export interface ResolvedAccessKeyActor {
  readonly actor: AuthorizedTenantActorContext;
  readonly membership: MembershipAuthorization;
  readonly localUser: LocalUserIdentity;
  readonly identity: DashboardAccessKeyIdentity;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly keyId: string;
}

/**
 * Resolve a dashboard actor from a presented access-key credential.
 *
 * @param database - Shared runtime database handle.
 * @param plaintext - Raw credential from the URL or cookie.
 * @param requestId - Correlation id stamped onto the resolved actor.
 * @param now - Reference time for expiry checks.
 * @returns Actor bound to the key owner's live membership, or null when any check fails.
 * @remarks Permissions are re-resolved from the live membership on every call,
 * so revoking the membership revokes the key immediately. Failures stay
 * non-disclosing: callers must not distinguish unknown, revoked, expired,
 * or mismatched credentials.
 */
export async function resolveAccessKeyActor(
  database: Database,
  plaintext: string,
  requestId: string,
  now: Date = new Date(),
): Promise<ResolvedAccessKeyActor | null> {
  const parsed = parseAccessKeyCredential(plaintext);
  if (parsed === null) return null;
  const keys = new DrizzleDashboardAccessKeyRepository(database);
  const identity = await keys.findIdentityByLookupId(parsed.lookupId);
  if (identity === null) return null;
  if (identity.keyStatus !== 'active') return null;
  if (identity.expiresAt !== null && new Date(identity.expiresAt).getTime() <= now.getTime()) return null;
  if (identity.userStatus !== 'active') return null;
  if (identity.membershipStatus !== 'active' || identity.roleActive !== true) return null;
  if (identity.roleId === null || identity.roleTier === null) return null;
  const valid = await verifyAccessKeySecret(parsed.secret, identity.salt, identity.verificationHash);
  if (!valid) return null;
  const authorization = new DrizzleAuthorizationRepository(database);
  const membership = await authorization.findActiveMembership(identity.organizationId, identity.userId);
  if (membership === null || !membership.roleActive) return null;
  // A valid access key authenticates its owner. Platform scope is granted only
  // when the same active owner has an explicit platform.super_admin grant.
  // Ordinary access keys remain bound to their issuing organization.
  const platformPermissions = await authorization.listPlatformPermissions(identity.userId).catch((): readonly string[] => []);
  const localUser: LocalUserIdentity = {
    id: identity.userId,
    authUserId: identity.authUserId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    status: 'active',
  };
  try {
    await keys.recordAccessKeyUse(identity.organizationId, identity.keyId, now.toISOString());
  } catch {
    /* Usage stamping is best-effort; the bearer already authenticated. */
  }
  return {
    actor: {
      actorType: 'user',
      actorId: identity.userId,
      verifiedAuthUserId: identity.authUserId,
      organizationId: identity.organizationId,
      permissionSet: new Set(membership.orgPermissions),
      platformPermissionSet: new Set(platformPermissions),
      regionScopeId: membership.regionId ?? null,
      entryPoint: 'dashboard',
      requestId,
    },
    membership,
    localUser,
    identity,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    keyId: identity.keyId,
  };
}
