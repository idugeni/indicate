import type { ActorContext } from '@/core/operation-context';
import type { InvoiceRecord } from '@/modules/billing/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { BillingAccessDeniedError, BillingConflictError, type BillingRepository } from '@/modules/billing/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { inviteCreateSchema, inviteRedeemSchema, invoiceCreateSchema, invoiceVoidSchema } from '@/modules/billing/schemas';

export class BillingService {
  constructor(
    private readonly repository: BillingRepository,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  private userActor(actor: ActorContext): actor is ActorContext & { readonly actorType: 'user'; readonly verifiedAuthUserId: string } {
    return actor.actorType === 'user';
  }

  private denied(requestId: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createNonDisclosingDenial(requestId) };
  }

  private failure(requestId: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Billing is temporarily unavailable.', requestId) };
  }

  private platform(actor: ActorContext): boolean {
    return actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) === true
      || actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.customerAdmin) === true;
  }

  private error(requestId: string, action: string, error: unknown): Result<never, PublicErrorEnvelope> {
    if (error instanceof BillingAccessDeniedError) return this.denied(requestId);
    if (error instanceof BillingConflictError) return { ok: false, error: createPublicError('CONFLICT', `Billing ${action} could not be completed.`, requestId) };
    return this.failure(requestId);
  }

  async subscriptionState(actor: ActorContext, organizationId: string): Promise<Result<{ readonly state: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: Object.freeze({ state: await this.repository.readSubscriptionState(actor, organizationId) }) };
    } catch (error) {
      return this.error(actor.requestId, 'subscription.state', error);
    }
  }

  async createInvitation(actor: ActorContext, raw: unknown): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    const parsed = inviteCreateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the invitation fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return { ok: true, value: Object.freeze({ id: await this.repository.createInvitation(actor, { ...parsed.data, requestId: actor.requestId, now }) }) };
    } catch (error) {
      return this.error(actor.requestId, 'invite.create', error);
    }
  }

  /** Client-hashed invite token (orgId + email + secret); raw secret never reaches the server. */
  static invitationTokenHash(orgId: string, email: string, secret: string): Promise<string> {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${orgId}:${email.toLowerCase()}:${secret}`)).then((digest) =>
      [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''),
    );
  }

  async redeemInvitation(actor: ActorContext, raw: unknown): Promise<Result<{ readonly organizationId: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = inviteRedeemSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the invitation token.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return { ok: true, value: Object.freeze({ organizationId: await this.repository.redeemInvitation(actor, { ...parsed.data, requestId: actor.requestId, now }) }) };
    } catch (error) {
      return this.error(actor.requestId, 'invite.redeem', error);
    }
  }

  async listInvoices(actor: ActorContext, organizationId: string): Promise<Result<readonly InvoiceRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listInvoices(actor, organizationId) };
    } catch (error) {
      return this.error(actor.requestId, 'invoice.list', error);
    }
  }

  async createInvoice(actor: ActorContext, raw: unknown): Promise<Result<InvoiceRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    const parsed = invoiceCreateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the invoice fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.createInvoice(actor, {
          organizationId: parsed.data.organizationId,
          amountIdr: parsed.data.amountIdr,
          paidAt: parsed.data.paidAt,
          billingNote: parsed.data.billingNote ?? null,
          requestId: actor.requestId,
          now,
        }),
      };
    } catch (error) {
      return this.error(actor.requestId, 'invoice.create', error);
    }
  }

  async voidInvoice(actor: ActorContext, raw: unknown): Promise<Result<InvoiceRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    const parsed = invoiceVoidSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the void fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.voidInvoice(actor, {
          invoiceId: parsed.data.invoiceId,
          expectedVersion: parsed.data.expectedVersion,
          reason: parsed.data.reason,
          requestId: actor.requestId,
          now,
        }),
      };
    } catch (error) {
      return this.error(actor.requestId, 'invoice.void', error);
    }
  }

  async invoiceDetail(actor: ActorContext, organizationId: string, invoiceId: string): Promise<Result<InvoiceRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      const rows = await this.repository.listInvoices(actor, organizationId);
      const row = rows.find((candidate) => candidate.id === invoiceId);
      if (row === undefined) return this.denied(actor.requestId);
      return { ok: true, value: row };
    } catch (error) {
      return this.error(actor.requestId, 'invoice.detail', error);
    }
  }
}
