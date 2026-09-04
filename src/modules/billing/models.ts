export type BillingOrderStatus = 'pending_payment' | 'waiting_verification' | 'active' | 'rejected';

export interface PackageRecord {
  readonly id: string;
  readonly name: string;
  readonly plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  readonly priceIdr: number;
  readonly maxDomains: number | null;
  readonly maxSites: number | null;
  readonly maxMembers: number | null;
  readonly maxApiKeys: number | null;
  readonly active: boolean;
}

export interface OrderRecord {
  readonly id: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly plan: PackageRecord['plan'];
  readonly priceIdr: number;
  readonly status: BillingOrderStatus;
  readonly orgId: string | null;
  readonly proofUrl: string | null;
  readonly createdAt: string;
}

export interface PendingOrderRecord extends OrderRecord {
  readonly userEmail: string;
}

export interface ProofUploadAuthorization {
  readonly orderId: string;
  readonly objectKey: string;
  readonly url: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}
