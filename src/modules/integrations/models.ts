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
