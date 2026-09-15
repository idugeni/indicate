export type ActorType = 'user' | 'api_key' | 'telegram' | 'system';
export type EntryPoint = 'dashboard' | 'api' | 'telegram' | 'worker' | 'reconciler';
export type PermissionName = string;

interface ActorContextBase {
  readonly actorId: string;
  readonly organizationId: string | null;
  /** Organization-scoped permissions only. Platform grants live in platformPermissionSet and must never merge here. */
  readonly permissionSet: ReadonlySet<PermissionName>;
  /** Platform-scoped grants (e.g. platform.customer.admin). Read only by platform guards/services. */
  readonly platformPermissionSet?: ReadonlySet<PermissionName>;
  /**
   * Kunci region opsional: bila terisi, aktor hanya boleh menyentuh region
   * tersebut (+ portal apex milik bersama). NULL/undefined berarti semua region.
   */
  readonly regionScopeId?: string | null;
  readonly entryPoint: EntryPoint;
  readonly requestId: string;
}

export type ActorContext =
  | (ActorContextBase & {
    readonly actorType: 'user';
    /** Supabase Auth identity obtained from server-side session verification, never request input. */
    readonly verifiedAuthUserId: string;
  })
  | (ActorContextBase & {
    readonly actorType: Exclude<ActorType, 'user'>;
    readonly verifiedAuthUserId?: never;
  });

export type AuthorizedTenantActorContext = ActorContext & { readonly organizationId: string };

export interface HostnameContext {
  readonly normalizedHostname: string;
  readonly organizationId: string;
  readonly domainId: string;
  readonly siteId: string;
  readonly regionId: string | null;
  readonly routingVersion: number;
}

export type OperationContext =
  | { readonly kind: 'tenant'; readonly actor: AuthorizedTenantActorContext; readonly hostname?: never }
  | { readonly kind: 'public'; readonly actor?: never; readonly hostname: HostnameContext };
