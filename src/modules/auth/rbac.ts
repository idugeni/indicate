import type { RoleTier } from '@/modules/dashboard/models';

export interface LocalUserIdentity {
  readonly id: string;
  readonly authUserId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly status: 'active' | 'inactive' | 'archived';
}

export interface MembershipAuthorization {
  readonly organizationId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly status: 'active' | 'inactive' | 'archived';
  readonly roleActive: boolean;
  readonly roleTier: RoleTier;
  /** Permissions scoped to the organization (permissions.scope = 'organization'). Only these authorize org actions. */
  readonly orgPermissions: ReadonlySet<string>;
  /** Platform-scoped grants (permission_list_platform). Only these authorize platform actions. Never merged with org perms. */
  readonly platformPermissions: ReadonlySet<string>;
}

export interface PersistedActorAuthorization {
  readonly organizationId: string;
  readonly actorId: string;
  readonly permissions: ReadonlySet<string>;
}

export interface TenantResourceReference {
  readonly type: string;
  readonly id: string;
}

export interface ActiveOrganizationState {
  readonly organizationId: string | null;
  readonly generation: number;
}
