export interface LocalUserIdentity {
  readonly id: string;
  readonly authUserId: string;
  readonly displayName: string;
  readonly status: 'active' | 'inactive' | 'archived';
}

export interface MembershipAuthorization {
  readonly organizationId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly status: 'active' | 'inactive' | 'archived';
  readonly roleActive: boolean;
  readonly permissions: ReadonlySet<string>;
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
