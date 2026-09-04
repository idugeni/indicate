import type { TenantResourceReference } from '@/modules/auth/rbac';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';

export interface NewAuditEvent {
  readonly action: string;
  readonly targetType: string;
  readonly targetId?: string;
  readonly outcome: 'succeeded' | 'denied' | 'failed';
  readonly changedFields?: readonly string[];
  readonly before?: Readonly<Record<string, unknown>>;
  readonly after?: Readonly<Record<string, unknown>>;
}

export interface TenantTransaction {
  readonly organizationId: string;
  readonly actor: AuthorizedTenantActorContext;
  revalidatePermission(permission: string): Promise<boolean>;
  resourceExists(resource: TenantResourceReference): Promise<boolean>;
  changeMembershipRole(input: { readonly userId: string; readonly roleId: string }): Promise<boolean>;
  appendAudit(event: NewAuditEvent): Promise<void>;
}

export interface TenantTransactionManager {
  execute<T>(
    actor: AuthorizedTenantActorContext,
    operation: (transaction: TenantTransaction) => Promise<T>,
  ): Promise<T>;
}
