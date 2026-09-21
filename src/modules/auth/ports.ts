import type { ActorType } from '@/core/operation-context';
import type { ActiveOrganizationState, LocalUserIdentity, MembershipAuthorization, PersistedActorAuthorization, TenantResourceReference } from '@/modules/auth/rbac';

export interface AccessibleOrganization {
  readonly id: string;
  readonly name: string;
}

export interface ActiveOrganizationStore {
  read(): Promise<ActiveOrganizationState>;
  clearTenantState(previousOrganizationId: string | null): Promise<void>;
  write(next: ActiveOrganizationState): Promise<void>;
}

export interface AuthorizationRepository {
  /** Uses a server-verified Supabase Auth identity; never accepts a browser-selected local User or Organization ID. */
  listActiveOrganizationsForUser(verifiedAuthUserId: string): Promise<readonly AccessibleOrganization[]>;
  findLocalUserByAuthIdentity(authUserId: string): Promise<LocalUserIdentity | null>;
  linkLocalUser(input: { readonly id: string; readonly authUserId: string; readonly displayName: string; readonly avatarUrl: string | null; readonly email: string | null }): Promise<LocalUserIdentity>;
  /** Own profile for the My Profile form (null when inactive). */
  getOwnProfile(authUserId: string): Promise<{
    readonly displayName: string; readonly email: string | null; readonly bio: string | null;
    readonly locale: string | null; readonly timezone: string | null; readonly avatarUrl: string | null;
  } | null>;
  updateOwnProfile(authUserId: string, patch: {
    readonly displayName?: string;
    readonly bio?: string | null;
    readonly locale?: string | null;
    readonly timezone?: string | null;
    readonly avatarUrl?: string | null;
  }): Promise<LocalUserIdentity | null>;
  findActiveMembership(organizationId: string, userId: string): Promise<MembershipAuthorization | null>;
  /**
   * Batch membership lookup for one user across many organizations in a single roundtrip.
   *
   * @param userId - Local user id owning the memberships.
   * @param organizationIds - Organization ids to resolve; empty returns an empty map.
   * @returns Map of organization id to authorization; missing orgs have no active membership.
   */
  findActiveMemberships(userId: string, organizationIds: readonly string[]): Promise<ReadonlyMap<string, MembershipAuthorization>>;
  /** Platform-scoped grant names for a local user (billing/platform surfaces for users without an org membership). */
  listPlatformPermissions(userId: string): Promise<readonly string[]>;
  findActiveActorAuthorization(
    organizationId: string,
    actorType: Exclude<ActorType, 'user'>,
    actorId: string,
  ): Promise<PersistedActorAuthorization | null>;
  resourceExists(organizationId: string, resource: TenantResourceReference): Promise<boolean>;
}
