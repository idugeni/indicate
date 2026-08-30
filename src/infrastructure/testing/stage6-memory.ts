import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { publicApiKeyRecord, type ApiKeyRecord, type CustomerProjection, type StoredApiKey, type SubscriptionRecord, type TelegramConversation, type TelegramIdentity, type TelegramMappingRecord, type WebhookReplayClaim } from '@/domain/stage6/models';
import { STAGE6_PERMISSIONS } from '@/domain/stage6/permissions';
import { Stage6AccessDeniedError, Stage6ConflictError, type NewStoredApiKey, type ReplayClaimInput, type ReplayClaimResult, type Stage6Repository } from '@/ports/stage6-repository';

export interface Stage6Audit { readonly organizationId: string; readonly actorId: string; readonly action: string; readonly targetId: string | null; readonly context: Readonly<Record<string, unknown>> }
const clone = <T>(value: T): T => structuredClone(value);
export class InMemoryStage6Repository implements Stage6Repository {
  private readonly keys = new Map<string, StoredApiKey>();
  private readonly telegramPermissions = new Map<string, ReadonlySet<string>>();
  private readonly telegramMappings = new Map<string, TelegramMappingRecord>();
  private readonly conversations = new Map<string, TelegramConversation>();
  private readonly claims = new Map<string, WebhookReplayClaim>();
  private readonly customers = new Map<string, CustomerProjection>();
  readonly audits: Stage6Audit[] = [];
  failNextAudit = false;
  failNextReplayFinalize = false;
  failNextReplayPrepare = false;
  replayBusinessReceiptOnPrepareFailure: Readonly<Record<string, unknown>> | null = null;

  seedTelegram(identity: TelegramIdentity): void {
    this.telegramPermissions.set(identity.mappingId, new Set(identity.permissions));
    const now = '2026-08-30T00:00:00.000Z';
    this.telegramMappings.set(identity.mappingId, { id: identity.mappingId, organizationId: identity.organizationId, userId: identity.userId, roleId: identity.roleId, telegramUserId: identity.telegramUserId, telegramChatId: identity.telegramChatId, status: 'active', version: 1, createdAt: now, updatedAt: now });
  }
  seedCustomer(value: CustomerProjection): void { this.customers.set(value.customer.id, clone(value)); }
  seedApiKey(value: StoredApiKey): void { this.keys.set(value.lookupId, clone(value)); }
  snapshotApiKeys(): readonly StoredApiKey[] { return [...this.keys.values()].map(clone); }
  snapshotCustomers(): readonly CustomerProjection[] { return [...this.customers.values()].map(clone); }
  private audit(actor: AuthorizedTenantActorContext, action: string, targetId: string | null, organizationId = actor.organizationId, context: Readonly<Record<string, unknown>> = {}): void {
    if (this.failNextAudit) { this.failNextAudit = false; throw new Error('Injected audit failure'); }
    this.audits.push({ organizationId, actorId: actor.actorId, action, targetId, context: clone(context) });
  }
  private require(actor: AuthorizedTenantActorContext, permission: string): void { if (!actor.permissionSet.has(permission)) throw new Stage6AccessDeniedError(); }
  private findById(actor: AuthorizedTenantActorContext, id: string): StoredApiKey {
    const key = [...this.keys.values()].find((candidate) => candidate.organizationId === actor.organizationId && candidate.id === id); if (key === undefined) throw new Stage6AccessDeniedError(); return key;
  }
  async createApiKey(actor: AuthorizedTenantActorContext, input: NewStoredApiKey): Promise<ApiKeyRecord> {
    this.require(actor, STAGE6_PERMISSIONS.apiKeyManage); if (this.keys.has(input.lookupId)) throw new Stage6ConflictError();
    const key: StoredApiKey = { ...input, status: 'active', lastUsedAt: null, version: 1, createdAt: input.now, updatedAt: input.now };
    const auditLength = this.audits.length; try { this.audit(actor, 'api_key.issue', key.id, actor.organizationId, { name: key.name, scopes: key.scopes, expiresAt: key.expiresAt }); this.keys.set(key.lookupId, key); } catch (error) { this.audits.length = auditLength; throw error; }
    return clone(publicApiKeyRecord(key));
  }
  async rotateApiKey(actor: AuthorizedTenantActorContext, priorId: string, expectedVersion: number, input: NewStoredApiKey): Promise<ApiKeyRecord> {
    this.require(actor, STAGE6_PERMISSIONS.apiKeyManage); const prior = this.findById(actor, priorId); if (prior.status !== 'active') throw new Stage6AccessDeniedError(); if (prior.version !== expectedVersion) throw new Stage6ConflictError();
    const replacement: StoredApiKey = { ...input, status: 'active', lastUsedAt: null, version: 1, createdAt: input.now, updatedAt: input.now };
    const auditLength = this.audits.length; try {
      this.audit(actor, 'api_key.rotate', replacement.id, actor.organizationId, { predecessorId: prior.id, name: replacement.name, scopes: replacement.scopes });
      this.keys.set(prior.lookupId, { ...prior, status: 'revoked', version: prior.version + 1, updatedAt: input.now }); this.keys.set(replacement.lookupId, replacement);
    } catch (error) { this.audits.length = auditLength; throw error; }
    return clone(publicApiKeyRecord(replacement));
  }
  async revokeApiKey(actor: AuthorizedTenantActorContext, id: string, expectedVersion: number, now: string): Promise<ApiKeyRecord> {
    this.require(actor, STAGE6_PERMISSIONS.apiKeyManage); const prior = this.findById(actor, id); if (prior.version !== expectedVersion) throw new Stage6ConflictError(); if (prior.status !== 'active') return clone(publicApiKeyRecord(prior));
    const next = { ...prior, status: 'revoked' as const, version: prior.version + 1, updatedAt: now }; const auditLength = this.audits.length;
    try { this.audit(actor, 'api_key.revoke', id, actor.organizationId, { status: 'revoked' }); this.keys.set(prior.lookupId, next); } catch (error) { this.audits.length = auditLength; throw error; }
    return clone(publicApiKeyRecord(next));
  }
  async listApiKeys(actor: AuthorizedTenantActorContext): Promise<readonly ApiKeyRecord[]> { return [...this.keys.values()].filter(({ organizationId }) => organizationId === actor.organizationId).map((value) => clone(publicApiKeyRecord(value))); }
  async findApiKeyByLookupId(lookupId: string): Promise<StoredApiKey | null> { const value = this.keys.get(lookupId); return value === undefined ? null : clone(value); }
  async recordApiKeyUse(organizationId: string, id: string, now: string): Promise<void> { const key = [...this.keys.values()].find((value) => value.organizationId === organizationId && value.id === id); if (key !== undefined) this.keys.set(key.lookupId, { ...key, lastUsedAt: now, updatedAt: now }); }

  async resolveTelegramIdentity(user: string, chat: string): Promise<TelegramIdentity | null> {
    const matches = [...this.telegramMappings.values()].filter(({ telegramUserId, telegramChatId, status }) => telegramUserId === user && telegramChatId === chat && status === 'active');
    if (matches.length !== 1) return null;
    const mapping = matches[0]!;
    return { mappingId: mapping.id, organizationId: mapping.organizationId, userId: mapping.userId, roleId: mapping.roleId, telegramUserId: mapping.telegramUserId, telegramChatId: mapping.telegramChatId, permissions: new Set(this.telegramPermissions.get(mapping.id) ?? []) };
  }
  async listTelegramMappings(actor: AuthorizedTenantActorContext): Promise<readonly TelegramMappingRecord[]> { this.require(actor, STAGE6_PERMISSIONS.telegramManage); return [...this.telegramMappings.values()].filter(({ organizationId }) => organizationId === actor.organizationId).map(clone); }
  async createTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly id: string; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly now: string }): Promise<TelegramMappingRecord> {
    this.require(actor, STAGE6_PERMISSIONS.telegramManage);
    if ([...this.telegramMappings.values()].some((value) => value.organizationId === actor.organizationId && value.telegramUserId === input.telegramUserId && value.telegramChatId === input.telegramChatId)) throw new Stage6ConflictError();
    const mapping: TelegramMappingRecord = { ...input, organizationId: actor.organizationId, status: 'active', version: 1, createdAt: input.now, updatedAt: input.now };
    const auditLength = this.audits.length; try { this.audit(actor, 'telegram_mapping.create', input.id, actor.organizationId, { userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId }); this.telegramMappings.set(input.id, mapping); this.telegramPermissions.set(input.id, input.userId === actor.actorId ? new Set(actor.permissionSet) : new Set()); } catch (error) { this.audits.length = auditLength; throw error; }
    return clone(mapping);
  }
  async updateTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly mappingId: string; readonly expectedVersion: number; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly status: TelegramMappingRecord['status']; readonly now: string }): Promise<TelegramMappingRecord> {
    this.require(actor, STAGE6_PERMISSIONS.telegramManage); const prior = this.telegramMappings.get(input.mappingId); if (prior === undefined || prior.organizationId !== actor.organizationId) throw new Stage6AccessDeniedError(); if (prior.version !== input.expectedVersion) throw new Stage6ConflictError();
    const next = { ...prior, userId: input.userId, roleId: input.roleId, telegramUserId: input.telegramUserId, telegramChatId: input.telegramChatId, status: input.status, version: prior.version + 1, updatedAt: input.now };
    const auditLength = this.audits.length; try {
      this.audit(actor, 'telegram_mapping.update', input.mappingId, actor.organizationId, { status: input.status, userId: input.userId, roleId: input.roleId });
      this.telegramMappings.set(input.mappingId, next);
      if (prior.userId !== input.userId || prior.roleId !== input.roleId) this.telegramPermissions.set(input.mappingId, input.userId === actor.actorId ? new Set(actor.permissionSet) : new Set());
    } catch (error) { this.audits.length = auditLength; throw error; }
    return clone(next);
  }
  async readTelegramConversation(identity: TelegramIdentity): Promise<TelegramConversation | null> { return this.conversations.get(`${identity.organizationId}:${identity.telegramChatId}:${identity.telegramUserId}`) ?? null; }
  async saveTelegramConversation(identity: TelegramIdentity, conversation: TelegramConversation): Promise<void> { this.conversations.set(`${identity.organizationId}:${identity.telegramChatId}:${identity.telegramUserId}`, clone(conversation)); }
  async clearTelegramConversation(identity: TelegramIdentity): Promise<void> { this.conversations.delete(`${identity.organizationId}:${identity.telegramChatId}:${identity.telegramUserId}`); }

  async claimReplay(input: ReplayClaimInput): Promise<ReplayClaimResult> {
    const key = `${input.source}:${input.replayId}`; const prior = this.claims.get(key);
    if (prior !== undefined) {
      if (prior.status === 'claimed' && prior.pendingStatus === null && prior.businessReceipt === null && new Date(prior.leaseExpiresAt) <= new Date(input.receivedAt)) {
        const reclaimed = { ...prior, claimToken: crypto.randomUUID(), leaseExpiresAt: input.leaseExpiresAt, attemptCount: prior.attemptCount + 1 };
        this.claims.set(key, reclaimed); return { kind: 'reclaimed', claim: clone(reclaimed) };
      }
      return { kind: 'duplicate', claim: clone(prior) };
    }
    const claim: WebhookReplayClaim = { ...input, identityBindingDigest: null, claimToken: crypto.randomUUID(), businessReceipt: null, status: 'claimed', pendingStatus: null, outcome: null, attemptCount: 1 };
    this.claims.set(key, claim); return { kind: 'created', claim: clone(claim) };
  }
  async bindReplayIdentity(source: string, replayId: string, bodyDigest: string, claimToken: string, organizationId: string, identityBindingDigest: string): Promise<WebhookReplayClaim> {
    const key = `${source}:${replayId}`; const prior = this.claims.get(key);
    if (prior === undefined || prior.bodyDigest !== bodyDigest || prior.claimToken !== claimToken || (prior.organizationId !== null && prior.organizationId !== organizationId) || (prior.identityBindingDigest !== null && prior.identityBindingDigest !== identityBindingDigest)) throw new Stage6AccessDeniedError();
    const next = { ...prior, organizationId, identityBindingDigest }; this.claims.set(key, next); return clone(next);
  }
  async prepareReplayOutcome(source: string, replayId: string, bodyDigest: string, claimToken: string, status: 'processed' | 'rejected', outcome: Readonly<Record<string, unknown>>): Promise<WebhookReplayClaim> {
    if (this.failNextReplayPrepare) {
      this.failNextReplayPrepare = false;
      const prior = this.claims.get(`${source}:${replayId}`);
      if (prior !== undefined && prior.bodyDigest === bodyDigest && prior.claimToken === claimToken && this.replayBusinessReceiptOnPrepareFailure !== null) {
        this.claims.set(`${source}:${replayId}`, { ...prior, businessReceipt: clone(this.replayBusinessReceiptOnPrepareFailure) });
        this.replayBusinessReceiptOnPrepareFailure = null;
      }
      throw new Error('Injected replay preparation failure');
    }
    const key = `${source}:${replayId}`; const prior = this.claims.get(key); if (prior === undefined || prior.bodyDigest !== bodyDigest || prior.claimToken !== claimToken) throw new Stage6AccessDeniedError();
    if (prior.status !== 'claimed') return clone(prior);
    if (prior.pendingStatus !== null && (prior.pendingStatus !== status || JSON.stringify(prior.outcome) !== JSON.stringify(outcome))) throw new Stage6AccessDeniedError();
    const next = { ...prior, pendingStatus: status, outcome: clone(outcome) }; this.claims.set(key, next); return clone(next);
  }
  async finalizeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string): Promise<WebhookReplayClaim> {
    if (this.failNextReplayFinalize) { this.failNextReplayFinalize = false; throw new Error('Injected replay finalization failure'); }
    const key = `${source}:${replayId}`; const prior = this.claims.get(key); if (prior === undefined || prior.bodyDigest !== bodyDigest || prior.claimToken !== claimToken || prior.pendingStatus === null || prior.outcome === null) throw new Stage6AccessDeniedError();
    if (prior.status !== 'claimed') return clone(prior);
    const next = { ...prior, status: prior.pendingStatus, pendingStatus: null }; this.claims.set(key, next); return clone(next);
  }
  async completeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> { void now; await this.prepareReplayOutcome(source, replayId, bodyDigest, claimToken, 'processed', outcome); return this.finalizeReplay(source, replayId, bodyDigest, claimToken); }
  async rejectReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim> { void now; await this.prepareReplayOutcome(source, replayId, bodyDigest, claimToken, 'rejected', outcome); return this.finalizeReplay(source, replayId, bodyDigest, claimToken); }

  private platform(actor: AuthorizedTenantActorContext): void { this.require(actor, STAGE6_PERMISSIONS.customerAdmin); }
  async listCustomers(actor: AuthorizedTenantActorContext): Promise<readonly CustomerProjection[]> { this.platform(actor); return this.snapshotCustomers(); }
  async readCustomer(actor: AuthorizedTenantActorContext, organizationId: string): Promise<CustomerProjection | null> { this.platform(actor); const value = this.customers.get(organizationId); return value === undefined ? null : clone(value); }
  async createCustomer(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly name: string; readonly slug: string; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly subscription?: Omit<SubscriptionRecord, 'organizationId' | 'version' | 'createdAt' | 'updatedAt'>; readonly now: string }): Promise<CustomerProjection> {
    this.platform(actor); if ([...this.customers.values()].some(({ customer }) => customer.slug === input.slug)) throw new Stage6ConflictError();
    const value: CustomerProjection = { customer: { id: input.organizationId, name: input.name, slug: input.slug, status: 'active', customerMetadata: input.customerMetadata, version: 1, createdAt: input.now, updatedAt: input.now }, subscription: input.subscription === undefined ? null : { organizationId: input.organizationId, ...input.subscription, version: 1, createdAt: input.now, updatedAt: input.now } };
    const auditLength = this.audits.length; try { this.audit(actor, 'customer.create', input.organizationId, input.organizationId, { name: input.name, slug: input.slug }); this.customers.set(input.organizationId, clone(value)); } catch (error) { this.audits.length = auditLength; throw error; } return clone(value);
  }
  async updateCustomer(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion: number; readonly name: string; readonly slug: string; readonly status: 'active' | 'inactive' | 'archived'; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly now: string }): Promise<CustomerProjection> {
    this.platform(actor); const prior = this.customers.get(input.organizationId); if (prior === undefined) throw new Stage6AccessDeniedError(); if (prior.customer.version !== input.expectedVersion) throw new Stage6ConflictError();
    const next = { ...prior, customer: { ...prior.customer, name: input.name, slug: input.slug, status: input.status, customerMetadata: input.customerMetadata, version: prior.customer.version + 1, updatedAt: input.now } }; const auditLength = this.audits.length;
    try { this.audit(actor, 'customer.update', input.organizationId, input.organizationId, { status: input.status }); this.customers.set(input.organizationId, clone(next)); } catch (error) { this.audits.length = auditLength; throw error; } return clone(next);
  }
  async updateSubscription(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion?: number; readonly plan: string; readonly status: SubscriptionRecord['status']; readonly periodStartsAt: string | null; readonly periodEndsAt: string | null; readonly now: string; readonly platform: boolean }): Promise<SubscriptionRecord> {
    if (input.platform) this.platform(actor); else if (actor.organizationId !== input.organizationId || !actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionManage)) throw new Stage6AccessDeniedError();
    const prior = this.customers.get(input.organizationId); if (prior === undefined) throw new Stage6AccessDeniedError(); if (prior.subscription !== null && input.expectedVersion !== undefined && prior.subscription.version !== input.expectedVersion) throw new Stage6ConflictError();
    const next: SubscriptionRecord = { organizationId: input.organizationId, plan: input.plan, status: input.status, periodStartsAt: input.periodStartsAt, periodEndsAt: input.periodEndsAt, version: (prior.subscription?.version ?? 0) + 1, createdAt: prior.subscription?.createdAt ?? input.now, updatedAt: input.now }; const auditLength = this.audits.length;
    try { this.audit(actor, 'subscription.update', input.organizationId, input.organizationId, { plan: input.plan, status: input.status }); this.customers.set(input.organizationId, { ...prior, subscription: next }); } catch (error) { this.audits.length = auditLength; throw error; } return clone(next);
  }
  async readSubscription(actor: AuthorizedTenantActorContext): Promise<SubscriptionRecord | null> { if (!actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionRead) && !actor.permissionSet.has(STAGE6_PERMISSIONS.subscriptionManage)) throw new Stage6AccessDeniedError(); return this.customers.get(actor.organizationId)?.subscription ?? null; }
  async recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<void> { this.audit(actor, action, null, actor.organizationId, { targetType, outcome: 'denied' }); }
}
