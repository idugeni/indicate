import { and, eq, gt, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizationRepository } from '@/modules/auth/ports';
import type { MembershipAuthorization } from '@/modules/auth/rbac';
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
  users,
} from '@/data/schema';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;

export class DrizzleAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly database: Database) {}

  async listActiveOrganizationsForUser(verifiedAuthUserId: string, targetOrganizationId?: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${verifiedAuthUserId}, true)`);
      const localUser = await transaction.query.users.findFirst({
        columns: { id: true },
        where: and(or(eq(users.authUserId, verifiedAuthUserId), eq(users.neonAuthUserId, verifiedAuthUserId)), eq(users.status, 'active')),
      });
      if (localUser === undefined) return [];
      await transaction.execute(sql`SELECT set_config('app.actor_id', ${localUser.id}, true)`);
      await transaction.execute(sql`SELECT indicate_private.set_verified_user_context(${verifiedAuthUserId}::uuid)`);
      const platformRows = await transaction.execute<{ name: string }>(sql`
        SELECT name FROM indicate_private.permission_list_platform(${localUser.id}::uuid)
      `);
      const platformPermissions = new Set(platformRows.map(({ name }) => name));
      if (platformPermissions.has('platform.super_admin')) {
        const allOrganizations: { id: string; name: string }[] = [];
        let cursorCreatedAt: string | null = null;
        let cursorId: string | null = null;
        while (true) {
          const allRows: { id: string; name: string; status: string; created_at_cursor: string }[] = await transaction.execute<{ id: string; name: string; status: string; created_at_cursor: string }>(sql`
            SELECT id, name, status, created_at::text AS created_at_cursor
            FROM indicate_private.customer_list(
              ${localUser.id}::uuid, 1000,
              ${cursorCreatedAt}::timestamptz,
              ${cursorId}::uuid
            )
          `);
          const activeRows = allRows.filter(({ status }) => status === 'active').map(({ id, name }) => ({ id, name }));
          if (targetOrganizationId !== undefined) {
            const target = activeRows.find(({ id }) => id === targetOrganizationId);
            if (target !== undefined) return [target];
          } else {
            allOrganizations.push(...activeRows);
          }
          if (allRows.length < 1000) break;
          const last: { id: string; created_at_cursor: string } | undefined = allRows[allRows.length - 1];
          if (last === undefined) break;
          cursorCreatedAt = last.created_at_cursor;
          cursorId = last.id;
        }
        return allOrganizations;
      }
      const rows = await transaction.execute<{ id: string; name: string }>(sql`
        SELECT id, name FROM indicate_private.list_active_organizations_for_verified_user()
      `);
      const accessible = rows.map(({ id, name }) => ({ id, name }));
      return targetOrganizationId === undefined ? accessible : accessible.filter(({ id }) => id === targetOrganizationId);
    });
  }

  async findLocalUserByAuthIdentity(authUserId: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${authUserId}, true)`);
      const user = await transaction.query.users.findFirst({ where: or(eq(users.authUserId, authUserId), eq(users.neonAuthUserId, authUserId)) });
      return user === undefined ? null : {
        id: user.id,
        authUserId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
      };
    });
  }

  async linkLocalUser(input: { readonly id: string; readonly authUserId: string; readonly displayName: string; readonly avatarUrl: string | null; readonly email: string | null; readonly emailVerified: true }) {
    if (input.email !== null && input.emailVerified !== true) {
      throw new Error('Verified email is required to link an existing local account');
    }

    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${input.authUserId}, true)`);

      // Existing local users keep their stable local id and memberships. A new
      // Neon identity may bind by email only after Neon Auth confirms the email.
      const matches = input.email === null ? [] : await transaction.execute<{
        id: string;
        auth_user_id: string;
        neon_auth_user_id: string | null;
        display_name: string;
        avatar_url: string | null;
        status: string;
      }>(sql`
        SELECT id::text, auth_user_id::text, neon_auth_user_id::text,
               display_name, avatar_url, status::text
        FROM public.users
        WHERE lower(btrim(email)) = lower(btrim(${input.email}))
        ORDER BY id
        LIMIT 2
        FOR UPDATE
      `);

      if (matches.length > 1) {
        throw new Error('Verified email maps to multiple local accounts; manual reconciliation is required');
      }

      const existing = matches[0];
      if (existing !== undefined) {
        if (existing.status !== 'active') {
          throw new Error('The matching local account is not active');
        }
        if (existing.neon_auth_user_id !== null && existing.neon_auth_user_id !== input.authUserId) {
          throw new Error('The local account is already linked to a different Neon identity');
        }

        if (existing.auth_user_id === input.authUserId || existing.neon_auth_user_id === input.authUserId) {
          await transaction.execute(sql`
            UPDATE public.users
            SET display_name = ${input.displayName},
                avatar_url = ${input.avatarUrl},
                updated_at = now()
            WHERE id = ${existing.id}::uuid
          `);
        } else {
          await transaction.execute(sql`SELECT set_config('app.neon_auth_identity_link', 'on', true)`);
          const linked = await transaction.execute<{
            id: string;
            display_name: string;
            avatar_url: string | null;
            status: string;
          }>(sql`
            UPDATE public.users
            SET neon_auth_user_id = ${input.authUserId}::uuid,
                display_name = ${input.displayName},
                avatar_url = ${input.avatarUrl},
                updated_at = now()
            WHERE id = ${existing.id}::uuid
              AND auth_user_id = ${existing.auth_user_id}::uuid
              AND neon_auth_user_id IS NULL
              AND status = 'active'
            RETURNING id::text, display_name, avatar_url, status::text
          `);
          if (linked.length !== 1) {
            throw new Error('Local account identity changed during Neon linkage');
          }

          await transaction.execute(sql`
            INSERT INTO public.identity_link_audit_logs (
              id, local_user_id, legacy_auth_user_id, neon_auth_user_id, request_id, linked_at
            ) VALUES (
              gen_random_uuid(), ${existing.id}::uuid, ${existing.auth_user_id}::uuid,
              ${input.authUserId}::uuid, ${crypto.randomUUID()}, now()
            )
          `);

          const activeMemberships = await transaction.execute<{ organization_id: string }>(sql`
            SELECT organization_id::text
            FROM public.memberships
            WHERE user_id = ${existing.id}::uuid AND status = 'active'
            ORDER BY organization_id
          `);
          for (const membership of activeMemberships) {
            await transaction.execute(sql`
              INSERT INTO public.audit_logs (
                organization_id, id, actor_type, actor_id, entry_point, action,
                target_type, target_id, outcome, changed_fields, "before", "after",
                request_id, occurred_at
              ) VALUES (
                ${membership.organization_id}::uuid, gen_random_uuid(), 'user',
                ${existing.id}, 'api', 'auth_identity_linked', 'user',
                ${existing.id}, 'succeeded', ARRAY['neon_auth_user_id']::text[],
                ${JSON.stringify({ authUserId: existing.auth_user_id })}::jsonb,
                ${JSON.stringify({ authUserId: input.authUserId })}::jsonb,
                ${crypto.randomUUID()}, now()
              )
            `);
          }
        }

        return {
          id: existing.id,
          authUserId: input.authUserId,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          status: existing.status as 'active' | 'inactive' | 'archived',
        };
      }

      // A genuinely new identity gets a new local user. It does not inherit
      // any existing tenant membership merely by signing up.
      await transaction.insert(users).values({
        id: input.id,
        authUserId: input.authUserId,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        email: input.email,
        status: 'active',
      }).onConflictDoUpdate({
        target: users.authUserId,
        set: {
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          ...(input.email === null ? {} : { email: input.email }),
          updatedAt: new Date(),
        },
      });
      const user = await transaction.query.users.findFirst({
        where: or(eq(users.authUserId, input.authUserId), eq(users.neonAuthUserId, input.authUserId)),
      });
      if (user === undefined) throw new Error('Local identity linkage failed');
      return {
        id: user.id,
        authUserId: input.authUserId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
      };
    });
  }

  async getOwnProfile(authUserId: string) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${authUserId}, true)`);
      const user = await transaction.query.users.findFirst({ where: and(or(eq(users.authUserId, authUserId), eq(users.neonAuthUserId, authUserId)), eq(users.status, 'active')) });
      if (user === undefined) return null;
      return {
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        locale: user.locale,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
      };
    });
  }

  async updateOwnProfile(authUserId: string, patch: {
    readonly displayName?: string;
    readonly bio?: string | null;
    readonly locale?: string | null;
    readonly timezone?: string | null;
    readonly avatarUrl?: string | null;
  }) {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('app.auth_user_id', ${authUserId}, true)`);
      const current = await transaction.query.users.findFirst({ where: and(or(eq(users.authUserId, authUserId), eq(users.neonAuthUserId, authUserId)), eq(users.status, 'active')) });
      if (current === undefined) return null;
      const set: Partial<{ displayName: string; bio: string | null; locale: string | null; timezone: string | null; avatarUrl: string | null; updatedAt: Date }> = { updatedAt: new Date() };
      if (patch.displayName !== undefined) set.displayName = patch.displayName;
      if (patch.bio !== undefined) set.bio = patch.bio;
      if (patch.locale !== undefined) set.locale = patch.locale;
      if (patch.timezone !== undefined) set.timezone = patch.timezone;
      if (patch.avatarUrl !== undefined) set.avatarUrl = patch.avatarUrl;
      await transaction.update(users).set(set).where(or(eq(users.authUserId, authUserId), eq(users.neonAuthUserId, authUserId)));
      const user = await transaction.query.users.findFirst({ where: or(eq(users.authUserId, authUserId), eq(users.neonAuthUserId, authUserId)) });
      if (user === undefined) throw new Error('Local identity update failed');
      return {
        id: user.id,
        authUserId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
      };
    });
  }


  /**
   * List the platform-scoped grants of one user.
   *
   * @param userId - Local user id whose platform grants are requested.
   * @param organizationId - Tenant to scope the transaction to. Platform-scope
   *   callers often have none, so only the actor/request GUCs the RLS guard
   *   checks are set in that case.
   * @returns Platform permission names; an empty list when the user holds none.
   */
  async listPlatformPermissions(userId: string, organizationId?: string) {
    return this.database.transaction(async (transaction) => {
      if (organizationId === undefined) {
        await transaction.execute(sql`SELECT set_config('app.actor_id', ${userId}, true), set_config('app.request_id', ${'platform-authorization'}, true)`);
      } else {
        await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${userId}, ${'platform-authorization'})`);
      }
      const rows = await transaction.execute<{ name: string }>(sql`SELECT name FROM indicate_private.permission_list_platform(${userId}::uuid)`);
      return rows.map(({ name }) => name);
    });
  }

  async findActiveMembership(organizationId: string, userId: string) {
    const batch = await this.findActiveMemberships(userId, [organizationId]);
    return batch.get(organizationId) ?? null;
  }

  /**
   * Resolve active memberships for one user across organizations in one roundtrip.
   *
   * @param userId - Local user id owning the memberships.
   * @param organizationIds - Organization ids to resolve; duplicates are ignored.
   * @returns Map of organization id to authorization for every active membership found.
   */
  async findActiveMemberships(userId: string, organizationIds: readonly string[]) {
    const targets = [...new Set(organizationIds)];
    if (targets.length === 0) return new Map();
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${targets[0]}::uuid, ${userId}, ${'membership-authorization'})`);
      const rows = await transaction
        .select({
          organizationId: memberships.organizationId,
          userId: memberships.userId,
          roleId: memberships.roleId,
          membershipStatus: memberships.status,
          regionId: memberships.regionId,
          roleActive: roles.active,
          roleTier: roles.tier,
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
        .leftJoin(permissions, and(
          eq(permissions.id, rolePermissions.permissionId),
          eq(permissions.organizationId, memberships.organizationId),
          eq(permissions.scope, 'organization'),
        ))
        .where(and(
          inArray(memberships.organizationId, targets),
          eq(memberships.userId, userId),
          eq(memberships.status, 'active'),
        ));
      if (rows.length === 0) return new Map();
      const platformRows = await transaction.execute<{ name: string }>(sql`SELECT name FROM indicate_private.permission_list_platform(${userId}::uuid)`);
      const platformPermissions = new Set(platformRows.map(({ name }) => name));
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) {
        const group = grouped.get(row.organizationId) ?? [];
        group.push(row);
        grouped.set(row.organizationId, group);
      }
      const output = new Map<string, MembershipAuthorization>();
      for (const [organizationId, group] of grouped) {
        const first = group[0]!;
        output.set(organizationId, {
          organizationId: first.organizationId,
          userId: first.userId,
          roleId: first.roleId,
          status: first.membershipStatus,
          roleActive: first.roleActive,
          roleTier: first.roleTier,
          regionId: first.regionId,
          orgPermissions: new Set(group.flatMap((row) => row.permissionName === null ? [] : [row.permissionName])),
          platformPermissions,
        });
      }
      return output;
    });
  }

  async findActiveActorAuthorization(
    organizationId: string,
    actorType: 'api_key' | 'system',
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
          regionId: key.regionId,
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
        regionId: null,
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
