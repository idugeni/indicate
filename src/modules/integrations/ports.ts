import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type {
  ApiKeyRecord, CustomerProjection, StoredApiKey, SubscriptionRecord, TelegramConversation, TelegramIdentity, TelegramIdentityOption, TelegramInlineKeyboard, TelegramMappingRecord, WebhookReplayClaim,
} from '@/modules/integrations/models';
import type { RateLimitDecision, RateLimitPolicy } from '@/modules/integrations/models';
import type { ExactObjectAuthorization } from '@/integrations/storage/ports';
import type { HealthCheckPort } from '@/core/system/ports';

export class IntegrationsAccessDeniedError extends Error {}
export class IntegrationsConflictError extends Error {}

/** Langganan tidak dalam masa aktif tulis. Mutasi ditolak eksplisit (FORBIDDEN). */
export class IntegrationsSubscriptionInactiveError extends Error {
  constructor(
    readonly accessState: string,
  ) { super(`Subscription is not writable (state ${accessState}).`); }
}

export interface NewStoredApiKey {
  readonly id: string; readonly organizationId: string; readonly lookupId: string; readonly name: string;
  readonly salt: string; readonly verificationHash: string; readonly scopes: readonly string[];
  readonly predecessorId: string | null; readonly expiresAt: string | null; readonly regionId: string | null; readonly now: string;
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
  listTelegramIdentities(telegramUserId: string, telegramChatId: string): Promise<readonly TelegramIdentityOption[]>;
  listTelegramMappings(actor: AuthorizedTenantActorContext): Promise<readonly TelegramMappingRecord[]>;
  createTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly id: string; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly consentedAt: string | null; readonly consentTextVersion: string | null; readonly ipHash: string | null; readonly now: string }): Promise<TelegramMappingRecord>;
  updateTelegramMapping(actor: AuthorizedTenantActorContext, input: { readonly mappingId: string; readonly expectedVersion: number; readonly userId: string; readonly roleId: string; readonly telegramUserId: string; readonly telegramChatId: string; readonly status: TelegramMappingRecord['status']; readonly now: string }): Promise<TelegramMappingRecord>;
  readTelegramConversation(identity: TelegramIdentity): Promise<TelegramConversation | null>;
  saveTelegramConversation(identity: TelegramIdentity, conversation: TelegramConversation): Promise<void>;
  clearTelegramConversation(identity: TelegramIdentity): Promise<void>;
  enqueueOutboxMessage(input: { readonly organizationId: string | null; readonly chatId: string; readonly text: string; readonly now: string }): Promise<{ readonly id: string }>;
  claimOutboxMessages(now: string, limit: number): Promise<readonly TelegramOutboxRecord[]>;
  ackOutboxMessage(input: { readonly id: string; readonly ok: boolean; readonly retryAfterSeconds: number | null; readonly error: string | null; readonly now: string }): Promise<void>;
  listBroadcastTargets(actorId: string): Promise<readonly { readonly organizationId: string; readonly chatId: string }[]>;
  listOutboxMessages(actorId: string): Promise<readonly TelegramOutboxRecord[]>;

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
  updateSubscription(actor: AuthorizedTenantActorContext, input: { readonly organizationId: string; readonly expectedVersion?: number; readonly status: SubscriptionRecord['status']; readonly now: string; readonly platform: boolean }): Promise<SubscriptionRecord>;
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
  readonly keyboard?: TelegramInlineKeyboard;
}

export interface TelegramPhotoMessage {
  readonly chatId: string;
  readonly photoUrl: string;
  readonly caption: string;
  readonly keyboard?: TelegramInlineKeyboard;
}

export interface TelegramCallbackAnswer {
  readonly callbackId: string;
  readonly text?: string;
}

export interface TelegramEditMessage {
  readonly chatId: string;
  readonly messageId: string;
  readonly text: string;
  readonly keyboard?: TelegramInlineKeyboard;
}

export interface TelegramBotCommand {
  readonly command: string;
  readonly description: string;
}

/** Receipt of a newly sent Bot API message, used to track dashboard messages. */
export interface TelegramSentReceipt {
  readonly messageId: string;
}

export class TelegramRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number | null) {
    super('Telegram rate limited.');
  }
}

export interface TelegramOutboxRecord {
  readonly id: string;
  readonly organizationId: string | null;
  readonly chatId: string;
  readonly text: string;
  readonly status: 'pending' | 'sending' | 'sent' | 'dead';
  readonly attempts: number;
}

export interface TelegramPort extends HealthCheckPort {
  send(message: TelegramMessage): Promise<TelegramSentReceipt>;
  sendPhoto(message: TelegramPhotoMessage): Promise<TelegramSentReceipt>;
  answerCallback(answer: TelegramCallbackAnswer): Promise<void>;
  editMessage(message: TelegramEditMessage): Promise<void>;
  deleteMessage(message: { readonly chatId: string; readonly messageId: string }): Promise<void>;
  setMyCommands(commands: readonly TelegramBotCommand[]): Promise<void>;
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

export interface EmailMessage {
  readonly to: readonly string[];
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
  readonly from?: string;
  readonly idempotencyKey?: string;
}

export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export interface EmailContact {
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
}

/** Pengiriman email transaksional; null di komposisi saat Resend belum dikonfigurasi. */
export interface EmailPort {
  send(message: EmailMessage): Promise<{ readonly id: string }>;
  upsertContact(contact: EmailContact): Promise<{ readonly id: string }>;
}

export interface ResendWebhookHeaders {
  readonly id: string;
  readonly timestamp: string;
  readonly signature: string;
}

export interface ResendWebhookResult {
  readonly received: boolean;
  readonly type: string;
  readonly deduped: boolean;
}
