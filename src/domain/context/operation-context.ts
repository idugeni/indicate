export type ActorType = 'user' | 'api_key' | 'telegram' | 'system';
export type EntryPoint = 'cms' | 'api' | 'telegram' | 'worker' | 'reconciler';
export type PermissionName = string;

interface ActorContextBase {
  readonly actorId: string;
  readonly organizationId: string | null;
  readonly permissionSet: ReadonlySet<PermissionName>;
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
