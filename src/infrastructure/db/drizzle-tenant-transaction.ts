import { randomUUID } from 'node:crypto';

import { and, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { TenantResourceReference } from '@/domain/authorization/rbac';
import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { NewAuditEvent, TenantTransaction, TenantTransactionManager } from '@/ports/tenant-transaction';
import { redact } from '@/shared/security/redaction';
import { apiKeys, auditLogs, domains, memberships, organizations, permissions, publishingJobs, regions, rolePermissions, roles, sites, telegramIdentityMappings } from './schema';
import type * as schema from './schema';

type Database = PostgresJsDatabase<typeof schema>;

function sanitizedRecord(value: Readonly<Record<string, unknown>> | undefined): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  return redact(value) as Record<string, unknown>;
}

export class DrizzleTenantTransactionManager implements TenantTransactionManager {
  constructor(private readonly database: Database) {}

  async execute<T>(
    actor: AuthorizedTenantActorContext,
    operation: (transaction: TenantTransaction) => Promise<T>,
  ): Promise<T> {
    return this.database.transaction(async (databaseTransaction) => {
      await databaseTransaction.execute(sql`
        SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})
      `);
      if (actor.actorType === 'user') {
        await databaseTransaction.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
      }
      const transaction: TenantTransaction = Object.freeze({
        organizationId: actor.organizationId,
        actor,
        revalidatePermission: async (permission: string) => {
          const lockRoleGrant = async (roleId: string) => {
            const activeRole = await databaseTransaction.select({ id: roles.id }).from(roles).where(and(
              eq(roles.organizationId, actor.organizationId),
              eq(roles.id, roleId),
              eq(roles.active, true),
            )).limit(1).for('update');
            if (activeRole.length === 0) return false;
            const grants = await databaseTransaction.select({ permissionName: permissions.name })
              .from(rolePermissions)
              .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
              .where(and(
                eq(rolePermissions.organizationId, actor.organizationId),
                eq(rolePermissions.roleId, roleId),
                eq(permissions.name, permission),
              ))
              .for('update', { of: rolePermissions });
            return grants.length > 0;
          };

          if (actor.actorType === 'user') {
            const membership = await databaseTransaction.select({ roleId: memberships.roleId }).from(memberships).where(and(
              eq(memberships.organizationId, actor.organizationId),
              eq(memberships.userId, actor.actorId),
              eq(memberships.status, 'active'),
            )).limit(1).for('update');
            return membership[0] !== undefined && lockRoleGrant(membership[0].roleId);
          }
          if (actor.actorType === 'api_key') {
            const keys = await databaseTransaction.select({ scopes: apiKeys.scopes }).from(apiKeys).where(and(
              eq(apiKeys.organizationId, actor.organizationId),
              eq(apiKeys.id, actor.actorId),
              eq(apiKeys.status, 'active'),
              or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
            )).limit(1).for('update');
            return keys[0]?.scopes.includes(permission) ?? false;
          }
          if (actor.actorType === 'telegram') {
            const mappings = await databaseTransaction.select({
              userId: telegramIdentityMappings.userId,
              roleId: telegramIdentityMappings.roleId,
            }).from(telegramIdentityMappings).where(and(
              eq(telegramIdentityMappings.organizationId, actor.organizationId),
              eq(telegramIdentityMappings.id, actor.actorId),
              eq(telegramIdentityMappings.status, 'active'),
            )).limit(1).for('update');
            const mapping = mappings[0];
            if (mapping === undefined) return false;
            const membership = await databaseTransaction.select({ roleId: memberships.roleId }).from(memberships).where(and(
              eq(memberships.organizationId, actor.organizationId),
              eq(memberships.userId, mapping.userId),
              eq(memberships.roleId, mapping.roleId),
              eq(memberships.status, 'active'),
            )).limit(1).for('update');
            return membership.length === 1 && lockRoleGrant(mapping.roleId);
          }
          const jobs = await databaseTransaction.select({ id: publishingJobs.id }).from(publishingJobs).where(and(
            eq(publishingJobs.organizationId, actor.organizationId),
            eq(publishingJobs.id, actor.actorId),
            eq(publishingJobs.dispatchStatus, 'leased'),
            isNotNull(publishingJobs.leaseOwner),
            gt(publishingJobs.leaseExpiresAt, new Date()),
          )).limit(1).for('update');
          return permission === 'publishing.process' && jobs.length === 1;
        },
        resourceExists: async (resource: TenantResourceReference) => {
          if (resource.type === 'organization') return (await databaseTransaction.select({ id: organizations.id }).from(organizations).where(and(eq(organizations.id, actor.organizationId), eq(organizations.id, resource.id))).limit(1)).length === 1;
          if (resource.type === 'domain') return (await databaseTransaction.select({ id: domains.id }).from(domains).where(and(eq(domains.organizationId, actor.organizationId), eq(domains.id, resource.id))).limit(1)).length === 1;
          if (resource.type === 'region') return (await databaseTransaction.select({ id: regions.id }).from(regions).where(and(eq(regions.organizationId, actor.organizationId), eq(regions.id, resource.id))).limit(1)).length === 1;
          if (resource.type === 'site') return (await databaseTransaction.select({ id: sites.id }).from(sites).where(and(eq(sites.organizationId, actor.organizationId), eq(sites.id, resource.id))).limit(1)).length === 1;
          if (resource.type === 'role') {
            const rows = await databaseTransaction.select({ id: roles.id }).from(roles).where(and(
              eq(roles.organizationId, actor.organizationId),
              eq(roles.id, resource.id),
              eq(roles.active, true),
            )).limit(1).for('update');
            return rows.length === 1;
          }
          if (resource.type === 'membership') {
            const rows = await databaseTransaction.select({ userId: memberships.userId }).from(memberships).where(and(
              eq(memberships.organizationId, actor.organizationId),
              eq(memberships.userId, resource.id),
              eq(memberships.status, 'active'),
            )).limit(1).for('update');
            return rows.length === 1;
          }
          return false;
        },
        changeMembershipRole: async ({ userId, roleId }: { readonly userId: string; readonly roleId: string }) => {
          await databaseTransaction.update(telegramIdentityMappings).set({
            status: 'inactive',
            updatedAt: new Date(),
          }).where(and(
            eq(telegramIdentityMappings.organizationId, actor.organizationId),
            eq(telegramIdentityMappings.userId, userId),
            eq(telegramIdentityMappings.status, 'active'),
          ));
          const changed = await databaseTransaction.update(memberships).set({ roleId, version: sql`${memberships.version} + 1`, updatedAt: new Date() }).where(and(
            eq(memberships.organizationId, actor.organizationId),
            eq(memberships.userId, userId),
          )).returning({ userId: memberships.userId });
          return changed.length === 1;
        },
        appendAudit: async (event: NewAuditEvent) => {
          const before = sanitizedRecord(event.before);
          const after = sanitizedRecord(event.after);
          await databaseTransaction.insert(auditLogs).values({
            organizationId: actor.organizationId,
            id: randomUUID(),
            actorType: actor.actorType,
            actorId: actor.actorId,
            entryPoint: actor.entryPoint,
            action: event.action,
            targetType: event.targetType,
            outcome: event.outcome,
            changedFields: [...(event.changedFields ?? [])],
            requestId: actor.requestId,
            ...(event.targetId === undefined ? {} : { targetId: event.targetId }),
            ...(before === undefined ? {} : { before }),
            ...(after === undefined ? {} : { after }),
          });
        },
      });
      return operation(transaction);
    });
  }
}
