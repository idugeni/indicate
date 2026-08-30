import type { ActorType } from '@/domain/context/operation-context';
import type { LocalUserIdentity, MembershipAuthorization, PersistedActorAuthorization, TenantResourceReference } from '@/domain/authorization/rbac';

export interface AccessibleOrganization {
  readonly id: string;
  readonly name: string;
}

export interface AuthorizationRepository {
  /** Uses a server-verified Supabase Auth identity; never accepts a browser-selected local User or Organization ID. */
  listActiveOrganizationsForUser(verifiedAuthUserId: string): Promise<readonly AccessibleOrganization[]>;
  findLocalUserByAuthIdentity(authUserId: string): Promise<LocalUserIdentity | null>;
  linkLocalUser(input: { readonly id: string; readonly authUserId: string; readonly displayName: string }): Promise<LocalUserIdentity>;
  findActiveMembership(organizationId: string, userId: string): Promise<MembershipAuthorization | null>;
  findActiveActorAuthorization(
    organizationId: string,
    actorType: Exclude<ActorType, 'user'>,
    actorId: string,
  ): Promise<PersistedActorAuthorization | null>;
  resourceExists(organizationId: string, resource: TenantResourceReference): Promise<boolean>;
}
