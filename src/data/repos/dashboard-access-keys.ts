import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { redact } from '@/core/security/redaction';
import type {
  AccessKeyRepository,
  NewStoredAccessKey,
} from '@/modules/auth/dashboard-access-keys/access-key-service';
import {
  AccessKeyCompromisedError,
  AccessKeyConflictError,
} from '@/modules/auth/dashboard-access-keys/access-key-service';
import {
  publicAccessKeyRecord,
  type StoredAccessKey,
} from '@/modules/auth/dashboard-access-keys/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { auditLogs, dashboardAccessKeys, memberships, permissions, rolePermissions, roles } from '@/data/schema';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type RawTimestamp = Date | string;

type RawAccessKeyRow = {
  organization_id: string;
  id: string;
  user_id: string;
  lookup_id: string;
  name: string;
  salt: string;
  verification_hash: string;
  status: StoredAccessKey['status'];
  expires_at: RawTimestamp | null;
  last_used_at: RawTimestamp | null;
  version: number;
  created_at: RawTimestamp;
  updated_at: RawTimestamp;
};

const POSTGRES_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/;

/**
 * Normalize a Postgres timestamp into an ISO string for API projections.
 *
 * @param value - Raw timestamp from Drizzle or a raw SQL row.
 * @returns ISO-8601 string in UTC.
 */
function normalizeTimestamp(value: RawTimestamp): string {
  if (value instanceof Date) return value.toISOString();
  const match = POSTGRES_TIMESTAMP.exec(value);
  if (match === null) throw new TypeError('Invalid dashboard access-key timestamp.');
  return new Date(value).toISOString();
}

const optionalIso = (value: RawTimestamp | null) => (value === null ? null : normalizeTimestamp(value));

function uniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<object>();
  while (typeof current === 'object' && current !== null && !seen.has(current)) {
    seen.add(current);
    if ('code' in current && current.code === '23505') return true;
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

function mapRow(row: typeof dashboardAccessKeys.$inferSelect): StoredAccessKey {
  return {
    id: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    lookupId: row.lookupId,
    name: row.name,
    status: row.status,
    expiresAt: optionalIso(row.expiresAt),
    lastUsedAt: optionalIso(row.lastUsedAt),
    version: row.version,
    createdAt: normalizeTimestamp(row.createdAt),
    updatedAt: normalizeTimestamp(row.updatedAt),
    salt: row.salt,
    verificationHash: row.verificationHash,
  };
}

function mapRawRow(row: RawAccessKeyRow): StoredAccessKey {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    lookupId: row.lookup_id,
    name: row.name,
    status: row.status,
    expiresAt: optionalIso(row.expires_at),
    lastUsedAt: optionalIso(row.last_used_at),
    version: row.version,
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    salt: row.salt,
    verificationHash: row.verification_hash,
  };
}

export interface DashboardAccessKeyIdentity {
  readonly organizationId: string;
  readonly keyId: string;
  readonly userId: string;
  readonly authUserId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly userStatus: 'active' | 'inactive' | 'archived';
  readonly keyStatus: StoredAccessKey['status'];
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly salt: string;
  readonly verificationHash: string;
  readonly membershipStatus: 'active' | 'inactive' | 'archived' | null;
  readonly roleId: string | null;
  readonly roleTier: 'admin' | 'user' | 'superadmin' | null;
  readonly roleActive: boolean | null;
}

type RawIdentityRow = {
  organization_id: string;
  key_id: string;
  user_id: string;
  auth_user_id: string;
  display_name: string;
  avatar_url: string | null;
  user_status: DashboardAccessKeyIdentity['userStatus'];
  key_status: DashboardAccessKeyIdentity['keyStatus'];
  expires_at: RawTimestamp | null;
  last_used_at: RawTimestamp | null;
  salt: string;
  verification_hash: string;
  membership_status: DashboardAccessKeyIdentity['membershipStatus'];
  role_id: string | null;
  role_tier: DashboardAccessKeyIdentity['roleTier'];
  role_active: boolean | null;
};

/** Row ceiling for the dashboard access-key list; rotation-free, so history stays small. */
const ACCESS_KEY_LIST_MAX_ROWS = 100;

function mapIdentityRow(row: RawIdentityRow): DashboardAccessKeyIdentity {
  return {
    organizationId: row.organization_id,
    keyId: row.key_id,
    userId: row.user_id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    userStatus: row.user_status,
    keyStatus: row.key_status,
    expiresAt: optionalIso(row.expires_at),
    lastUsedAt: optionalIso(row.last_used_at),
    salt: row.salt,
    verificationHash: row.verification_hash,
    membershipStatus: row.membership_status,
    roleId: row.role_id,
    roleTier: row.role_tier,
    roleActive: row.role_active,
  };
}

export class DrizzleDashboardAccessKeyRepository implements AccessKeyRepository {
  constructor(private readonly database: Database) {}

  private async actorContext(tx: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    await tx.execute(sql`SELECT indicate_private.set_tenant_context(${actor.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
    if (actor.actorType === 'user' && actor.verifiedAuthUserId !== undefined) {
      await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
    }
    await tx.execute(sql`SELECT indicate_private.set_region_context(${actor.regionScopeId ?? null}::uuid)`);
  }

  private async authorize(tx: Transaction, actor: AuthorizedTenantActorContext, permission: string): Promise<void> {
    if (actor.actorType !== 'user') {
      if (!actor.permissionSet.has(permission)) throw new AccessKeyCompromisedError();
      return;
    }
    const rows = await tx
      .select({ id: memberships.userId })
      .from(memberships)
      .innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId)))
      .innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id)))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(memberships.organizationId, actor.organizationId),
          eq(memberships.userId, actor.actorId),
          eq(memberships.status, 'active'),
          eq(roles.active, true),
          eq(permissions.organizationId, actor.organizationId),
          eq(permissions.scope, 'organization'),
          eq(permissions.name, permission),
        ),
      )
      .limit(1);
    if (rows.length !== 1) throw new AccessKeyCompromisedError();
  }

  private async authorizeAny(tx: Transaction, actor: AuthorizedTenantActorContext, candidates: readonly string[]): Promise<void> {
    for (const permission of candidates) {
      if (!actor.permissionSet.has(permission)) continue;
      try {
        await this.authorize(tx, actor, permission);
        return;
      } catch (error) {
        if (!(error instanceof AccessKeyCompromisedError)) throw error;
      }
    }
    throw new AccessKeyCompromisedError();
  }

  private async audit(
    tx: Transaction,
    actor: AuthorizedTenantActorContext,
    organizationId: string,
    action: string,
    targetId: string | null,
    context: Readonly<Record<string, unknown>>,
    now: Date,
  ): Promise<void> {
    await tx.insert(auditLogs).values({
      organizationId,
      id: crypto.randomUUID(),
      actorType: actor.actorType,
      actorId: actor.actorId,
      entryPoint: actor.entryPoint,
      action,
      targetType: 'access_key',
      targetId,
      outcome: 'succeeded',
      changedFields: Object.keys(context).sort(),
      after: redact(context) as Record<string, unknown>,
      requestId: actor.requestId,
      occurredAt: now,
    });
  }

  async createAccessKey(actor: AuthorizedTenantActorContext, input: NewStoredAccessKey) {
    try {
      return await this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.apiKeyManage);
        const rows = await tx
          .insert(dashboardAccessKeys)
          .values({
            organizationId: input.organizationId,
            id: input.id,
            userId: input.userId,
            lookupId: input.lookupId,
            name: input.name,
            salt: input.salt,
            verificationHash: input.verificationHash,
            status: 'active',
            expiresAt: input.expiresAt === null ? null : new Date(input.expiresAt),
            version: 1,
            createdAt: new Date(input.now),
            updatedAt: new Date(input.now),
          })
          .returning();
        await this.audit(tx, actor, actor.organizationId, 'access_key.issue', input.id, { name: input.name }, new Date(input.now));
        return publicAccessKeyRecord(mapRow(rows[0]!));
      });
    } catch (error) {
      if (uniqueViolation(error)) throw new AccessKeyConflictError();
      throw error;
    }
  }

  async revokeAccessKey(actor: AuthorizedTenantActorContext, id: string, expectedVersion: number, now: string) {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.apiKeyManage);
      const rows = await tx
        .select()
        .from(dashboardAccessKeys)
        .where(and(eq(dashboardAccessKeys.organizationId, actor.organizationId), eq(dashboardAccessKeys.id, id)))
        .limit(1)
        .for('update');
      const prior = rows[0];
      if (prior === undefined) throw new AccessKeyCompromisedError();
      if (prior.version !== expectedVersion) throw new AccessKeyConflictError();
      if (prior.status !== 'active') return publicAccessKeyRecord(mapRow(prior));
      const changed = await tx
        .update(dashboardAccessKeys)
        .set({ status: 'revoked', version: prior.version + 1, updatedAt: new Date(now) })
        .where(
          and(
            eq(dashboardAccessKeys.organizationId, actor.organizationId),
            eq(dashboardAccessKeys.id, id),
            eq(dashboardAccessKeys.version, expectedVersion),
          ),
        )
        .returning();
      if (changed.length !== 1) throw new AccessKeyConflictError();
      await this.audit(tx, actor, actor.organizationId, 'access_key.revoke', id, { status: 'revoked' }, new Date(now));
      return publicAccessKeyRecord(mapRow(changed[0]!));
    });
  }

  async listAccessKeys(actor: AuthorizedTenantActorContext) {
    return this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      await this.authorizeAny(tx, actor, [INTEGRATIONS_PERMISSIONS.apiKeyRead, INTEGRATIONS_PERMISSIONS.apiKeyManage]);
      const rows = await tx
        .select({
          id: dashboardAccessKeys.id,
          organizationId: dashboardAccessKeys.organizationId,
          userId: dashboardAccessKeys.userId,
          lookupId: dashboardAccessKeys.lookupId,
          name: dashboardAccessKeys.name,
          status: dashboardAccessKeys.status,
          expiresAt: dashboardAccessKeys.expiresAt,
          lastUsedAt: dashboardAccessKeys.lastUsedAt,
          version: dashboardAccessKeys.version,
          createdAt: dashboardAccessKeys.createdAt,
          updatedAt: dashboardAccessKeys.updatedAt,
        })
        .from(dashboardAccessKeys)
        .where(eq(dashboardAccessKeys.organizationId, actor.organizationId))
        .orderBy(desc(dashboardAccessKeys.createdAt))
        .limit(ACCESS_KEY_LIST_MAX_ROWS);
      return rows.map((row) =>
        publicAccessKeyRecord({
          ...row,
          salt: '',
          verificationHash: '',
          expiresAt: optionalIso(row.expiresAt),
          lastUsedAt: optionalIso(row.lastUsedAt),
          createdAt: normalizeTimestamp(row.createdAt),
          updatedAt: normalizeTimestamp(row.updatedAt),
        }),
      );
    });
  }

  async findAccessKeyByLookupId(lookupId: string): Promise<StoredAccessKey | null> {
    const rows = await this.database.execute<RawAccessKeyRow>(
      sql`SELECT * FROM indicate_private.resolve_dashboard_access_key_lookup(${lookupId})`,
    );
    return rows[0] === undefined ? null : mapRawRow(rows[0]);
  }

  /**
   * Resolve one access-key identity row without a Supabase session.
   *
   * @param lookupId - Lookup half of the presented credential.
   * @returns Key, owner, and membership liveness in one SECURITY DEFINER roundtrip.
   */
  async findIdentityByLookupId(lookupId: string): Promise<DashboardAccessKeyIdentity | null> {
    const rows = await this.database.execute<RawIdentityRow>(
      sql`SELECT * FROM indicate_private.resolve_dashboard_access_key_identity(${lookupId})`,
    );
    return rows[0] === undefined ? null : mapIdentityRow(rows[0]);
  }

  async recordAccessKeyUse(organizationId: string, id: string, now: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${id}, ${'access-key-authentication'})`);
      await tx
        .update(dashboardAccessKeys)
        .set({ lastUsedAt: new Date(now), updatedAt: new Date(now) })
        .where(
          and(
            eq(dashboardAccessKeys.organizationId, organizationId),
            eq(dashboardAccessKeys.id, id),
            eq(dashboardAccessKeys.status, 'active'),
            or(isNull(dashboardAccessKeys.expiresAt), gt(dashboardAccessKeys.expiresAt, new Date(now))),
          ),
        );
    });
  }

  async recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      await this.actorContext(tx, actor);
      await tx.insert(auditLogs).values({
        organizationId: actor.organizationId,
        id: crypto.randomUUID(),
        actorType: actor.actorType,
        actorId: actor.actorId,
        entryPoint: actor.entryPoint,
        action,
        targetType,
        targetId: null,
        outcome: 'denied',
        changedFields: [],
        requestId: actor.requestId,
        occurredAt: new Date(now),
      });
    });
  }
}
