import type { ActorContext } from '@/core/operation-context';
import type { OrderRecord, PackageRecord, PendingOrderRecord } from '@/modules/billing/models';

export class BillingAccessDeniedError extends Error {}
export class BillingConflictError extends Error {}

export interface BillingRepository {
  listPackages(): Promise<readonly PackageRecord[]>;
  listMyOrders(actor: ActorContext): Promise<readonly OrderRecord[]>;
  createOrder(actor: ActorContext, input: { readonly packageId: string; readonly orgId: string | null; readonly requestId: string; readonly now: string }): Promise<OrderRecord>;
  submitOrderProof(actor: ActorContext, input: { readonly orderId: string; readonly proofUrl: string; readonly requestId: string; readonly now: string }): Promise<OrderRecord>;
  listPendingOrders(actor: ActorContext): Promise<readonly PendingOrderRecord[]>;
  decideOrder(actor: ActorContext, input: { readonly orderId: string; readonly approve: boolean; readonly orgId: string | null; readonly requestId: string; readonly now: string }): Promise<OrderRecord>;
  readOrderProofKey(actor: ActorContext, orderId: string): Promise<string | null>;
  readSubscriptionState(actor: ActorContext, organizationId: string): Promise<string>;
  createInvitation(actor: ActorContext, input: { readonly orgId: string; readonly roleId: string; readonly email: string; readonly tokenHash: string; readonly requestId: string; readonly now: string }): Promise<string>;
  redeemInvitation(actor: ActorContext, input: { readonly tokenHash: string; readonly requestId: string; readonly now: string }): Promise<string>;
}
