import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { ActorContext } from '@/core/operation-context';
import type { InvoiceRecord } from '@/modules/billing/models';
import { BillingAccessDeniedError, BillingConflictError, type BillingRepository } from '@/modules/billing/ports';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function deniedViolation(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === '42501' || code === 'P0001' || (error instanceof Error && /permission required|not found|membership required|organization required|active user required/i.test(error.message));
}

function userActor(actor: ActorContext): { readonly id: string; readonly verifiedAuthUserId: string } {
  if (actor.actorType !== 'user') throw new BillingAccessDeniedError();
  return { id: actor.actorId, verifiedAuthUserId: actor.verifiedAuthUserId };
}

export class DrizzleBillingRepository implements BillingRepository {
  constructor(private readonly database: Database) {}

  /** Tanpa tenant: app.actor_id untuk cek platform. */
  private async billingContext(tx: Transaction, actor: ActorContext): Promise<void> {
    if (actor.actorType !== 'user') throw new BillingAccessDeniedError();
    await tx.execute(sql`SELECT set_config('app.actor_id', ${actor.actorId}, true)`);
    await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
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

  private static toInvoiceRecord(row: {
    id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
    status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
    voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
  }): InvoiceRecord {
    const iso = (value: Date | string): string => (value instanceof Date ? value : new Date(value)).toISOString();
    const optionalIso = (value: Date | string | null): string | null => (value === null ? null : iso(value));
    return Object.freeze({
      id: row.id, organizationId: row.organization_id, organizationName: row.organization_name, number: row.number, amountIdr: row.amount_idr,
      currency: row.currency, status: row.status, paidAt: optionalIso(row.paid_at), dueAt: optionalIso(row.due_at), billingNote: row.billing_note, paymentMethod: row.payment_method,
      voidedAt: row.voided_at === null ? null : iso(row.voided_at), voidReason: row.void_reason,
      version: row.version, createdAt: iso(row.created_at),
    });
  }

  async listInvoices(actor: ActorContext, organizationId: string): Promise<readonly InvoiceRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const rows = await tx.execute<{
          id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
          status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
          voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
        }>(sql`SELECT * FROM indicate_private.invoice_list_for_org(${id}::uuid, ${organizationId}::uuid)`);
        return rows.map((row) => DrizzleBillingRepository.toInvoiceRecord(row));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async createInvoice(actor: ActorContext, input: { readonly organizationId: string; readonly amountIdr: number; readonly paidAt: string; readonly billingNote: string | null; readonly paymentMethod: string; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const created = await tx.execute<{ invoice_create: string }>(sql`SELECT indicate_private.invoice_create(${id}::uuid, ${input.requestId}, ${input.organizationId}::uuid, ${input.amountIdr}, ${input.paidAt}::timestamptz, ${input.billingNote}, ${input.now}::timestamptz, ${input.paymentMethod}) AS invoice_create`);
        const invoiceId = created[0]?.invoice_create;
        if (invoiceId === undefined) throw new BillingConflictError();
        const rows = await tx.execute<{
          id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
          status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
          voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
        }>(sql`SELECT * FROM indicate_private.invoice_list_for_org(${id}::uuid, ${input.organizationId}::uuid)`);
        const row = rows.find((candidate) => candidate.id === invoiceId);
        if (row === undefined) throw new BillingConflictError();
        return DrizzleBillingRepository.toInvoiceRecord(row);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async issueInvoice(actor: ActorContext, input: { readonly organizationId: string; readonly amountIdr: number; readonly dueAt: string; readonly billingNote: string | null; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const created = await tx.execute<{ invoice_issue: string }>(sql`SELECT indicate_private.invoice_issue(${id}::uuid, ${input.requestId}, ${input.organizationId}::uuid, ${input.amountIdr}, ${input.dueAt}::timestamptz, ${input.billingNote}, ${input.now}::timestamptz) AS invoice_issue`);
        const invoiceId = created[0]?.invoice_issue;
        if (invoiceId === undefined) throw new BillingConflictError();
        const rows = await tx.execute<{
          id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
          status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
          voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
        }>(sql`SELECT * FROM indicate_private.invoice_list_for_org(${id}::uuid, ${input.organizationId}::uuid)`);
        const row = rows.find((candidate) => candidate.id === invoiceId);
        if (row === undefined) throw new BillingConflictError();
        return DrizzleBillingRepository.toInvoiceRecord(row);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async payInvoice(actor: ActorContext, input: { readonly invoiceId: string; readonly expectedVersion: number; readonly paidAt: string; readonly paymentMethod: string; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const paid = await tx.execute<{ invoice_pay: string | null }>(sql`SELECT indicate_private.invoice_pay(${id}::uuid, ${input.requestId}, ${input.invoiceId}::uuid, ${input.expectedVersion}, ${input.paidAt}::timestamptz, ${input.paymentMethod}, ${input.now}::timestamptz) AS invoice_pay`);
        const invoiceId = paid[0]?.invoice_pay;
        if (invoiceId === null || invoiceId === undefined) throw new BillingConflictError();
        const rows = await tx.execute<{
          id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
          status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
          voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
        }>(sql`SELECT i.id, i.organization_id, o.name AS organization_name, i.number, i.amount_idr, i.currency, i.status, i.paid_at, i.due_at, i.billing_note, i.payment_method, i.voided_at, i.void_reason, i.version, i.created_at FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id WHERE i.id = ${invoiceId}::uuid`);
        const row = rows[0];
        if (row === undefined) throw new BillingConflictError();
        return DrizzleBillingRepository.toInvoiceRecord(row);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  async voidInvoice(actor: ActorContext, input: { readonly invoiceId: string; readonly expectedVersion: number; readonly reason: string; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const updated = await tx.execute<{ invoice_void: boolean }>(sql`SELECT indicate_private.invoice_void(${id}::uuid, ${input.requestId}, ${input.invoiceId}::uuid, ${input.expectedVersion}, ${input.reason}, ${input.now}::timestamptz) AS invoice_void`);
        if (updated[0]?.invoice_void !== true) throw new BillingConflictError();
        const rows = await tx.execute<{
          id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
          status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
          voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
        }>(sql`SELECT i.*, o.name AS organization_name FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id WHERE i.id = ${input.invoiceId}::uuid LIMIT 1`);
        const row = rows[0];
        if (row === undefined) throw new BillingConflictError();
        return DrizzleBillingRepository.toInvoiceRecord(row);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }

  /**
   * Issue a replacement paid invoice for a voided one.
   *
   * @param actor - Platform admin actor.
   * @param input - Source invoice id, expected version, reason, and request metadata.
   * @returns Replacement invoice record.
   */
  async reissueInvoice(actor: ActorContext, input: { readonly invoiceId: string; readonly expectedVersion: number; readonly reason: string | null; readonly requestId: string; readonly now: string }): Promise<InvoiceRecord> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.billingContext(tx, actor);
        const created = await tx.execute<{ invoice_reissue: string }>(sql`SELECT indicate_private.invoice_reissue(${id}::uuid, ${input.requestId}, ${input.invoiceId}::uuid, ${input.expectedVersion}, ${input.reason}, ${input.now}::timestamptz) AS invoice_reissue`);
        const invoiceId = created[0]?.invoice_reissue;
        if (invoiceId === undefined) throw new BillingConflictError();
        const rows = await tx.execute<{
          id: string; organization_id: string; organization_name: string; number: string; amount_idr: number; currency: string;
          status: InvoiceRecord['status']; paid_at: Date | string | null; due_at: Date | string | null; billing_note: string | null; payment_method: string;
          voided_at: Date | string | null; void_reason: string | null; version: number; created_at: Date | string;
        }>(sql`SELECT i.*, o.name AS organization_name FROM public.invoices i JOIN public.organizations o ON o.id = i.organization_id WHERE i.id = ${invoiceId}::uuid LIMIT 1`);
        const row = rows[0];
        if (row === undefined) throw new BillingConflictError();
        return DrizzleBillingRepository.toInvoiceRecord(row);
      });
    } catch (error) {
      if (error instanceof BillingConflictError) throw error;
      if (deniedViolation(error)) throw new BillingAccessDeniedError();
      throw error;
    }
  }
}
