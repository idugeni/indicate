export interface InvoiceRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly organizationName: string;
  readonly number: string;
  readonly amountIdr: number;
  readonly currency: string;
  readonly status: 'paid' | 'voided' | 'unpaid';
  readonly paidAt: string | null;
  readonly dueAt: string | null;
  readonly billingNote: string | null;
  readonly paymentMethod: string;
  readonly voidedAt: string | null;
  readonly voidReason: string | null;
  readonly version: number;
  readonly createdAt: string;
}
