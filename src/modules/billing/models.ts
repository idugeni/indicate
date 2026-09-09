export interface InvoiceRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly currency: string;
  readonly status: 'paid' | 'voided';
  readonly paidAt: string;
  readonly billingNote: string | null;
  readonly voidedAt: string | null;
  readonly voidReason: string | null;
  readonly version: number;
  readonly createdAt: string;
}
