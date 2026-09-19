import type { ActorContext } from '@/core/operation-context';
import type { InvoiceRecord } from '@/modules/billing/models';

export class BillingAccessDeniedError extends Error {}
export class BillingConflictError extends Error {}

export interface BillingRepository {
  readSubscriptionState(actor: ActorContext, organizationId: string): Promise<string>;
  createInvitation(actor: ActorContext, input: { readonly orgId: string; readonly roleId: string; readonly email: string; readonly tokenHash: string; readonly requestId: string; readonly now: string }): Promise<string>;
  redeemInvitation(actor: ActorContext, input: { readonly tokenHash: string; readonly requestId: string; readonly now: string }): Promise<string>;
  listInvoices(actor: ActorContext, organizationId: string): Promise<readonly InvoiceRecord[]>;
  createInvoice(actor: ActorContext, input: { readonly organizationId: string; readonly amountIdr: number; readonly paidAt: string; readonly billingNote: string | null; readonly paymentMethod: string; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord>;
  issueInvoice(actor: ActorContext, input: { readonly organizationId: string; readonly amountIdr: number; readonly dueAt: string; readonly billingNote: string | null; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord>;
  payInvoice(actor: ActorContext, input: { readonly invoiceId: string; readonly expectedVersion: number; readonly paidAt: string; readonly paymentMethod: string; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord>;
  voidInvoice(actor: ActorContext, input: { readonly invoiceId: string; readonly expectedVersion: number; readonly reason: string; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord>;
  reissueInvoice(actor: ActorContext, input: { readonly invoiceId: string; readonly expectedVersion: number; readonly reason: string | null; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord>;
}
