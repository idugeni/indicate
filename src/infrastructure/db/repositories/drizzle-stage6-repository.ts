import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { publicApiKeyRecord, type CustomerProjection, type StoredApiKey, type SubscriptionRecord, type TelegramConversation, type TelegramIdentity, type TelegramMappingRecord, type WebhookReplayClaim } from '@/domain/stage6/models';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import { Stage6AccessDeniedError, Stage6ConflictError, type NewStoredApiKey, type ReplayClaimInput, type ReplayClaimResult, type Stage6Repository } from '@/ports/stage6-repository';
import { redact } from '@/shared/security/redaction';
import { apiKeys, auditLogs, memberships, permissions, rolePermissions, roles, subscriptions, telegramConversations, telegramIdentityMappings } from '../schema';
import type * as schema from '../schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type RawTimestamp = Date | string;
const POSTGRES_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/;

export function normalizeStage6Timestamp(value: RawTimestamp): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError('Invalid Stage 6 database timestamp.');
    return value.toISOString();
  }
  if (typeof value !== 'string') throw new TypeError('Invalid Stage 6 database timestamp.');
  const match = POSTGRES_TIMESTAMP.exec(value);
  if (match === null) throw new TypeError('Invalid Stage 6 database timestamp.');
  const year = Number(match[1]); const month = Number(match[2]); const day = Number(match[3]);
  const hour = Number(match[4]); const minute = Number(match[5]); const second = Number(match[6]);
  const fraction = match[7] ?? ''; const offsetHour = Number(match[10] ?? 0); const offsetMinute = Number(match[11] ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1]! || hour > 23 || minute > 59 || second > 59 || offsetHour > 15 || offsetMinute > 59) throw new TypeError('Invalid Stage 6 database timestamp.');
  const milliseconds = Number(fraction.padEnd(3, '0').slice(0, 3));
  const utc = new Date(0); utc.setUTCFullYear(year, month - 1, day); utc.setUTCHours(hour, minute, second, milliseconds);
  const direction = match[9] === '-' ? -1 : match[9] === '+' ? 1 : 0;
  return new Date(utc.getTime() - direction * (offsetHour * 60 + offsetMinute) * 60_000).toISOString();
}
const optionalIso = (value: RawTimestamp | null) => value === null ? null : normalizeStage6Timestamp(value);
function uniqueViolation(error: unknown): boolean { let current: unknown = error; const seen = new Set<object>(); while (typeof current === 'object' && current !== null && !seen.has(current)) { seen.add(current); if ('code' in current && current.code === '23505') return true; current = 'cause' in current ? current.cause : undefined; } return false; }
function deniedViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === '42501'; }

function mapKey(row: typeof apiKeys.$inferSelect): StoredApiKey {
  return { id: row.id, organizationId: row.organizationId, lookupId: row.lookupId, name: row.name, salt: row.salt, verificationHash: row.verificationHash, scopes: row.scopes, status: row.status, predecessorId: row.predecessorId, expiresAt: optionalIso(row.expiresAt), lastUsedAt: optionalIso(row.lastUsedAt), version: row.version, createdAt: normalizeStage6Timestamp(row.createdAt), updatedAt: normalizeStage6Timestamp(row.updatedAt) };
}
type RawApiKeyRow = {
  organization_id: string; id: string; lookup_id: string; name: string; salt: string;
  verification_hash: string; scopes: string[]; status: StoredApiKey['status']; predecessor_id: string | null;
  expires_at: RawTimestamp | null; last_used_at: RawTimestamp | null; version: number; created_at: RawTimestamp; updated_at: RawTimestamp;
};
function mapRawKey(row: RawApiKeyRow): StoredApiKey {
  return { id: row.id, organizationId: row.organization_id, lookupId: row.lookup_id, name: row.name, salt: row.salt, verificationHash: row.verification_hash, scopes: row.scopes, status: row.status, predecessorId: row.predecessor_id, expiresAt: optionalIso(row.expires_at), lastUsedAt: optionalIso(row.last_used_at), version: row.version, createdAt: normalizeStage6Timestamp(row.created_at), updatedAt: normalizeStage6Timestamp(row.updated_at) };
}
function mapTelegramMapping(row: typeof telegramIdentityMappings.$inferSelect): TelegramMappingRecord {
  return { id: row.id, organizationId: row.organizationId, userId: row.userId, roleId: row.roleId, telegramUserId: row.telegramUserId, telegramChatId: row.telegramChatId, status: row.status, version: row.version, createdAt: normalizeStage6Timestamp(row.createdAt), updatedAt: normalizeStage6Timestamp(row.updatedAt) };
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
    receivedAt: normalizeStage6Timestamp(row.received_at), leaseExpiresAt: normalizeStage6Timestamp(row.lease_expires_at), attemptCount: row.attempt_count, expiresAt: normalizeStage6Timestamp(row.expires_at),
  };
}
type CustomerRow = { id: string; name: string; slug: string; status: 'active' | 'inactive' | 'archived'; customer_metadata: Record<string, unknown>; version: number; created_at: RawTimestamp; updated_at: RawTimestamp; subscription_plan: string | null; subscription_status: SubscriptionRecord['status'] | null; period_starts_at: RawTimestamp | null; period_ends_at: RawTimestamp | null; subscription_version: number | null; subscription_created_at: RawTimestamp | null; subscription_updated_at: RawTimestamp | null };
function mapCustomer(row: CustomerRow): CustomerProjection {
  return { customer: { id: row.id, name: row.name, slug: row.slug, status: row.status, customerMetadata: row.customer_metadata, version: row.version, createdAt: normalizeStage6Timestamp(row.created_at), updatedAt: normalizeStage6Timestamp(row.updated_at) }, subscription: row.subscription_plan === null || row.subscription_status === null || row.subscription_version === null || row.subscription_created_at === null || row.subscription_updated_at === null ? null : { organizationId: row.id, plan: row.subscription_plan, status: row.subscription_status, periodStartsAt: optionalIso(row.period_starts_at), periodEndsAt: optionalIso(row.period_ends_at), version: row.subscription_version, createdAt: normalizeStage6Timestamp(row.subscription_created_at), updatedAt: normalizeStage6Timestamp(row.subscription_updated_at) } };
}

export class DrizzleStage6Repository implements Stage6Repository {
  constructor(private readonly database: Database) {}
  private async context(tx: Transaction, organizationId: string, actorId: string, requestId: string, verifiedAuthUserId?: string): Promise<void> { await tx.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${actorId}, ${requestId})`); if (verifiedAuthUserId !== undefined) await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${verifiedAuthUserId}::uuid)`); }
  private async actorContext(tx: Transaction, actor: AuthorizedTenantActorContext): Promise<void> { await this.context(tx, actor.organizationId, actor.actorId, actor.requestId, actor.actorType === 'user' ? actor.verifiedAuthUserId : undefined); }
  private async authorize(tx: Transaction, actor: AuthorizedTenantActorContext, permission: string): Promise<void> {
    if (actor.actorType !== 'user') { if (!actor.permissionSet.has(permission)) throw new Stage6AccessDeniedError(); return; }
    const rows = await tx.select({ id: memberships.userId }).from(memberships).innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId))).innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id))).innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId)).where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, actor.actorId), eq(memberships.status, 'active'), eq(roles.active, true), eq(permissions.organizationId, actor.organizationId), eq(permissions.scope, 'organization'), eq(permissions.name, permission))).limit(1);
    if (rows.length !== 1) throw new Stage6AccessDeniedError();
  }
  private async authorizeAny(tx: Transaction, actor: AuthorizedTenantActorContext, candidates: readonly string[]): Promise<void> {
    for (const permission of candidates) {
      if (!actor.permissionSet.has(permission)) continue;
      try { await this.authorize(tx, actor, permission); return; }
      catch (error) { if (!(error instanceof Stage6AccessDeniedError)) throw error; }
    }
    throw new Stage6AccessDeniedError();
  }
  private async authorizeApiKeyScopes(tx: Transaction, actor: AuthorizedTenantActorContext, scopes: readonly string[]): Promise<void> {
    if (actor.actorType !== 'user') {
      if (scopes.some((scope) => !actor.permissionSet.has(scope))) throw new Stage6AccessDeniedError();
      return;
    }
    for (const scope of scopes) {
      const rows = await tx.select({ id: permissions.id }).from(memberships)
        .innerJoin(roles, and(eq(roles.organizationId, memberships.organizationId), eq(roles.id, memberships.roleId)))
        .innerJoin(rolePermissions, and(eq(rolePermissions.organizationId, roles.organizationId), eq(rolePermissions.roleId, roles.id)))
        .innerJoin(permissions, and(eq(permissions.id, rolePermissions.permissionId), eq(permissions.organizationId, actor.organizationId)))
        .where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, actor.actorId), eq(memberships.status, 'active'), eq(roles.active, true), eq(permissions.name, scope), eq(permissions.scope, 'organization'))).limit(1);
      if (rows.length !== 1) throw new Stage6AccessDeniedError();
    }
  }
  private async audit(tx: Transaction, actor: AuthorizedTenantActorContext, organizationId: string, action: string, targetType: string, targetId: string | null, context: Readonly<Record<string, unknown>>, now: Date): Promise<void> {
    await tx.insert(auditLogs).values({ organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, targetId, outcome: 'succeeded', changedFields: Object.keys(context).sort(), after: redact(context) as Record<string, unknown>, requestId: actor.requestId, occurredAt: now });
  }
  private keyValues(input: NewStoredApiKey) { return { organizationId: input.organizationId, id: input.id, lookupId: input.lookupId, name: input.name, salt: input.salt, verificationHash: input.verificationHash, scopes: [...input.scopes], status: 'active' as const, predecessorId: input.predecessorId, expiresAt: input.expiresAt === null ? null : new Date(input.expiresAt), version: 1, createdAt: new Date(input.now), updatedAt: new Date(input.now) }; }

  async createApiKey(actor: AuthorizedTenantActorContext, input: NewStoredApiKey) {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, STAGE6_PERMISSIONS.apiKeyManage); await this.authorizeApiKeyScopes(tx, actor, input.scopes); const rows = await tx.insert(apiKeys).values(this.keyValues(input)).returning(); await this.audit(tx, actor, actor.organizationId, 'api_key.issue', 'api_key', input.id, { name: input.name, scopes: input.scopes, expiresAt: input.expiresAt }, new Date(input.now)); return publicApiKeyRecord(mapKey(rows[0]!)); }); } catch (error) { if (uniqueViolation(error)) throw new Stage6ConflictError(); throw error; }
  }
  async rotateApiKey(actor: AuthorizedTenantActorContext, priorId: string, expectedVersion: number, input: NewStoredApiKey) {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, STAGE6_PERMISSIONS.apiKeyManage); await this.authorizeApiKeyScopes(tx, actor, input.scopes); const priorRows = await tx.select().from(apiKeys).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, priorId), eq(apiKeys.status, 'active'))).limit(1).for('update'); const prior = priorRows[0]; if (prior === undefined) throw new Stage6AccessDeniedError(); if (prior.version !== expectedVersion) throw new Stage6ConflictError(); const revoked = await tx.update(apiKeys).set({ status: 'revoked', version: prior.version + 1, updatedAt: new Date(input.now) }).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, prior.id), eq(apiKeys.version, expectedVersion), eq(apiKeys.status, 'active'))).returning({ id: apiKeys.id }); if (revoked.length !== 1) throw new Stage6ConflictError(); const rows = await tx.insert(apiKeys).values(this.keyValues(input)).returning(); await this.audit(tx, actor, actor.organizationId, 'api_key.rotate', 'api_key', input.id, { predecessorId: prior.id, name: input.name, scopes: input.scopes }, new Date(input.now)); return publicApiKeyRecord(mapKey(rows[0]!)); }); } catch (error) { if (uniqueViolation(error)) throw new Stage6ConflictError(); throw error; }
  }
  async revokeApiKey(actor: AuthorizedTenantActorContext, id: string, expectedVersion: number, now: string) {
    return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, STAGE6_PERMISSIONS.apiKeyManage); const rows = await tx.select().from(apiKeys).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, id))).limit(1).for('update'); const prior = rows[0]; if (prior === undefined) throw new Stage6AccessDeniedError(); if (prior.version !== expectedVersion) throw new Stage6ConflictError(); if (prior.status !== 'active') return publicApiKeyRecord(mapKey(prior)); const changed = await tx.update(apiKeys).set({ status: 'revoked', version: prior.version + 1, updatedAt: new Date(now) }).where(and(eq(apiKeys.organizationId, actor.organizationId), eq(apiKeys.id, id), eq(apiKeys.version, expectedVersion))).returning(); if (changed.length !== 1) throw new Stage6ConflictError(); await this.audit(tx, actor, actor.organizationId, 'api_key.revoke', 'api_key', id, { status: 'revoked' }, new Date(now)); return publicApiKeyRecord(mapKey(changed[0]!)); });
  }
  async listApiKeys(actor: AuthorizedTenantActorContext) { return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorizeAny(tx, actor, [STAGE6_PERMISSIONS.apiKeyRead, STAGE6_PERMISSIONS.apiKeyManage]); return (await tx.select().from(apiKeys).where(eq(apiKeys.organizationId, actor.organizationId))).map((row) => publicApiKeyRecord(mapKey(row))); }); }
  async findApiKeyByLookupId(lookupId: string): Promise<StoredApiKey | null> { const rows = await this.database.execute<RawApiKeyRow>(sql`SELECT * FROM indicate_private.resolve_stage6_api_key_lookup(${lookupId})`); return rows[0] === undefined ? null : mapRawKey(rows[0]); }
  async recordApiKeyUse(organizationId: string, id: string, now: string): Promise<void> { await this.database.transaction(async (tx) => { await this.context(tx, organizationId, id, 'api-key-authentication'); await tx.update(apiKeys).set({ lastUsedAt: new Date(now), updatedAt: new Date(now) }).where(and(eq(apiKeys.organizationId, organizationId), eq(apiKeys.id, id), eq(apiKeys.status, 'active'), or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date(now))))); }); }

  async resolveTelegramIdentity(telegramUserId: string, telegramChatId: string): Promise<TelegramIdentity | null> { const rows = await this.database.execute<{ mapping_id: string; organization_id: string; user_id: string; role_id: string; telegram_user_id: string; telegram_chat_id: string; permissions: string[] }>(sql`SELECT * FROM indicate_private.resolve_stage6_telegram_identity(${telegramUserId}, ${telegramChatId})`); const row = rows[0]; return row === undefined ? null : { mappingId: row.mapping_id, organizationId: row.organization_id, userId: row.user_id, roleId: row.role_id, telegramUserId: row.telegram_user_id, telegramChatId: row.telegram_chat_id, permissions: new Set(row.permissions) }; }
  async listTelegramMappings(actor: AuthorizedTenantActorContext): Promise<readonly TelegramMappingRecord[]> { return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, STAGE6_PERMISSIONS.telegramManage); return (await tx.select().from(telegramIdentityMappings).where(eq(telegramIdentityMappings.organizationId, actor.organizationId))).map(mapTelegramMapping); }); }
  async createTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly id: string; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly now: string }): Promise<TelegramMappingRecord> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, STAGE6_PERMISSIONS.telegramManage); const member = await tx.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, input.userId), eq(memberships.roleId, input.roleId), eq(memberships.status, 'active'))).limit(1); if (member.length !== 1) throw new Stage6AccessDeniedError(); const rows = await tx.insert(telegramIdentityMappings).values({ organizationId: actor.organizationId, id: input.id, userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId, status: 'active', version: 1, createdAt: new Date(input.now), updatedAt: new Date(input.now) }).returning(); await this.audit(tx, actor, actor.organizationId, 'telegram_mapping.create', 'telegram_mapping', input.id, { userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId }, new Date(input.now)); return mapTelegramMapping(rows[0]!); }); } catch (error) { if (uniqueViolation(error)) throw new Stage6ConflictError(); throw error; }
  }
  async updateTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly mappingId: string; readonly expectedVersion: number; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly status: TelegramMappingRecord['status']; readonly now: string }): Promise<TelegramMappingRecord> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorize(tx, actor, STAGE6_PERMISSIONS.telegramManage); const member = await tx.select({ userId: memberships.userId }).from(memberships).where(and(eq(memberships.organizationId, actor.organizationId), eq(memberships.userId, input.userId), eq(memberships.roleId, input.roleId), eq(memberships.status, 'active'))).limit(1); if (member.length !== 1) throw new Stage6AccessDeniedError(); const rows = await tx.update(telegramIdentityMappings).set({ userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId, status: input.status, version: input.expectedVersion + 1, updatedAt: new Date(input.now) }).where(and(eq(telegramIdentityMappings.organizationId, actor.organizationId), eq(telegramIdentityMappings.id, input.mappingId), eq(telegramIdentityMappings.version, input.expectedVersion))).returning(); if (rows.length !== 1) throw new Stage6ConflictError(); await this.audit(tx, actor, actor.organizationId, 'telegram_mapping.update', 'telegram_mapping', input.mappingId, { status: input.status, userId: input.userId, roleId: input.roleId }, new Date(input.now)); return mapTelegramMapping(rows[0]!); }); } catch (error) { if (uniqueViolation(error)) throw new Stage6ConflictError(); throw error; }
  }
  async readTelegramConversation(identity: TelegramIdentity): Promise<TelegramConversation | null> { return this.database.transaction(async (tx) => { await this.context(tx, identity.organizationId, identity.mappingId, 'telegram-conversation'); const rows = await tx.select().from(telegramConversations).where(and(eq(telegramConversations.organizationId, identity.organizationId), eq(telegramConversations.telegramChatId, identity.telegramChatId), eq(telegramConversations.telegramUserId, identity.telegramUserId))).limit(1); const row = rows[0]; return row === undefined ? null : { source: 'telegram', organizationId: row.organizationId, chatId: row.telegramChatId, userId: row.telegramUserId, step: row.step as TelegramConversation['step'], data: row.data, updatedAt: normalizeStage6Timestamp(row.updatedAt), expiresAt: normalizeStage6Timestamp(row.expiresAt) }; }); }
  async saveTelegramConversation(identity: TelegramIdentity, conversation: TelegramConversation): Promise<void> { await this.database.transaction(async (tx) => { await this.context(tx, identity.organizationId, identity.mappingId, 'telegram-conversation'); await tx.insert(telegramConversations).values({ organizationId: identity.organizationId, mappingId: identity.mappingId, telegramUserId: identity.telegramUserId, telegramChatId: identity.telegramChatId, step: conversation.step, data: conversation.data as Record<string, unknown>, expiresAt: new Date(conversation.expiresAt), updatedAt: new Date(conversation.updatedAt) }).onConflictDoUpdate({ target: [telegramConversations.organizationId, telegramConversations.telegramChatId, telegramConversations.telegramUserId], set: { mappingId: identity.mappingId, step: conversation.step, data: conversation.data as Record<string, unknown>, expiresAt: new Date(conversation.expiresAt), updatedAt: new Date(conversation.updatedAt) } }); }); }
  async clearTelegramConversation(identity: TelegramIdentity): Promise<void> { await this.database.transaction(async (tx) => { await this.context(tx, identity.organizationId, identity.mappingId, 'telegram-conversation'); await tx.delete(telegramConversations).where(and(eq(telegramConversations.organizationId, identity.organizationId), eq(telegramConversations.telegramChatId, identity.telegramChatId), eq(telegramConversations.telegramUserId, identity.telegramUserId))); }); }

  async claimReplay(input: ReplayClaimInput): Promise<ReplayClaimResult> {
    const rows = await this.database.execute<RawClaimRow & { claim_kind: 'created' | 'reclaimed' | 'duplicate' }>(sql`SELECT * FROM indicate_private.stage6_claim_replay(${input.source}, ${input.replayId}, ${input.organizationId}::uuid, ${input.bodyDigest}, ${input.receivedAt}::timestamptz, ${input.leaseExpiresAt}::timestamptz, ${input.expiresAt}::timestamptz)`);
    const row = rows[0];
    if (row === undefined) throw new Stage6ConflictError();
    return { kind: row.claim_kind, claim: mapRawClaim(row) };
  }
  async bindReplayIdentity(source: string, replayId: string, bodyDigest: string, claimToken: string, organizationId: string, identityBindingDigest: string): Promise<WebhookReplayClaim> {
    const rows = await this.database.execute<RawClaimRow>(sql`SELECT * FROM indicate_private.stage6_bind_replay_identity(${source}, ${replayId}, ${bodyDigest}, ${claimToken}::uuid, ${organizationId}::uuid, ${identityBindingDigest})`);
    const row = rows[0]; if (row === undefined) throw new Stage6AccessDeniedError(); return mapRawClaim(row);
  }
  async prepareReplayOutcome(source: string, replayId: string, bodyDigest: string, claimToken: string, status: 'processed' | 'rejected', outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> {
    const rows = await this.database.execute<RawClaimRow>(sql`SELECT * FROM indicate_private.stage6_prepare_replay_outcome(${source}, ${replayId}, ${bodyDigest}, ${claimToken}::uuid, ${status}::replay_claim_status, ${JSON.stringify(redact(outcome))}::jsonb, ${now}::timestamptz)`);
    const row = rows[0]; if (row === undefined) throw new Stage6AccessDeniedError(); return mapRawClaim(row);
  }
  async finalizeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, now: string): Promise<WebhookReplayClaim> {
    const rows = await this.database.execute<RawClaimRow>(sql`SELECT * FROM indicate_private.stage6_finalize_replay(${source}, ${replayId}, ${bodyDigest}, ${claimToken}::uuid, ${now}::timestamptz)`);
    const row = rows[0]; if (row === undefined) throw new Stage6AccessDeniedError(); return mapRawClaim(row);
  }
  async completeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> {
    await this.prepareReplayOutcome(source, replayId, bodyDigest, claimToken, 'processed', outcome, now); return this.finalizeReplay(source, replayId, bodyDigest, claimToken, now);
  }
  async rejectReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> {
    await this.prepareReplayOutcome(source, replayId, bodyDigest, claimToken, 'rejected', outcome, now); return this.finalizeReplay(source, replayId, bodyDigest, claimToken, now);
  }

  private async platformRows(executor: Database | Transaction, actor: AuthorizedTenantActorContext): Promise<CustomerRow[]> { return executor.execute<CustomerRow>(sql`SELECT * FROM indicate_private.stage6_list_customers(${actor.actorId}::uuid)`); }
  async listCustomers(actor: AuthorizedTenantActorContext): Promise<readonly CustomerProjection[]> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); return (await this.platformRows(tx, actor)).map(mapCustomer); }); }
    catch (error) { if (deniedViolation(error)) throw new Stage6AccessDeniedError(); throw error; }
  }
  async readCustomer(actor: AuthorizedTenantActorContext, organizationId: string): Promise<CustomerProjection | null> {
    try { return await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); const value = (await this.platformRows(tx, actor)).find(({ id }) => id === organizationId); return value === undefined ? null : mapCustomer(value); }); }
    catch (error) { if (deniedViolation(error)) throw new Stage6AccessDeniedError(); throw error; }
  }
  async createCustomer(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly name: string; readonly slug: string; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly subscription?: Omit<SubscriptionRecord, 'organizationId' | 'version' | 'createdAt' | 'updatedAt'>; readonly now: string }) {
    try {
      return await this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        await tx.execute(sql`SELECT indicate_private.stage6_create_customer(${actor.actorId}::uuid, ${actor.requestId}, ${input.organizationId}::uuid, ${input.name}, ${input.slug}, ${JSON.stringify(input.customerMetadata)}::jsonb, ${input.subscription === undefined ? null : JSON.stringify(input.subscription)}::jsonb, ${input.now}::timestamptz)`);
        const created = (await this.platformRows(tx, actor)).find(({ id }) => id === input.organizationId);
        if (created === undefined) throw new Stage6ConflictError();
        return mapCustomer(created);
      });
    } catch (error) { if (deniedViolation(error)) throw new Stage6AccessDeniedError(); if (uniqueViolation(error)) throw new Stage6ConflictError(); throw error; }
  }
  async updateCustomer(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion: number; readonly name: string; readonly slug: string; readonly status: 'active' | 'inactive' | 'archived'; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly now: string }) {
    try {
      return await this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        const rows = await tx.execute<{ updated: boolean }>(sql`SELECT indicate_private.stage6_update_customer(${actor.actorId}::uuid, ${actor.requestId}, ${input.organizationId}::uuid, ${input.expectedVersion}, ${input.name}, ${input.slug}, ${input.status}::record_status, ${JSON.stringify(input.customerMetadata)}::jsonb, ${input.now}::timestamptz) AS updated`);
        if (!rows[0]?.updated) throw new Stage6ConflictError();
        const updated = (await this.platformRows(tx, actor)).find(({ id }) => id === input.organizationId);
        if (updated === undefined) throw new Stage6AccessDeniedError();
        return mapCustomer(updated);
      });
    } catch (error) { if (deniedViolation(error)) throw new Stage6AccessDeniedError(); if (uniqueViolation(error)) throw new Stage6ConflictError(); throw error; }
  }
  async updateSubscription(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion?: number; readonly plan: string; readonly status: SubscriptionRecord['status']; readonly periodStartsAt: string | null; readonly periodEndsAt: string | null; readonly now: string; readonly platform: boolean }): Promise<SubscriptionRecord> {
    if (!input.platform && (actor.organizationId !== input.organizationId || !actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionManage))) throw new Stage6AccessDeniedError();
    const command = (executor: Database | Transaction) => executor.execute<{ updated: boolean }>(sql`SELECT indicate_private.stage6_update_subscription(${actor.actorId}::uuid, ${actor.requestId}, ${input.organizationId}::uuid, ${input.expectedVersion ?? null}::integer, ${input.plan}, ${input.status}::subscription_status, ${input.periodStartsAt}::timestamptz, ${input.periodEndsAt}::timestamptz, ${input.now}::timestamptz) AS updated`);
    try {
      if (input.platform) {
        return this.database.transaction(async (tx) => {
          await this.actorContext(tx, actor);
          const rows = await command(tx);
          if (!rows[0]?.updated) throw new Stage6ConflictError();
          const customer = (await this.platformRows(tx, actor)).find(({ id }) => id === input.organizationId);
          if (customer === undefined) throw new Stage6ConflictError();
          const projection = mapCustomer(customer);
          if (projection.subscription === null) throw new Stage6ConflictError();
          return projection.subscription;
        });
      }
      return this.database.transaction(async (tx) => {
        await this.actorContext(tx, actor);
        const changed = await command(tx);
        if (!changed[0]?.updated) throw new Stage6ConflictError();
        const rows = await tx.select().from(subscriptions).where(eq(subscriptions.organizationId, input.organizationId)).limit(1);
        const row = rows[0];
        if (row === undefined) throw new Stage6ConflictError();
        return { organizationId: row.organizationId, plan: row.plan, status: row.status, periodStartsAt: optionalIso(row.periodStartsAt), periodEndsAt: optionalIso(row.periodEndsAt), version: row.version, createdAt: normalizeStage6Timestamp(row.createdAt), updatedAt: normalizeStage6Timestamp(row.updatedAt) };
      });
    } catch (error) {
      if (deniedViolation(error)) throw new Stage6AccessDeniedError();
      throw error;
    }
  }
  async readSubscription(actor: AuthorizedTenantActorContext): Promise<SubscriptionRecord | null> { return this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await this.authorizeAny(tx, actor, [STAGE6_PERMISSIONS.subscriptionRead, STAGE6_PERMISSIONS.subscriptionManage]); const rows = await tx.select().from(subscriptions).where(eq(subscriptions.organizationId, actor.organizationId)).limit(1); const row = rows[0]; return row === undefined ? null : { organizationId: row.organizationId, plan: row.plan, status: row.status, periodStartsAt: optionalIso(row.periodStartsAt), periodEndsAt: optionalIso(row.periodEndsAt), version: row.version, createdAt: normalizeStage6Timestamp(row.createdAt), updatedAt: normalizeStage6Timestamp(row.updatedAt) }; }); }
  async recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void> { await this.database.transaction(async (tx) => { await this.actorContext(tx, actor); await tx.insert(auditLogs).values({ organizationId: actor.organizationId, id: crypto.randomUUID(), actorType: actor.actorType, actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, targetId: null, outcome: 'denied', changedFields: [], requestId: actor.requestId, occurredAt: new Date(now) }); }); }
}
