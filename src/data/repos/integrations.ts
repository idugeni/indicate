import { createHash } from 'node:crypto';

import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { publicApiKeyRecord, type CustomerProjection, type StoredApiKey, type SubscriptionPlan, type SubscriptionRecord, type TelegramConversation, type TelegramIdentity, type TelegramMappingRecord, type WebhookReplayClaim } from '@/modules/integrations/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { SOLO_ADMIN_PERMISSION_NAMES } from '@/modules/dashboard/permissions';
import { IntegrationsAccessDeniedError, IntegrationsConflictError, IntegrationsQuotaExceededError, IntegrationsSubscriptionInactiveError, type NewStoredApiKey, type ReplayClaimInput, type ReplayClaimResult, type IntegrationsRepository, type TelegramOutboxRecord } from '@/modules/integrations/ports';
import { quotaExceeded } from '@/modules/billing/quota';
import { readPlanQuota } from '@/data/repos/shared/plan-quota';
import { redact } from '@/core/security/redaction';
import { apiKeys, auditLogs, memberships, permissions, rolePermissions, roles, subscriptions, telegramConversations, telegramIdentityMappings } from '@/data/schema';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type RawTimestamp = Date | string;
const POSTGRES_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/;

export function normalizeIntegrationsTimestamp(value: RawTimestamp): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError('Invalid Integrations database timestamp.');
    return value.toISOString();
  }
  if (typeof value !== 'string') throw new TypeError('Invalid Integrations database timestamp.');
  const match = POSTGRES_TIMESTAMP.exec(value);
  if (match === null) throw new TypeError('Invalid Integrations database timestamp.');
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const hour = Number(match[4]); const minute = Number(match[5]); const second = Number(match[6]);
  const fraction = match[7] ?? ''; const offsetHour = Number(match[10] ?? 0); const offsetMinute = Number(match[11] ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1]! || hour > 23 || minute > 59 || second > 59 || offsetHour > 15 || offsetMinute > 59) throw new TypeError('Invalid Integrations database timestamp.');
  const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3));
  const utc = new Date(0); utc.setUTCFullYear(year, month - 1, day); utc.setUTCHours(hour, minute, second, milliseconds);
  const direction = match[9] === '-' ? -1 : match[9] === '+' ? 1 : 0;
  return new Date(utc.getTime() - direction * (offsetHour * 60 + offsetMinute) * 60_000).toISOString();
}
const optionalIso = (value: RawTimestamp | null) => value === null ? null : normalizeIntegrationsTimestamp(value);
function uniqueViolation(error: unknown): boolean { let current: unknown = error; const seen = new Set<object>(); while (typeof current === 'object' && current !== null && !seen.has(current)) { seen.add(current); if ('code' in current && current.code === '23505') return true; current = 'cause' in current ? current.cause : undefined; } return false; }
/** Pseudonim satu arah untuk pengenal Telegram pada konteks audit (UU PDP): nilai mentah tidak pernah masuk audit_logs. */
function pseudonymizeTelegramId(value: string): string {
  return `sha256:${createHash('sha256').update(value, 'utf8').digest('hex')}`;
}
function deniedViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === '42501'; }

function mapKey(row: typeof apiKeys.$inferSelect): StoredApiKey {
  return { id: row.id, organizationId: row.organizationId, lookupId: row.lookupId, name: row.name, salt: row.salt, verificationHash: row.verificationHash, scopes: row.scopes, status: row.status, predecessorId: row.predecessorId, expiresAt: optionalIso(row.expiresAt), lastUsedAt: optionalIso(row.lastUsedAt), version: row.version, createdAt: normalizeIntegrationsTimestamp(row.createdAt), updatedAt: normalizeIntegrationsTimestamp(row.updatedAt) };
}
type RawApiKeyRow = {
  organization_id: string; id: string; lookup_id: string; name: string; salt: string;
  verification_hash: string; scopes: string[]; status: StoredApiKey['status']; predecessor_id: string | null;
  expires_at: RawTimestamp | null; last_used_at: RawTimestamp | null; version: number; created_at: RawTimestamp; updated_at: RawTimestamp;
};
function mapRawKey(row: RawApiKeyRow): StoredApiKey {
  return { id: row.id, organizationId: row.organization_id, lookupId: row.lookup_id, name: row.name, salt: row.salt, verificationHash: row.verification_hash, scopes: row.scopes, status: row.status, predecessorId: row.predecessor_id, expiresAt: optionalIso(row.expires_at), lastUsedAt: optionalIso(row.last_used_at), version: row.version, createdAt: normalizeIntegrationsTimestamp(row.created_at), updatedAt: normalizeIntegrationsTimestamp(row.updated_at) };
}
function mapTelegramMapping(row: typeof telegramIdentityMappings.$inferSelect): TelegramMappingRecord {
  return { id: row.id, organizationId: row.organizationId, userId: row.userId, roleId: row.roleId, telegramUserId: row.telegramUserId, telegramChatId: row.telegramChatId, status: row.status, version: row.version, consentedAt: row.consentedAt === null ? null : normalizeIntegrationsTimestamp(row.consentedAt), consentTextVersion: row.consentTextVersion, ipHash: row.ipHash, createdAt: normalizeIntegrationsTimestamp(row.createdAt), updatedAt: normalizeIntegrationsTimestamp(row.updatedAt) };
}
type RawClaimRow = {
  source: string; replay_id: string; organization_id: string | null; body_digest: string;
  identity_binding_digest: string | null; claim_token: string; business_receipt: Record<string, unknown> | null; status: WebhookReplayClaim['status']; pending_status: 'processed' | 'rejected' | null;
  outcome: Record<string, unknown> | null; received_at: RawTimestamp; lease_expires_at: RawTimestamp; attempt_count: number; expires_at: RawTimestamp;
};
function mapRawClaim(row: RawClaimRow): WebhookReplayClaim {
  return {
    source: row.source, replayId: row.replay_id, organizationId: row.organization_id, bodyDigest: row.body_digest,
    identityBindingDigest: row.identity_binding_digest, claimToken: row.claim_token, businessReceipt: row.business_receipt,
    status: row.status, pendingStatus: row.pending_status, outcome: row.outcome,
    receivedAt: normalizeIntegrationsTimestamp(row.received_at), leaseExpiresAt: normalizeIntegrationsTimestamp(row.lease_expires_at), attemptCount: row.attempt_count, expiresAt: normalizeIntegrationsTimestamp(row.expires_at),
  };
}
  type CustomerRow = { id: string; name: string; slug: string; status: 'active' | 'inactive' | 'archived'; customer_metadata: Record<string, unknown>; version: number; created_at: RawTimestamp; updated_at: RawTimestamp; subscription_plan: SubscriptionPlan | null; subscription_status: SubscriptionRecord['status'] | null; period_starts_at: RawTimestamp | null; period_ends_at: RawTimestamp | null; subscription_version: number | null; subscription_created_at: RawTimestamp | null; subscription_updated_at: RawTimestamp | null };
function mapCustomer(row: CustomerRow): CustomerProjection {
  return { customer: { id: row.id, name: row.name, slug: row.slug, status: row.status, customerMetadata: row.customer_metadata, version: row.version, createdAt: normalizeIntegrationsTimestamp(row.created_at), updatedAt: normalizeIntegrationsTimestamp(row.updated_at) }, subscription: row.subscription_plan === null || row.subscription_status === null || row.subscription_version === null || row.subscription_created_at === null || row.subscription_updated_at === null ? null : { organizationId: row.id, plan: row.subscription_plan, status: row.subscription_status, periodStartsAt: optionalIso(row.period_starts_at), periodEndsAt: optionalIso(row.period_ends_at), version: row.subscription_version, createdAt: normalizeIntegrationsTimestamp(row.subscription_created_at), updatedAt: normalizeIntegrationsTimestamp(row.subscription_updated_at) } };
}

export class DrizzleIntegrationsRepository implements IntegrationsRepository {
  constructor(private readonly database: Database) {}
  private async context(tx: Transaction, organizationId: string, actorId: string, requestId: string, verifiedAuthUserId?: string): Promise<void> { await tx.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${actorId}, ${requestId})`); if (verifiedAuthUserId !== undefined) await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${verifiedAuthUserId}::uuid)`); }
  private async actorContext(tx: Transaction, actor: AuthorizedTenantActorContext): Promise<void> { await this.context(tx, actor.organizationId, actor.actorId, actor.requestId, actor.actorType === 'user' ? actor.verifiedAuthUserId : undefined); }
  private async authorize(tx: Transaction, actor: AuthorizedTenantActorContext, permission: string): Promise<void> {
    if (actor.actorType !== 'user') { if (!actor.permissionSet.has(permission)) throw new IntegrationsAccessDeniedError(); return; }
    const rows = await tx.select({ id: memberships.userId }).from(memberships).innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId))).innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id))).innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)).where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, actor.actorId), eq(memberships.status, 'active'), eq(roles.active, true), eq(permissions.organizationId, actor.organizationId), eq(permissions.scope, 'organization'), eq(permissions.name, permission))).limit(1);
    if (rows.length !== 1) throw new IntegrationsAccessDeniedError();
  }
  private async authorizeAny(tx: Transaction, actor: AuthorizedTenantActorContext, candidates: readonly string[]): Promise<void> {
    for (const permission of candidates) {
      if (!actor.permissionSet.has(permission)) continue;
      try { await this.authorize(tx, actor, permission); return; }
      catch (error) { if (!(error instanceof IntegrationsAccessDeniedError)) throw error; }
    }
    throw new IntegrationsAccessDeniedError();
  }
  private async authorizeApiKeyScopes(tx: Transaction, actor: AuthorizedTenantActorContext, scopes: readonly string[]): Promise<void> {
    if (actor.actorType !== 'user') {
      if (scopes.some((scope) => !actor.permissionSet.has(scope))) throw new IntegrationsAccessDeniedError();
      return;
    }
    for (const scope of scopes) {
      const rows = await tx.select({ id: permissions.id }).from(memberships)
        .innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId)))
        .innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id)))
        .innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.organizationId, actor.organizationId)))
        .where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, actor.actorId), eq(memberships.status, 'active'), eq(roles.active, true), eq(permissions.name, scope), eq(permissions.scope, 'organization'))).limit(1);
      if (rows.length !== 1) throw new IntegrationsAccessDeniedError();
    }
  }
  private async enforceWritableSubscription(tx: Transaction, actor: AuthorizedTenantActorContext): Promise<void> {
    if (actor.actorType !== 'user') return;
    const rows = await tx.execute<{ state: string }>(sql`SELECT indicate_private.subscription_access_state(${actor.organizationId}::uuid) AS state`);
    const state = rows[0]?.state;
    if (state === 'platform' || state === 'active') return;
    throw new IntegrationsSubscriptionInactiveError(state ?? 'none');
  }
  private async audit(tx: Transaction, actor: AuthorizedTenantActorContext, organizationId: string, action: string, targetType: string, targetId: string | null, context: Readonly<Record<string, unknown>>, now: Date): Promise<void> {
    await tx.insert(auditLogs).values({ organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, targetId, outcome: 'succeeded', changedFields: Object.keys(context).sort(), after: redact(context) as Record<string, unknown>, requestId: actor.requestId, occurredAt: now });
  }
  private keyValues(input: NewStoredApiKey) { return { organizationId: input.organizationId, id: input.id, lookupId: input.lookupId, name: input.name, salt: input.salt, verificationHash: input.verificationHash, scopes: [...input.scopes], status: 'active' as const, predecessorId: input.predecessorId, expiresAt: input.expiresAt === null ? null : new Date(input.expiresAt), version: 1, createdAt: new Date(input.now), updatedAt: new Date(input.now) }; }

  async createApiKey(actor: AuthorizedTenantActorContext, input: NewStoredApiKey) {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.apiKeyManage); await this.enforceWritableSubscription(tx, actor); await this.authorizeApiKeyScopes(tx, actor, input.scopes); await this.enforceApiKeyQuota(tx, actor.organizationId, null); const rows = await tx.insert(apiKeys).values(this.keyValues(input)).returning(); await this.audit(tx, actor, actor.organizationId, 'api_key.issue', 'api_key', input.id, { name: input.name, scopes: input.scopes, expiresAt: input.expiresAt }, new Date(input.now)); return publicApiKeyRecord(mapKey(rows[0]!)); }); } catch (error) { if (uniqueViolation(error)) throw new IntegrationsConflictError(); throw error; }
  }
  async rotateApiKey(actor: AuthorizedTenantActorContext, priorId: string, expectedVersion: number, input: NewStoredApiKey) {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.apiKeyManage); await this.enforceWritableSubscription(tx, actor); await this.authorizeApiKeyScopes(tx, actor, input.scopes); const priorRows = await tx.select().from(apiKeys).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, priorId), eq(apiKeys.status, 'active'))).limit(1).for('update'); const prior = priorRows[0]; if (prior === undefined) throw new IntegrationsAccessDeniedError(); if (prior.version !== expectedVersion) throw new IntegrationsConflictError(); await this.enforceApiKeyQuota(tx, actor.organizationId, prior.id); const revoked = await tx.update(apiKeys).set({ status: 'revoked', version: prior.version + 1, updatedAt: new Date(input.now) }).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, prior.id), eq(apiKeys.version, expectedVersion), eq(apiKeys.status, 'active'))).returning({ id: apiKeys.id }); if (revoked.length !== 1) throw new IntegrationsConflictError(); const rows = await tx.insert(apiKeys).values(this.keyValues(input)).returning(); await this.audit(tx, actor, actor.organizationId, 'api_key.rotate', 'api_key', input.id, { predecessorId: prior.id, name: input.name, scopes: input.scopes }, new Date(input.now)); return publicApiKeyRecord(mapKey(rows[0]!)); }); } catch (error) { if (uniqueViolation(error)) throw new IntegrationsConflictError(); throw error; }
  }
  async revokeApiKey(actor: AuthorizedTenantActorContext, id: string, expectedVersion: number, now: string) {
    return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.apiKeyManage); const rows = await tx.select().from(apiKeys).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, id))).limit(1).for('update'); const prior = rows[0]; if (prior === undefined) throw new IntegrationsAccessDeniedError(); if (prior.version !== expectedVersion) throw new IntegrationsConflictError(); if (prior.status !== 'active') return publicApiKeyRecord(mapKey(prior)); const changed = await tx.update(apiKeys).set({ status: 'revoked', version: prior.version + 1, updatedAt: new Date(now) }).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, id), eq(apiKeys.version, expectedVersion))).returning(); if (changed.length !== 1) throw new IntegrationsConflictError(); await this.audit(tx, actor, actor.organizationId, 'api_key.revoke', 'api_key', id, { status: 'revoked' }, new Date(now)); return publicApiKeyRecord(mapKey(changed[0]!)); });
  }
  private async enforceApiKeyQuota(tx: Transaction, organizationId: string, excludeKeyId: string | null): Promise<void> {
    const quota = await readPlanQuota(tx, organizationId);
    if (quota === null) return;
    const activeKeys = await tx.select({ id: apiKeys.id }).from(apiKeys).where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.status, 'active')));
    const current = activeKeys.filter((key) => key.id !== excludeKeyId).length;
    const { exceeded, limit } = quotaExceeded(quota, 'api_key', current, 1);
    if (exceeded && limit !== null) throw new IntegrationsQuotaExceededError('api_key', limit);
  }

  async listApiKeys(actor: AuthorizedTenantActorContext) { return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorizeAny(tx, actor, [INTEGRATIONS_PERMISSIONS.apiKeyRead, INTEGRATIONS_PERMISSIONS.apiKeyManage]); return (await tx.select().from(apiKeys).where(eq(apiKeys.organizationId, actor.organizationId))).map((row) => publicApiKeyRecord(mapKey(row))); }); }
  async findApiKeyByLookupId(lookupId: string): Promise<StoredApiKey | null> { const rows = await this.database.execute<RawApiKeyRow>(sql`SELECT * FROM indicate_private.resolve_api_key_lookup(${lookupId})`); return rows[0] === undefined ? null : mapRawKey(rows[0]); }
  async recordApiKeyUse(organizationId: string, id: string, now: string): Promise<void> { await this.database.transaction(async (tx) => { await this.context(tx, organizationId, id, 'api-key-authentication'); await tx.update(apiKeys).set({ lastUsedAt: new Date(now), updatedAt: new Date(now) }).where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.id, id), eq(apiKeys.status, 'active'), or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date(now))))); }); }

  async resolveTelegramIdentity(telegramUserId: string, telegramChatId: string): Promise<TelegramIdentity | null> { const rows = await this.database.execute<{ mapping_id: string; organization_id: string; user_id: string; role_id: string; telegram_user_id: string; telegram_chat_id: string; permissions: string[] }>(sql`SELECT * FROM indicate_private.resolve_telegram_identity(${telegramUserId}, ${telegramChatId})`); const row = rows[0]; return row === undefined ? null : { mappingId: row.mapping_id, organizationId: row.organization_id, userId: row.user_id, roleId: row.role_id, telegramUserId: row.telegram_user_id, telegramChatId: row.telegram_chat_id, permissions: new Set(row.permissions) }; }
  async listTelegramMappings(actor: AuthorizedTenantActorContext): Promise<readonly TelegramMappingRecord[]> { return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.telegramManage); return (await tx.select().from(telegramIdentityMappings).where(eq(telegramIdentityMappings.organizationId, actor.organizationId))).map(mapTelegramMapping); }); }
  async createTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly id: string; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly consentedAt: string | null; readonly consentTextVersion: string | null; readonly ipHash: string | null; readonly now: string }): Promise<TelegramMappingRecord> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.telegramManage); await this.enforceWritableSubscription(tx, actor); const member = await tx.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, input.userId), eq(memberships.roleId, input.roleId), eq(memberships.status, 'active'))).limit(1); if (member.length !== 1) throw new IntegrationsAccessDeniedError(); const rows = await tx.insert(telegramIdentityMappings).values({ organizationId: actor.organizationId, id: input.id, userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId, status: 'active', version: 1, consentedAt: input.consentedAt === null ? null : new Date(input.consentedAt), consentTextVersion: input.consentTextVersion, ipHash: input.ipHash, createdAt: new Date(input.now), updatedAt: new Date(input.now) }).returning(); await this.audit(tx, actor, actor.organizationId, 'telegram_mapping.create', 'telegram_mapping', input.id, { userId: input.userId, roleId: input.roleId, telegramUserId: pseudonymizeTelegramId(input.telegramUserId), telegramChatId: pseudonymizeTelegramId(input.telegramChatId) }, new Date(input.now)); return mapTelegramMapping(rows[0]!); }); } catch (error) { if (uniqueViolation(error)) throw new IntegrationsConflictError(); throw error; }
  }
  async updateTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly mappingId: string; readonly expectedVersion: number; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly status: TelegramMappingRecord['status']; readonly now: string }): Promise<TelegramMappingRecord> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, INTEGRATIONS_PERMISSIONS.telegramManage); await this.enforceWritableSubscription(tx, actor); const member = await tx.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, input.userId), eq(memberships.roleId, input.roleId), eq(memberships.status, 'active'))).limit(1); if (member.length !== 1) throw new IntegrationsAccessDeniedError(); const rows = await tx.update(telegramIdentityMappings).set({ userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId, status: input.status, version: input.expectedVersion + 1, updatedAt: new Date(input.now) }).where(and(eq(telegramIdentityMappings.organizationId, actor.organizationId), eq(telegramIdentityMappings.id, input.mappingId), eq(telegramIdentityMappings.version, input.expectedVersion))).returning(); if (rows.length !== 1) throw new IntegrationsConflictError(); await this.audit(tx, actor, actor.organizationId, 'telegram_mapping.update', 'telegram_mapping', input.mappingId, { status: input.status, userId: input.userId, roleId: input.roleId }, new Date(input.now)); return mapTelegramMapping(rows[0]!); }); } catch (error) { if (uniqueViolation(error)) throw new IntegrationsConflictError(); throw error; }
  }
  async readTelegramConversation(identity: TelegramIdentity): Promise<TelegramConversation | null> { return this.database.transaction(async (tx) => { await this.context(tx, identity.organizationId, identity.mappingId, 'telegram-conversation'); const rows = await tx.select().from(telegramConversations).where(and(eq(telegramConversations.organizationId, identity.organizationId), eq(telegramConversations.telegramChatId, identity.telegramChatId), eq(telegramConversations.telegramUserId, identity.telegramUserId))).limit(1); const row = rows[0]; return row === undefined ? null : { source: 'telegram', organizationId: row.organizationId, chatId: row.telegramChatId, userId: row.telegramUserId, step: row.step, data: row.data, updatedAt: normalizeIntegrationsTimestamp(row.updatedAt), expiresAt: normalizeIntegrationsTimestamp(row.expiresAt) }; }); }
  async saveTelegramConversation(identity: TelegramIdentity, conversation: TelegramConversation): Promise<void> { await this.database.transaction(async (tx) => { await this.context(tx, identity.organizationId, identity.mappingId, 'telegram-conversation'); await tx.insert(telegramConversations).values({ organizationId: identity.organizationId, mappingId: identity.mappingId, telegramUserId: identity.telegramUserId, telegramChatId: identity.telegramChatId, step: conversation.step, data: conversation.data as Record<string, unknown>, expiresAt: new Date(conversation.expiresAt), updatedAt: new Date(conversation.updatedAt) }).onConflictDoUpdate({ target: [telegramConversations.organizationId, telegramConversations.telegramChatId, telegramConversations.telegramUserId], set: { mappingId: identity.mappingId, step: conversation.step, data: conversation.data as Record<string, unknown>, expiresAt: new Date(conversation.expiresAt), updatedAt: new Date(conversation.updatedAt) } }); }); }
  async clearTelegramConversation(identity: TelegramIdentity): Promise<void> { await this.database.transaction(async (tx) => { await this.context(tx, identity.organizationId, identity.mappingId, 'telegram-conversation'); await tx.delete(telegramConversations).where(and(eq(telegramConversations.organizationId, identity.organizationId), eq(telegramConversations.telegramChatId, identity.telegramChatId), eq(telegramConversations.telegramUserId, identity.telegramUserId))); }); }

  async enqueueOutboxMessage(input: { readonly organizationId: string | null; readonly chatId: string; readonly text: string; readonly now: string }): Promise<{ readonly id: string }> {
    const rows = await this.database.execute<{ outbox_enqueue: string }>(sql`SELECT indicate_private.outbox_enqueue(${input.organizationId}::uuid, ${input.chatId}, ${input.text}, ${input.now}::timestamptz) AS outbox_enqueue`);
    const id = rows[0]?.outbox_enqueue;
    if (id === undefined) throw new IntegrationsConflictError();
    return Object.freeze({ id });
  }

  async claimOutboxMessages(now: string, limit: number): Promise<readonly TelegramOutboxRecord[]> {
    const rows = await this.database.execute<{ id: string; organization_id: string | null; chat_id: string; text: string; status: TelegramOutboxRecord['status']; attempts: number }>(sql`SELECT * FROM indicate_private.outbox_claim(${now}::timestamptz, ${limit})`);
    return rows.map((row) => Object.freeze({ id: row.id, organizationId: row.organization_id, chatId: row.chat_id, text: row.text, status: row.status, attempts: row.attempts }));
  }

  async ackOutboxMessage(input: { readonly id: string; readonly ok: boolean; readonly retryAfterSeconds: number | null; readonly error: string | null; readonly now: string }): Promise<void> {
    await this.database.execute(sql`SELECT indicate_private.outbox_ack(${input.id}::uuid, ${input.ok}, ${input.retryAfterSeconds}, ${input.error}, ${input.now}::timestamptz)`);
  }

  async listBroadcastTargets(actorId: string): Promise<readonly { readonly organizationId: string; readonly chatId: string }[]> {
    const rows = await this.database.execute<{ organization_id: string; chat_id: string }>(sql`SELECT * FROM indicate_private.outbox_broadcast_targets(${actorId}::uuid)`);
    return rows.map((row) => Object.freeze({ organizationId: row.organization_id, chatId: row.chat_id }));
  }

  async claimReplay(input: ReplayClaimInput): Promise<ReplayClaimResult> {
    const executeClaim = () => this.database.execute<RawClaimRow & { claim_kind: 'created' | 'reclaimed' | 'duplicate' }>(sql`SELECT * FROM indicate_private.replay_claim(${input.source}, ${input.replayId}, ${input.organizationId}::uuid, ${input.bodyDigest}, ${input.receivedAt}::timestamptz, ${input.leaseExpiresAt}::timestamptz, ${input.expiresAt}::timestamptz)`);
    let rows = await executeClaim();
    if (rows[0] === undefined) rows = await executeClaim();
    const row = rows[0];
    if (row === undefined) throw new IntegrationsConflictError();
    return { kind: row.claim_kind, claim: mapRawClaim(row) };
  }
  async bindReplayIdentity(source: string, replayId: string, bodyDigest: string, claimToken: string, organizationId: string, identityBindingDigest: string): Promise<WebhookReplayClaim> {
    const rows = await this.database.execute<RawClaimRow>(sql`SELECT * FROM indicate_private.replay_bind_identity(${source}, ${replayId}, ${bodyDigest}, ${claimToken}::uuid, ${organizationId}::uuid, ${identityBindingDigest})`);
    const row = rows[0]; if (row === undefined) throw new IntegrationsAccessDeniedError(); return mapRawClaim(row);
  }
  async prepareReplayOutcome(source: string, replayId: string, bodyDigest: string, claimToken: string, status: 'processed' | 'rejected', outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> {
    const rows = await this.database.execute<RawClaimRow>(sql`SELECT * FROM indicate_private.replay_prepare_outcome(${source}, ${replayId}, ${bodyDigest}, ${claimToken}::uuid, ${status}::replay_claim_status, ${JSON.stringify(redact(outcome))}::jsonb, ${now}::timestamptz)`);
    const row = rows[0]; if (row === undefined) throw new IntegrationsAccessDeniedError(); return mapRawClaim(row);
  }
  async finalizeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, now: string): Promise<WebhookReplayClaim> {
    const rows = await this.database.execute<RawClaimRow>(sql`SELECT * FROM indicate_private.replay_finalize(${source}, ${replayId}, ${bodyDigest}, ${claimToken}::uuid, ${now}::timestamptz)`);
    const row = rows[0]; if (row === undefined) throw new IntegrationsAccessDeniedError(); return mapRawClaim(row);
  }
  async completeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> {
    await this.prepareReplayOutcome(source, replayId, bodyDigest, claimToken, 'processed', outcome, now); return this.finalizeReplay(source, replayId, bodyDigest, claimToken, now);
  }
  async rejectReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> {
    await this.prepareReplayOutcome(source, replayId, bodyDigest, claimToken, 'rejected', outcome, now); return this.finalizeReplay(source, replayId, bodyDigest, claimToken, now);
  }

  private async platformRows(executor: Database | Transaction, actor: AuthorizedTenantActorContext): Promise<CustomerRow[]> { return executor.execute<CustomerRow>(sql`SELECT * FROM indicate_private.customer_list(${actor.actorId}::uuid)`); }
  async listCustomers(actor: AuthorizedTenantActorContext): Promise<readonly CustomerProjection[]> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); return (await this.platformRows(tx, actor)).map(mapCustomer); }); }
    catch (error) { if (deniedViolation(error)) throw new IntegrationsAccessDeniedError(); throw error; }
  }
  async readCustomer(actor: AuthorizedTenantActorContext, organizationId: string): Promise<CustomerProjection | null> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); const value = (await this.platformRows(tx, actor)).find(({ id }) => id === organizationId); return value === undefined ? null : mapCustomer(value); }); }
    catch (error) { if (deniedViolation(error)) throw new IntegrationsAccessDeniedError(); throw error; }
  }
  async createCustomer(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly name: string; readonly slug: string; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly subscription?: Omit<SubscriptionRecord, 'organizationId' | 'version' | 'createdAt' | 'updatedAt'>; readonly now: string }) {
    try {
      return await this.database.transaction(async (tx) => {
        await tx.execute(sql`SELECT indicate_private.set_tenant_context(${input.organizationId}::uuid, ${actor.actorId}, ${actor.requestId})`);
        if (actor.actorType === 'user' && actor.verifiedAuthUserId !== undefined) {
          await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
        }
        await tx.execute(sql`SELECT indicate_private.customer_create(${actor.actorId}::uuid, ${actor.requestId}, ${input.organizationId}::uuid, ${input.name}, ${input.slug}, ${JSON.stringify(input.customerMetadata)}::jsonb, ${input.subscription === undefined ? null : JSON.stringify(input.subscription)}::jsonb, ${input.now}::timestamptz)`);
        await this.ensureAdministratorRole(tx, input.organizationId, input.now);
        const created = (await this.platformRows(tx, actor)).find(({ id }) => id === input.organizationId);
        if (created === undefined) throw new IntegrationsConflictError();
        return mapCustomer(created);
      });
    } catch (error) { if (deniedViolation(error)) throw new IntegrationsAccessDeniedError(); if (uniqueViolation(error)) throw new IntegrationsConflictError(); throw error; }
  }

  private async ensureAdministratorRole(tx: Transaction, organizationId: string, now: string): Promise<string> {
    const existing = await tx.select({ id: roles.id }).from(roles).where(and(eq(roles.organizationId, organizationId), eq(roles.tier, 'admin'), eq(roles.active, true))).limit(1);
    if (existing[0] !== undefined) return existing[0].id;
    const roleId = crypto.randomUUID();
    await tx.insert(roles).values({ organizationId, id: roleId, name: 'Administrator', tier: 'admin', active: true, version: 1, createdAt: new Date(now), updatedAt: new Date(now) });
    // Hanya subset SOLO_ADMIN_PERMISSION_NAMES yang di-grant.
    const grants = await tx.select({ id: permissions.id }).from(permissions).where(and(eq(permissions.organizationId, organizationId), eq(permissions.scope, 'organization'), sql`${permissions.name} IN (${sql.join([...SOLO_ADMIN_PERMISSION_NAMES].map((name) => sql`${name}`), sql`, `)})`));
    if (grants.length > 0) {
      await tx.insert(rolePermissions).values(grants.map((permission) => ({ organizationId, roleId, permissionId: permission.id })));
    }
    return roleId;
  }

  async assignFirstAdminMember(platformActor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly userEmail: string; readonly now: string }): Promise<{ readonly userId: string; readonly roleId: string }> {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT indicate_private.set_tenant_context(${input.organizationId}::uuid, ${platformActor.actorId}, ${platformActor.requestId})`);
      if (platformActor.actorType === 'user' && platformActor.verifiedAuthUserId !== undefined) {
        await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${platformActor.verifiedAuthUserId}::uuid)`);
      }
      const found = await tx.execute<{ id: string; auth_user_id: string; display_name: string; status: string }>(sql`
        SELECT * FROM indicate_private.resolve_user_by_email(${input.userEmail})
      `);
      const target = found[0];
      if (target === undefined || target.status !== 'active') throw new IntegrationsAccessDeniedError();
      const roleId = await this.ensureAdministratorRole(tx, input.organizationId, input.now);
      await tx.insert(memberships).values({
        organizationId: input.organizationId, userId: target.id, roleId, status: 'active',
        version: 1, createdAt: new Date(input.now), updatedAt: new Date(input.now),
      }).onConflictDoUpdate({
        target: [memberships.organizationId, memberships.userId],
        set: { roleId, status: 'active', version: sql`${memberships.version} + 1`, updatedAt: new Date(input.now) },
      });
      return Object.freeze({ userId: target.id, roleId });
    });
  }
  async updateCustomer(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion: number; readonly name: string; readonly slug: string; readonly status: 'active' | 'inactive' | 'archived'; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly now: string }) {
    try {
      return await this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        const rows = await tx.execute<{ updated: boolean }>(sql`SELECT indicate_private.customer_update(${actor.actorId}::uuid, ${actor.requestId}, ${input.organizationId}::uuid, ${input.expectedVersion}, ${input.name}, ${input.slug}, ${input.status}::record_status, ${JSON.stringify(input.customerMetadata)}::jsonb, ${input.now}::timestamptz) AS updated`);
        if (!rows[0]?.updated) throw new IntegrationsConflictError();
        const updated = (await this.platformRows(tx, actor)).find(({ id }) => id === input.organizationId);
        if (updated === undefined) throw new IntegrationsAccessDeniedError();
        return mapCustomer(updated);
      });
    } catch (error) { if (deniedViolation(error)) throw new IntegrationsAccessDeniedError(); if (uniqueViolation(error)) throw new IntegrationsConflictError(); throw error; }
  }
  async updateSubscription(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion?: number; readonly plan: SubscriptionPlan; readonly status: SubscriptionRecord['status']; readonly periodStartsAt: string | null; readonly periodEndsAt: string | null; readonly now: string; readonly platform: boolean }): Promise<SubscriptionRecord> {
    if (!input.platform && (actor.organizationId !== input.organizationId || !actor.permissionSet.has(INTEGRATIONS_PERMISSIONS.subscriptionManage))) throw new IntegrationsAccessDeniedError();
    const command = (executor: Database | Transaction) => executor.execute<{ updated: boolean }>(sql`SELECT indicate_private.subscription_update(${actor.actorId}::uuid, ${actor.requestId}, ${input.organizationId}::uuid, ${input.expectedVersion ?? null}::integer, ${input.plan}, ${input.status}::subscription_status, ${input.periodStartsAt}::timestamptz, ${input.periodEndsAt}::timestamptz, ${input.now}::timestamptz) AS updated`);
    try {
      if (input.platform) {
        return this.database.transaction(async (tx) => {
          await this.actorContext(tx, actor);
          const rows = await command(tx);
          if (!rows[0]?.updated) throw new IntegrationsConflictError();
          const customer = (await this.platformRows(tx, actor)).find(({ id }) => id === input.organizationId);
          if (customer === undefined) throw new IntegrationsConflictError();
          const projection = mapCustomer(customer);
          if (projection.subscription === null) throw new IntegrationsConflictError();
          return projection.subscription;
        });
      }
      return this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        const changed = await command(tx);
        if (!changed[0]?.updated) throw new IntegrationsConflictError();
        const rows = await tx.select().from(subscriptions).where(eq(subscriptions.organizationId, input.organizationId)).limit(1);
        const row = rows[0];
        if (row === undefined) throw new IntegrationsConflictError();
        return { organizationId: row.organizationId, plan: row.plan, status: row.status, periodStartsAt: optionalIso(row.periodStartsAt), periodEndsAt: optionalIso(row.periodEndsAt), version: row.version, createdAt: normalizeIntegrationsTimestamp(row.createdAt), updatedAt: normalizeIntegrationsTimestamp(row.updatedAt) };
      });
    } catch (error) {
      if (deniedViolation(error)) throw new IntegrationsAccessDeniedError();
      throw error;
    }
  }
  async readSubscription(actor: AuthorizedTenantActorContext): Promise<SubscriptionRecord | null> { return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorizeAny(tx, actor, [INTEGRATIONS_PERMISSIONS.subscriptionRead, INTEGRATIONS_PERMISSIONS.subscriptionManage]); const rows = await tx.select().from(subscriptions).where(eq(subscriptions.organizationId, actor.organizationId)).limit(1); const row = rows[0]; return row === undefined ? null : { organizationId: row.organizationId, plan: row.plan, status: row.status, periodStartsAt: optionalIso(row.periodStartsAt), periodEndsAt: optionalIso(row.periodEndsAt), version: row.version, createdAt: normalizeIntegrationsTimestamp(row.createdAt), updatedAt: normalizeIntegrationsTimestamp(row.updatedAt) }; }); }
  async recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void> { await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await tx.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, targetId: null, outcome: 'denied', changedFields: [], requestId: actor.requestId, occurredAt: new Date(now) }); }); }
}
