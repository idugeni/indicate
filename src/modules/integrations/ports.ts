import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type {
  ApiKeyRecord, CustomerProjection, StoredApiKey, SubscriptionPlan, SubscriptionRecord, TelegramConversation, TelegramIdentity, TelegramMappingRecord, WebhookReplayClaim,
} from '@/modules/integrations/models';
import type { RateLimitDecision, RateLimitPolicy } from '@/modules/integrations/models';
import type { ExactObjectAuthorization } from '@/integrations/storage/ports';
import type { HealthCheckPort } from '@/core/system/ports';

export class IntegrationsAccessDeniedError extends Error {}
export class IntegrationsConflictError extends Error {}
export class IntegrationsQuotaExceededError extends Error {
  constructor(
    readonly resource: string,
    readonly limit: number,
  ) { super(`Subscription quota exceeded for ${resource} (limit ${limit}).`); }
}

/** Langganan tidak dalam masa aktif tulis. Mutasi ditolak eksplisit (FORBIDDEN). */
export class IntegrationsSubscriptionInactiveError extends Error {
  constructor(
    readonly accessState: string,
  ) { super(`Subscription is not writable (state ${accessState}).`); }
}

export interface NewStoredApiKey {
  readonly id: string; readonly organizationId: string; readonly lookupId: string; readonly name: string;
  readonly salt: string; readonly verificationHash: string; readonly scopes: readonly string[];
  readonly predecessorId: string | null; readonly expiresAt: string | null; readonly now: string;
}
export type ReplayClaimResult =
  | { readonly kind: 'created' | 'reclaimed'; readonly claim: WebhookReplayClaim }
  | { readonly kind: 'duplicate'; readonly claim: WebhookReplayClaim };

export interface ReplayClaimInput {
  readonly source: string;
  readonly replayId: string;
  readonly organizationId: string | null;
  readonly bodyDigest: string;
  readonly receivedAt: string;
  readonly leaseExpiresAt: string;
  readonly expiresAt: string;
}

export interface IntegrationsRepository {
  createApiKey(actor: AuthorizedTenantActorContext, input: NewStoredApiKey): Promise<ApiKeyRecord>;
  rotateApiKey(actor: AuthorizedTenantActorContext, priorId: string, expectedVersion: number, input: NewStoredApiKey): Promise<ApiKeyRecord>;
  revokeApiKey(actor: AuthorizedTenantActorContext, id: string, expectedVersion: number, now: string): Promise<ApiKeyRecord>;
  listApiKeys(actor: AuthorizedTenantActorContext): Promise<readonly ApiKeyRecord[]>;
  findApiKeyByLookupId(lookupId: string): Promise<StoredApiKey | null>;
  recordApiKeyUse(organizationId: string, id: string, now: string): Promise<void>;

  resolveTelegramIdentity(telegramUserId: string, telegramChatId: string): Promise<TelegramIdentity | null>;
  listTelegramMappings(actor: AuthorizedTenantActorContext): Promise<readonly TelegramMappingRecord[]>;
  createTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly id: string; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly now: string }): Promise<TelegramMappingRecord>;
  updateTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly mappingId: string; readonly expectedVersion: number; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly status: TelegramMappingRecord['status']; readonly now: string }): Promise<TelegramMappingRecord>;
  readTelegramConversation(identity: TelegramIdentity): Promise<TelegramConversation | null>;
  saveTelegramConversation(identity: TelegramIdentity, conversation: TelegramConversation): Promise<void>;
  clearTelegramConversation(identity: TelegramIdentity): Promise<void>;

  claimReplay(input: ReplayClaimInput): Promise<ReplayClaimResult>;
  bindReplayIdentity(source: string, replayId: string, bodyDigest: string, claimToken: string, organizationId: string, identityBindingDigest: string): Promise<WebhookReplayClaim>;
  prepareReplayOutcome(source: string, replayId: string, bodyDigest: string, claimToken: string, status: 'processed' | 'rejected', outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim>;
  finalizeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, now: string): Promise<WebhookReplayClaim>;
  completeReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim>;
  rejectReplay(source: string, replayId: string, bodyDigest: string, claimToken: string, outcome: Readonly<Record<string, unknown>>, now: string): Promise<WebhookReplayClaim>;

  listCustomers(platformActor: AuthorizedTenantActorContext): Promise<readonly CustomerProjection[]>;
  readCustomer(platformActor: AuthorizedTenantActorContext, organizationId: string): Promise<CustomerProjection | null>;
  createCustomer(platformActor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly subscriptionId?: never; readonly name: string; readonly slug: string; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly subscription?: Omit<SubscriptionRecord, 'organizationId' | 'version' | 'createdAt' | 'updatedAt'>; readonly now: string }): Promise<CustomerProjection>;
  updateCustomer(platformActor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion: number; readonly name: string; readonly slug: string; readonly status: 'active' | 'inactive' | 'archived'; readonly customerMetadata: Readonly<Record<string, unknown>>; readonly now: string }): Promise<CustomerProjection>;
  updateSubscription(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion?: number; readonly plan: SubscriptionPlan; readonly status: SubscriptionRecord['status']; readonly periodStartsAt: string | null; readonly periodEndsAt: string | null; readonly now: string; readonly platform: boolean }): Promise<SubscriptionRecord>;
  readSubscription(actor: AuthorizedTenantActorContext): Promise<SubscriptionRecord | null>;
  assignFirstAdminMember(platformActor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly userEmail: string; readonly now: string }): Promise<{ readonly userId: string; readonly roleId: string }>;
  recordDenial(actor: AuthorizedTenantActorContext, action: string, targetType: string, now: string): Promise<void>;
}

export interface RateLimitPort {
  consume(key: string, policy: RateLimitPolicy, now: Date): Promise<RateLimitDecision>;
}

export interface TelegramMessage {
  readonly chatId: string;
  readonly text: string;
}

export interface TelegramPort extends HealthCheckPort {
  send(message: TelegramMessage): Promise<void>;
}

export interface PreparedTelegramMedia {
  readonly bytes: ArrayBuffer;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface TelegramMediaTransferPort {
  prepare(input: { readonly fileId: string; readonly expectedSize: number }): Promise<PreparedTelegramMedia>;
  transfer(input: {
    readonly media: PreparedTelegramMedia;
    readonly authorization: ExactObjectAuthorization;
    readonly mediaType: string;
  }): Promise<void>;
}
