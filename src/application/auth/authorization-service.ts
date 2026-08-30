import type { AuthorizedTenantActorContext, ActorContext } from '@/domain/context/operation-context';
import type { TenantResourceReference } from '@/domain/authorization/rbac';
import type { AuthorizationRepository } from '@/ports/authorization-repository';
import type { NewAuditEvent, TenantTransaction, TenantTransactionManager } from '@/ports/tenant-transaction';
import { createNonDisclosingDenial, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';

export class AuthorizationService {
  constructor(private readonly repository: AuthorizationRepository) {}

  async authorize(
    actor: ActorContext,
    organizationId: string,
    permission: string,
    resource?: TenantResourceReference,
  ): Promise<Result<AuthorizedTenantActorContext, PublicErrorEnvelope>> {
    const denial = () => ({ ok: false, error: createNonDisclosingDenial(actor.requestId) } as const);
    if (actor.organizationId !== organizationId) return denial();

    const effectivePermissions = actor.actorType === 'user'
      ? await this.resolveUserPermissions(organizationId, actor.actorId)
      : (await this.repository.findActiveActorAuthorization(organizationId, actor.actorType, actor.actorId))?.permissions ?? null;
    if (effectivePermissions === null || !effectivePermissions.has(permission)) return denial();
    if (resource !== undefined && !await this.repository.resourceExists(organizationId, resource)) return denial();

    return {
      ok: true,
      value: Object.freeze({ ...actor, organizationId, permissionSet: new Set(effectivePermissions) }),
    };
  }

  private async resolveUserPermissions(organizationId: string, userId: string): Promise<ReadonlySet<string> | null> {
    const membership = await this.repository.findActiveMembership(organizationId, userId);
    if (membership === null || membership.status !== 'active' || !membership.roleActive) return null;
    return membership.permissions;
  }

  async changeMembershipRole(input: {
    readonly actor: ActorContext;
    readonly organizationId: string;
    readonly userId: string;
    readonly roleId: string;
    readonly transactionManager: TenantTransactionManager;
  }): Promise<Result<boolean, PublicErrorEnvelope>> {
    const permission = 'membership.manage';
    const authorization = await this.authorize(input.actor, input.organizationId, permission);
    if (!authorization.ok) return authorization;

    const transactionResult = await input.transactionManager.execute(authorization.value, async (transaction) => {
      const permissionStillActive = await transaction.revalidatePermission(permission);
      const membershipAvailable = permissionStillActive
        && await transaction.resourceExists({ type: 'membership', id: input.userId });
      const roleAvailable = membershipAvailable
        && await transaction.resourceExists({ type: 'role', id: input.roleId });
      if (!permissionStillActive || !membershipAvailable || !roleAvailable) {
        await transaction.appendAudit({
          action: 'membership.role.change',
          targetType: 'membership',
          outcome: 'denied',
          changedFields: [],
        });
        return { authorized: false as const };
      }
      const changed = await transaction.changeMembershipRole({ userId: input.userId, roleId: input.roleId });
      if (!changed) return { authorized: false as const };
      await transaction.appendAudit({
        action: 'membership.role.change',
        targetType: 'membership',
        targetId: input.userId,
        outcome: 'succeeded',
        changedFields: ['roleId'],
        after: { roleId: input.roleId },
      });
      return { authorized: true as const, result: true };
    });

    return transactionResult.authorized
      ? { ok: true, value: transactionResult.result }
      : { ok: false, error: createNonDisclosingDenial(input.actor.requestId) };
  }

  async executeAuthorizedMutation<T>(input: {
    readonly actor: ActorContext;
    readonly organizationId: string;
    readonly permission: string;
    readonly resource?: TenantResourceReference;
    readonly transactionManager: TenantTransactionManager;
    readonly audit: NewAuditEvent;
    readonly mutate: (transaction: TenantTransaction) => Promise<T>;
  }): Promise<Result<T, PublicErrorEnvelope>> {
    const authorization = await this.authorize(input.actor, input.organizationId, input.permission, input.resource);
    if (!authorization.ok) return authorization;
    const transactionResult = await input.transactionManager.execute(authorization.value, async (transaction) => {
      const permissionStillActive = await transaction.revalidatePermission(input.permission);
      const resourceStillAvailable = input.resource === undefined || await transaction.resourceExists(input.resource);
      if (!permissionStillActive || !resourceStillAvailable) {
        await transaction.appendAudit({
          action: input.audit.action,
          targetType: input.audit.targetType,
          outcome: 'denied',
          changedFields: [],
        });
        return { authorized: false as const };
      }
      const result = await input.mutate(transaction);
      await transaction.appendAudit(input.audit);
      return { authorized: true as const, result };
    });
    return transactionResult.authorized
      ? { ok: true, value: transactionResult.result }
      : { ok: false, error: createNonDisclosingDenial(input.actor.requestId) };
  }
}
