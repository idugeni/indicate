export type BillingOrderStatus = 'pending_payment' | 'waiting_verification' | 'active' | 'rejected' | 'refunded';

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
  /** NULL pada order pra-clickwrap (dibuat sebelum migrasi v68). */
  readonly termsVersion: string | null;
  readonly termsAcceptedAt: string | null;
  readonly createdAt: string;
}

export interface PendingOrderRecord extends OrderRecord {
  readonly userEmail: string;
}

export interface ActiveOrderRecord {
  readonly id: string;
  readonly packageName: string;
  readonly plan: PackageRecord['plan'];
  readonly priceIdr: number;
  readonly status: 'active';
  readonly orgId: string | null;
  readonly userEmail: string;
  readonly createdAt: string;
}

export interface EnterpriseLeadRecord {
  readonly id: string;
  readonly nama: string;
  readonly email: string;
  readonly kebutuhan: string;
  readonly createdAt: string;
}

export interface InvoiceRecord {
  readonly id: string;
  readonly orderId: string;
  readonly orgId: string | null;
  readonly packageName: string;
  readonly amount: number;
  readonly paidAt: string;
  readonly createdAt: string;
}

export interface ProofUploadAuthorization {
  readonly orderId: string;
  readonly objectKey: string;
  readonly url: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly expiresAt: string;
}
