import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { Result } from '@/core/result';
import type { PublicErrorEnvelope } from '@/core/errors';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export interface ApiKeyRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly lookupId: string;
  readonly name: string;
  readonly scopes: readonly string[];
  readonly status: ApiKeyStatus;
  readonly predecessorId: string | null;
  readonly expiresAt: string | null;
  readonly lastUsedAt: string | null;
  readonly version: number;
  /** Optional region key; NULL means all regions. */
  readonly regionId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface StoredApiKey extends ApiKeyRecord {
  readonly salt: string;
  readonly verificationHash: string;
}
export function publicApiKeyRecord(value: StoredApiKey): ApiKeyRecord {
  return {
    id: value.id, organizationId: value.organizationId, lookupId: value.lookupId, name: value.name,
    scopes: value.scopes, status: value.status, predecessorId: value.predecessorId, expiresAt: value.expiresAt,
    lastUsedAt: value.lastUsedAt, version: value.version, regionId: value.regionId, createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
}
export interface IssuedApiKey { readonly key: ApiKeyRecord; readonly plaintext: string }

export interface TelegramMappingRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly telegramUserId: string;
  readonly telegramChatId: string;
  readonly status: 'active' | 'inactive' | 'archived';
  readonly version: number;
  readonly consentedAt: string | null;
  readonly consentTextVersion: string | null;
  readonly ipHash: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface TelegramIdentity {
  readonly mappingId: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly roleId: string;
  readonly telegramUserId: string;
  readonly telegramChatId: string;
  /** Membership region key; NULL means all regions. */
  readonly regionId: string | null;
  readonly permissions: ReadonlySet<string>;
}
export interface TelegramIdentityOption {
  readonly identity: TelegramIdentity;
  readonly organizationName: string;
}
export type TelegramConversationStep =
  | 'idle' | 'article_region' | 'article_title' | 'article_body' | 'article_source' | 'article_slug'
  | 'article_sites' | 'article_image' | 'publication_status' | 'publish_pick_site' | 'suggest_sites' | 'site_pick' | 'article_edit' | 'article_edit_confirm';
export interface TelegramConversation {
  readonly source: 'telegram';
  readonly chatId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly step: TelegramConversationStep;
  readonly data: Readonly<Record<string, unknown>>;
  readonly updatedAt: string;
  readonly expiresAt: string;
}
export interface TelegramInlineButton {
  readonly text: string;
  readonly data: string;
}
export type TelegramInlineKeyboard = readonly (readonly TelegramInlineButton[])[];
export interface TelegramUpdate {
  readonly updateId: string;
  readonly occurredAt: string;
  readonly userId: string;
  readonly chatId: string;
  readonly messageId: string | null;
  readonly text: string | null;
  readonly document: null | {
    readonly fileId: string;
    readonly filename: string;
    readonly mediaType: string;
    readonly sizeBytes: number;
  };
  readonly callback: null | {
    readonly id: string;
    readonly data: string | null;
  };
}
export interface TelegramWorkflowResult {
  readonly reply: string;
  readonly actor?: AuthorizedTenantActorContext;
  readonly businessResult?: unknown;
  readonly display?: {
    readonly photoUrl?: string;
    readonly keyboard?: TelegramInlineKeyboard;
    readonly editMessageId?: string;
  };
}
/** Outgoing chat reply queued during `handle()`; delivery is deferred to `after()` by the caller. */
export type TelegramPendingReply =
  | { readonly kind: 'text'; readonly chatId: string; readonly text: string; readonly keyboard?: TelegramInlineKeyboard }
  | { readonly kind: 'edit'; readonly chatId: string; readonly messageId: string; readonly text: string; readonly keyboard: TelegramInlineKeyboard }
  | { readonly kind: 'photo'; readonly chatId: string; readonly photoUrl: string; readonly caption: string; readonly keyboard?: TelegramInlineKeyboard }
  | { readonly kind: 'callback-answer'; readonly callbackId: string; readonly text?: string }
  | { readonly kind: 'delete'; readonly chatId: string; readonly messageId: string };
export interface TelegramHandleOutcome {
  readonly result: Result<TelegramWorkflowResult, PublicErrorEnvelope>;
  readonly pendingReplies: readonly TelegramPendingReply[];
  readonly identity: TelegramIdentity | null;
}

export interface WebhookReplayClaim {
  readonly source: string;
  readonly replayId: string;
  readonly organizationId: string | null;
  readonly bodyDigest: string;
  readonly identityBindingDigest: string | null;
  readonly claimToken: string;
  readonly businessReceipt: Readonly<Record<string, unknown>> | null;
  readonly status: 'claimed' | 'processed' | 'rejected';
  readonly pendingStatus: 'processed' | 'rejected' | null;
  readonly outcome: Readonly<Record<string, unknown>> | null;
  readonly receivedAt: string;
  readonly leaseExpiresAt: string;
  readonly attemptCount: number;
  readonly expiresAt: string;
}

export interface CustomerRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: 'active' | 'inactive' | 'archived';
  readonly customerMetadata: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface SubscriptionRecord {
  readonly organizationId: string;
  readonly status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface CustomerProjection { readonly customer: CustomerRecord; readonly subscription: SubscriptionRecord | null }

export interface RateLimitPolicy {
  readonly allowance: number;
  readonly windowSeconds: number;
  readonly failureMode: 'closed';
}
export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
  readonly resetAt: string;
}
