import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { ActorContext } from '@/core/operation-context';
import type { ActiveOrderRecord, BillingOrderStatus, EnterpriseLeadRecord, InvoiceRecord, OrderRecord, PackageRecord, PendingOrderRecord } from '@/modules/billing/models';
import { BillingAccessDeniedError, BillingConflictError, type BillingRepository } from '@/modules/billing/ports';
import { packages } from '@/data/schema';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const POSTGRES_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/;
function iso(value: Date | string): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError('Invalid billing timestamp.');
    return value.toISOString();
  }
  if (typeof value !== 'string' || !POSTGRES_TIMESTAMP.test(value)) throw new TypeError('Invalid billing timestamp.');
  return new Date(value).toISOString();
}
function deniedViolation(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === '42501' || code === 'P0001' || (error instanceof Error && /permission required|not found|membership required|organization required|package unavailable|active user required/i.test(error.message));
}

function userActor(actor: ActorContext): { readonly id: string; readonly verifiedAuthUserId: string } {
  if (actor.actorType !== 'user') throw new BillingAccessDeniedError();
  return { id: actor.actorId, verifiedAuthUserId: actor.verifiedAuthUserId };
}

export class DrizzleBillingRepository implements BillingRepository {
  constructor(private readonly database: Database) {}

  /** Tanpa tenant: mencakup order tanpa org; app.actor_id untuk cek platform. */
  private async billingContext(tx: Transaction, actor: ActorContext): Promise<void> {
    if (actor.actorType !== 'user') throw new BillingAccessDeniedError();
    await tx.execute(sql`SELECT set_config('app.actor_id', ${actor.actorId}, true)`);
    await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
  }

  async listPackages(): Promise<readonly PackageRecord[]> {
    const rows = await this.database.select().from(packages)
      .orderBy(sql`CASE ${packages.plan} WHEN 'starter' THEN 1 WHEN 'growth' THEN 2 WHEN 'pro' THEN 3 ELSE 4 END`);
    return rows.filter((row) => row.active).map((row) => Object.freeze({
      id: row.id, name: row.name, plan: row.plan as PackageRecord['plan'], priceIdr: row.priceIdr,
      maxDomains: row.maxDomains, maxSites: row.maxSites, maxMembers: row.maxMembers, maxApiKeys: row.maxApiKeys, active: row.active,
    }));
  }

  async listMyOrders(actor: ActorContext): Promise<readonly OrderRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{ id: string; package_name: string; plan: string; price_idr: number; status: BillingOrderStatus; org_id: string | null; terms_version: string | null; terms_accepted_at: Date | string | null; created_at: Date | string }>(sql`SELECT * FROM indicate_private.billing_order_list_mine(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, packageId: '', packageName: row.package_name, plan: row.plan as OrderRecord['plan'],
          priceIdr: row.price_idr, status: row.status, orgId: row.org_id, proofUrl: null,
          termsVersion: row.terms_version, termsAcceptedAt: row.terms_accepted_at === null ? null : iso(row.terms_accepted_at),
          createdAt: iso(row.created_at),
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  private async fetchOrder(tx: Transaction, orderId: string): Promise<OrderRecord> {
    const rows = await tx.execute<{ id: string; package_id: string; package_name: string; plan: string; price_idr: number; status: BillingOrderStatus; org_id: string | null; proof_url: string | null; terms_version: string | null; terms_accepted_at: Date | string | null; created_at: Date | string }>(sql`
      SELECT o.id, o.package_id, p.name AS package_name, p.plan, p.price_idr, o.status, o.org_id, o.proof_url, o.terms_version, o.terms_accepted_at, o.created_at
      FROM public.orders o JOIN public.packages p ON p.id = o.package_id WHERE o.id = ${orderId}::uuid LIMIT 1
    `);
    const row = rows[0];
    if (row === undefined) throw new BillingConflictError();
    return Object.freeze({
      id: row.id, packageId: row.package_id, packageName: row.package_name, plan: row.plan as OrderRecord['plan'],
      priceIdr: row.price_idr, status: row.status, orgId: row.org_id, proofUrl: row.proof_url,
      termsVersion: row.terms_version, termsAcceptedAt: row.terms_accepted_at === null ? null : iso(row.terms_accepted_at),
      createdAt: iso(row.created_at),
    });
  }

  async createOrder(actor: ActorContext, input: { readonly packageId: string; readonly orgId: string | null; readonly requestId: string; readonly now: string; readonly termsVersion: string }): Promise<OrderRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const created = await tx.execute<{ billing_order_create: string }>(sql`SELECT indicate_private.billing_order_create(${id}::uuid, ${input.requestId}, ${input.packageId}::uuid, ${input.orgId}::uuid, ${input.termsVersion}, ${input.now}::timestamptz) AS billing_order_create`);
        const orderId = created[0]?.billing_order_create;
        if (orderId === undefined) throw new BillingConflictError();
        return this.fetchOrder(tx, orderId);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async submitOrderProof(actor: ActorContext, input: { readonly orderId: string; readonly proofUrl: string; readonly requestId: string; readonly now: string }): Promise<OrderRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const updated = await tx.execute<{ billing_order_submit_proof: boolean }>(sql`SELECT indicate_private.billing_order_submit_proof(${id}::uuid, ${input.requestId}, ${input.orderId}::uuid, ${input.proofUrl}, ${input.now}::timestamptz) AS billing_order_submit_proof`);
        if (updated[0]?.billing_order_submit_proof !== true) throw new BillingConflictError();
        return this.fetchOrder(tx, input.orderId);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async listPendingOrders(actor: ActorContext): Promise<readonly PendingOrderRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{ id: string; user_email: string; org_id: string | null; package_name: string; plan: string; price_idr: number; proof_url: string | null; terms_version: string | null; terms_accepted_at: Date | string | null; created_at: Date | string }>(sql`SELECT * FROM indicate_private.billing_order_list_pending(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, packageId: '', packageName: row.package_name, plan: row.plan as PendingOrderRecord['plan'],
          priceIdr: row.price_idr, status: 'waiting_verification' as const, orgId: row.org_id, proofUrl: row.proof_url,
          termsVersion: row.terms_version, termsAcceptedAt: row.terms_accepted_at === null ? null : iso(row.terms_accepted_at),
          createdAt: iso(row.created_at), userEmail: row.user_email,
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async listEnterpriseLeads(actor: ActorContext): Promise<readonly EnterpriseLeadRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{ id: string; nama: string; email: string; kebutuhan: string; created_at: Date | string }>(sql`SELECT * FROM indicate_private.billing_lead_list(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, nama: row.nama, email: row.email, kebutuhan: row.kebutuhan, createdAt: iso(row.created_at),
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async submitLead(input: { readonly nama: string; readonly email: string; readonly kebutuhan: string; readonly consentedAt: string; readonly consentTextVersion: string; readonly ipHash: string }): Promise<{ readonly id: string }> {
    try {
      const rows = await this.database.execute<{ billing_lead_create: string }>(sql`SELECT indicate_private.billing_lead_create(${input.nama}, ${input.email}, ${input.kebutuhan}, ${input.consentedAt}::timestamptz, ${input.consentTextVersion}, ${input.ipHash}) AS billing_lead_create`);
      const id = rows[0]?.billing_lead_create;
      if (id === undefined) throw new BillingConflictError();
      return Object.freeze({ id });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async listInvoices(actor: ActorContext): Promise<readonly InvoiceRecord[]> {
    const { id } = userActor(actor);
    try {
      const rows = await this.database.execute<{ id: string; order_id: string; org_id: string | null; package_name: string | null; amount: number; paid_at: Date | string; created_at: Date | string }>(sql`SELECT * FROM indicate_private.invoice_list(${id}::uuid)`);
      return rows.map((row) => Object.freeze({
        id: row.id, orderId: row.order_id, orgId: row.org_id, packageName: row.package_name ?? 'Paket',
        amount: row.amount, paidAt: iso(row.paid_at), createdAt: iso(row.created_at),
      }));
    } catch (error) {
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async decideOrder(actor: ActorContext, input: { readonly orderId: string; readonly approve: boolean; readonly orgId: string | null; readonly requestId: string; readonly now: string }): Promise<OrderRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const updated = await tx.execute<{ billing_order_decide: boolean }>(sql`SELECT indicate_private.billing_order_decide(${id}::uuid, ${input.requestId}, ${input.orderId}::uuid, ${input.approve}, ${input.orgId}::uuid, ${input.now}::timestamptz) AS billing_order_decide`);
        if (updated[0]?.billing_order_decide !== true) throw new BillingConflictError();
        return this.fetchOrder(tx, input.orderId);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async listActiveOrders(actor: ActorContext): Promise<readonly ActiveOrderRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{ id: string; user_email: string; org_id: string | null; package_name: string; plan: string; price_idr: number; created_at: Date | string }>(sql`SELECT * FROM indicate_private.billing_order_list_active(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, packageName: row.package_name, plan: row.plan as ActiveOrderRecord['plan'],
          priceIdr: row.price_idr, status: 'active' as const, orgId: row.org_id,
          createdAt: iso(row.created_at), userEmail: row.user_email,
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async refundOrder(actor: ActorContext, input: { readonly orderId: string; readonly requestId: string; readonly now: string }): Promise<OrderRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const updated = await tx.execute<{ billing_order_refund: boolean }>(sql`SELECT indicate_private.billing_order_refund(${id}::uuid, ${input.requestId}, ${input.orderId}::uuid, ${input.now}::timestamptz) AS billing_order_refund`);
        if (updated[0]?.billing_order_refund !== true) throw new BillingConflictError();
        return this.fetchOrder(tx, input.orderId);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async readOrderProofKey(actor: ActorContext, orderId: string): Promise<string | null> {
    const { id } = userActor(actor);
    const isPlatform = actor.platformPermissionSet?.has('platform.super_admin') === true
      || actor.platformPermissionSet?.has('platform.customer.admin') === true;
    return this.database.transaction(async (tx) => {
      await this.billingContext(tx, actor);
      const rows = await tx.execute<{ proof_url: string | null; user_id: string }>(sql`SELECT proof_url, user_id FROM public.orders WHERE id = ${orderId}::uuid LIMIT 1`);
      const row = rows[0];
      if (row === undefined || row.proof_url === null) return null;
      if (row.user_id !== id && !isPlatform) throw new BillingAccessDeniedError();
      return row.proof_url.startsWith('r2:') ? row.proof_url.slice('r2:'.length) : null;
    });
  }

  async readSubscriptionState(actor: ActorContext, organizationId: string): Promise<string> {
    userActor(actor);
    return this.database.transaction(async (tx) => {
      await this.billingContext(tx, actor);
      const rows = await tx.execute<{ state: string }>(sql`SELECT indicate_private.subscription_access_state(${organizationId}::uuid) AS state`);
      return rows[0]?.state ?? 'none';
    });
  }

  async createInvitation(actor: ActorContext, input: { readonly orgId: string; readonly roleId: string; readonly email: string; readonly tokenHash: string; readonly requestId: string; readonly now: string }): Promise<string> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{ invite_create: string }>(sql`SELECT indicate_private.invite_create(${id}::uuid, ${input.requestId}, ${input.orgId}::uuid, ${input.roleId}::uuid, ${input.email}, ${input.tokenHash}, ${input.now}::timestamptz) AS invite_create`);
        const inviteId = rows[0]?.invite_create;
        if (inviteId === undefined) throw new BillingConflictError();
        return inviteId;
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async redeemInvitation(actor: ActorContext, input: { readonly tokenHash: string; readonly requestId: string; readonly now: string }): Promise<string> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{ invite_redeem: string }>(sql`SELECT indicate_private.invite_redeem(${id}::uuid, ${input.requestId}, ${input.tokenHash}, ${input.now}::timestamptz) AS invite_redeem`);
        const orgId = rows[0]?.invite_redeem;
        if (orgId === undefined) throw new BillingConflictError();
        return orgId;
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }
}
