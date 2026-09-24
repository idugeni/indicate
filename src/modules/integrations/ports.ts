import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type {
  ApiKeyRecord, CustomerProjection, StoredApiKey, SubscriptionRecord, WebhookReplayClaim,
} from '@/modules/integrations/models';
import type { RateLimitDecision, RateLimitPolicy } from '@/modules/integrations/models';

export class IntegrationsAccessDeniedError extends Error {}
export class IntegrationsConflictError extends Error {}

/** Subscription is outside its writable active period. Mutations are explicitly rejected (FORBIDDEN). */
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

/** Transactional email delivery; null in compositions while Resend is unconfigured. */
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
