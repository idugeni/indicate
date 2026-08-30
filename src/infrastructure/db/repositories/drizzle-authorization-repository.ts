import { and, eq, gt, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizationRepository } from '@/ports/authorization-repository';
import {
  apiKeys,
  domains,
  memberships,
  organizations,
  permissions,
  publishingJobs,
  regions,
  rolePermissions,
  roles,
  sites,
  telegramIdentityMappings,
  users,
} from '../schema';
import type * as schema from '../schema';

type Database = PostgresJsDatabase<typeof schema>;

export class DrizzleAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly database: Database) {}

  async listActiveOrganizationsForUser(verifiedAuthUserId: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${verifiedAuthUserId}, true)`);
      const localUser = await transaction.query.users.findFirst({
        columns: { id: true },
        where: and(eq(users.authUserId, verifiedAuthUserId), eq(users.status, 'active')),
      });
      if (localUser === undefined) return [];
      await transaction.execute(sql`SELECT set_config('app.actor_id', ${localUser.id}, true)`);
      await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${verifiedAuthUserId}::uuid)`);
      const rows = await transaction.execute<{ id: string; name: string }>(sql`
        SELECT id, name FROM indicate_private.list_active_organizations_for_verified_user()
      `);
      return rows.map(({ id, name }) => ({ id, name }));
    });
  }

  async findLocalUserByAuthIdentity(authUserId: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${authUserId}, true)`);
      const user = await transaction.query.users.findFirst({ where: eq(users.authUserId, authUserId) });
      return user === undefined ? null : {
        id: user.id,
        authUserId: user.authUserId,
        displayName: user.displayName,
        status: user.status,
      };
    });
  }

  async linkLocalUser(input: { readonly id: string; readonly authUserId: string; readonly displayName: string }) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${input.authUserId}, true)`);
      await transaction.insert(users).values({ ...input, status: 'active' }).onConflictDoNothing({ target: users.authUserId });
      const user = await transaction.query.users.findFirst({ where: eq(users.authUserId, input.authUserId) });
      if (user === undefined) throw new Error('Local identity linkage failed');
      return {
        id: user.id,
        authUserId: user.authUserId,
        displayName: user.displayName,
        status: user.status,
      };
    });
  }

  async findActiveMembership(organizationId: string, userId: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${userId}, ${'membership-authorization'})`);
      const rows = await transaction
        .select({
          organizationId: memberships.organizationId,
          userId: memberships.userId,
          roleId: memberships.roleId,
          membershipStatus: memberships.status,
          roleActive: roles.active,
          permissionName: permissions.name,
        })
        .from(memberships)
        .innerJoin(roles, and(
          eq(roles.organizationId, memberships.organizationId),
          eq(roles.id, memberships.roleId),
        ))
        .leftJoin(rolePermissions, and(
          eq(rolePermissions.organizationId, roles.organizationId),
          eq(rolePermissions.roleId, roles.id),
        ))
        .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.userId, userId),
          eq(memberships.status, 'active'),
        ));
      const first = rows[0];
      if (first === undefined) return null;
      return {
        organizationId: first.organizationId,
        userId: first.userId,
        roleId: first.roleId,
        status: first.membershipStatus,
        roleActive: first.roleActive,
        permissions: new Set(rows.flatMap((row) => row.permissionName === null ? [] : [row.permissionName])),
      };
    });
  }

  async findActiveActorAuthorization(
    organizationId: string,
    actorType: 'api_key' | 'telegram' | 'system',
    actorId: string,
  ) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${actorId}, ${'actor-authorization'})`);
      if (actorType === 'api_key') {
        const key = await transaction.query.apiKeys.findFirst({
          where: and(
            eq(apiKeys.organizationId, organizationId),
            eq(apiKeys.id, actorId),
            eq(apiKeys.status, 'active'),
            or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
          ),
        });
        return key === undefined ? null : {
          organizationId,
          actorId,
          permissions: new Set(key.scopes),
        };
      }
      if (actorType === 'telegram') {
        const rows = await transaction.select({ permissionName: permissions.name })
          .from(telegramIdentityMappings)
          .innerJoin(memberships, and(
            eq(memberships.organizationId, telegramIdentityMappings.organizationId),
            eq(memberships.userId, telegramIdentityMappings.userId),
            eq(memberships.roleId, telegramIdentityMappings.roleId),
          ))
          .innerJoin(roles, and(
            eq(roles.organizationId, memberships.organizationId),
            eq(roles.id, memberships.roleId),
          ))
          .innerJoin(rolePermissions, and(
            eq(rolePermissions.organizationId, roles.organizationId),
            eq(rolePermissions.roleId, roles.id),
          ))
          .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
          .where(and(
            eq(telegramIdentityMappings.organizationId, organizationId),
            eq(telegramIdentityMappings.id, actorId),
            eq(telegramIdentityMappings.status, 'active'),
            eq(memberships.status, 'active'),
            eq(roles.active, true),
          ));
        return rows.length === 0 ? null : {
          organizationId,
          actorId,
          permissions: new Set(rows.map(({ permissionName }) => permissionName)),
        };
      }
      const claimed = await transaction.select({ id: publishingJobs.id }).from(publishingJobs).where(and(
        eq(publishingJobs.organizationId, organizationId),
        eq(publishingJobs.id, actorId),
        eq(publishingJobs.dispatchStatus, 'leased'),
        isNotNull(publishingJobs.leaseOwner),
        gt(publishingJobs.leaseExpiresAt, new Date()),
      )).limit(1);
      return claimed.length === 0 ? null : {
        organizationId,
        actorId,
        permissions: new Set(['publishing.process']),
      };
    });
  }

  async resourceExists(organizationId: string, resource: { readonly type: string; readonly id: string }) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${'resource-authorization'}, ${'resource-authorization'})`);
      if (resource.type === 'organization') {
        return (await transaction.select({ id: organizations.id }).from(organizations).where(and(
          eq(organizations.id, organizationId), eq(organizations.id, resource.id),
        )).limit(1)).length === 1;
      }
      if (resource.type === 'domain') {
        return (await transaction.select({ id: domains.id }).from(domains).where(and(
          eq(domains.organizationId, organizationId), eq(domains.id, resource.id),
        )).limit(1)).length === 1;
      }
      if (resource.type === 'region') {
        return (await transaction.select({ id: regions.id }).from(regions).where(and(
          eq(regions.organizationId, organizationId), eq(regions.id, resource.id),
        )).limit(1)).length === 1;
      }
      if (resource.type === 'site') {
        return (await transaction.select({ id: sites.id }).from(sites).where(and(
          eq(sites.organizationId, organizationId), eq(sites.id, resource.id),
        )).limit(1)).length === 1;
      }
      if (resource.type === 'role') {
        return (await transaction.select({ id: roles.id }).from(roles).where(and(
          eq(roles.organizationId, organizationId), eq(roles.id, resource.id), eq(roles.active, true),
        )).limit(1)).length === 1;
      }
      if (resource.type === 'membership') {
        return (await transaction.select({ userId: memberships.userId }).from(memberships).where(and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.userId, resource.id),
          eq(memberships.status, 'active'),
        )).limit(1)).length === 1;
      }
      return false;
    });
  }
}
