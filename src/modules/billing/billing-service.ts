import type { ActorContext } from '@/core/operation-context';
import type { ActiveOrderRecord, EnterpriseLeadRecord, OrderRecord, PackageRecord, PendingOrderRecord, ProofUploadAuthorization } from '@/modules/billing/models';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { IdentifierGenerator } from '@/core/system/ports';
import type { ObjectStoragePort } from '@/integrations/storage/ports';
import { BillingAccessDeniedError, BillingConflictError, type BillingRepository } from '@/modules/billing/ports';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { inviteCreateSchema, inviteRedeemSchema, leadSubmitSchema, orderCreateSchema, orderDecideSchema, orderRefundSchema, proofAuthorizeSchema, proofSubmitSchema, LEAD_CONSENT_TEXT_VERSION } from '@/modules/billing/schemas';
import { TERMS_VERSION } from '@/ui/site/marketing-content';

export interface ProofUploadPolicy {
  readonly allowedTypes: readonly string[];
  readonly maxBytes: number;
  readonly uploadTtlSeconds: number;
  readonly readTtlSeconds: number;
}

const EXTENSION: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export class BillingService {
  constructor(
    private readonly repository: BillingRepository,
    private readonly identifiers: IdentifierGenerator,
    private readonly storage: ObjectStoragePort,
    private readonly proofPolicy: ProofUploadPolicy,
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

  async packages(): Promise<Result<readonly PackageRecord[], PublicErrorEnvelope>> {
    try {
      return { ok: true, value: await this.repository.listPackages() };
    } catch {
      return this.failure(crypto.randomUUID());
    }
  }

  async myOrders(actor: ActorContext): Promise<Result<readonly OrderRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listMyOrders(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'order.list', error);
    }
  }

  async createOrder(actor: ActorContext, raw: unknown): Promise<Result<OrderRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = orderCreateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the order fields.', actor.requestId) };
    // Clickwrap: tolak versi Terms basi agar bukti persetujuan selalu mengikat versi berlaku.
    if (parsed.data.termsVersion !== TERMS_VERSION) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Please accept the current Terms version.', actor.requestId) };
    }
    try {
      const now = this.clock.now().toISOString();
      return { ok: true, value: await this.repository.createOrder(actor, { packageId: parsed.data.packageId, orgId: parsed.data.orgId, requestId: actor.requestId, now, termsVersion: parsed.data.termsVersion }) };
    } catch (error) {
      return this.error(actor.requestId, 'order.create', error);
    }
  }

  async authorizeProofUpload(actor: ActorContext, raw: unknown): Promise<Result<ProofUploadAuthorization, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = proofAuthorizeSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the proof upload fields.', actor.requestId) };
    if (!this.proofPolicy.allowedTypes.includes(parsed.data.contentType) || parsed.data.sizeBytes > this.proofPolicy.maxBytes) {
      return { ok: false, error: createPublicError('INVALID_INPUT', 'Unsupported proof file.', actor.requestId) };
    }
    try {
      const orders = await this.repository.listMyOrders(actor);
      const order = orders.find(({ id }) => id === parsed.data.orderId);
      if (order === undefined || order.status !== 'pending_payment') return this.denied(actor.requestId);
      const key = `proofs/${actor.actorId}/${order.id}.${EXTENSION[parsed.data.contentType]}`;
      const authorization = await this.storage.authorizeExactPut(key, parsed.data.contentType, parsed.data.checksumSha256, this.proofPolicy.uploadTtlSeconds);
      return {
        ok: true,
        value: Object.freeze({
          orderId: order.id, objectKey: key, url: authorization.url,
          requiredHeaders: authorization.requiredHeaders, expiresAt: authorization.expiresAt.toISOString(),
        }),
      };
    } catch (error) {
      return this.error(actor.requestId, 'proof.authorize', error);
    }
  }

  async submitProof(actor: ActorContext, raw: unknown): Promise<Result<OrderRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = proofSubmitSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the proof fields.', actor.requestId) };
    try {
      const orders = await this.repository.listMyOrders(actor);
      const order = orders.find(({ id }) => id === parsed.data.orderId);
      if (order === undefined || order.status !== 'pending_payment') return this.denied(actor.requestId);
      const key = `proofs/${actor.actorId}/${order.id}.${EXTENSION[parsed.data.contentType]}`;
      const metadata = await this.storage.headExact(key);
      if (metadata === null || metadata.contentType !== parsed.data.contentType || metadata.contentLength !== parsed.data.sizeBytes) {
        return { ok: false, error: createPublicError('INVALID_INPUT', 'Uploaded proof does not match the authorization.', actor.requestId) };
      }
      const now = this.clock.now().toISOString();
      return { ok: true, value: await this.repository.submitOrderProof(actor, { orderId: order.id, proofUrl: `r2:${key}`, requestId: actor.requestId, now }) };
    } catch (error) {
      return this.error(actor.requestId, 'proof.submit', error);
    }
  }

  async pendingOrders(actor: ActorContext): Promise<Result<readonly PendingOrderRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listPendingOrders(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'order.pending', error);
    }
  }

  async enterpriseLeads(actor: ActorContext): Promise<Result<readonly EnterpriseLeadRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listEnterpriseLeads(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'lead.list', error);
    }
  }

  async decideOrder(actor: ActorContext, raw: unknown): Promise<Result<OrderRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    const parsed = orderDecideSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the decision fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return { ok: true, value: await this.repository.decideOrder(actor, { orderId: parsed.data.orderId, approve: parsed.data.approve, orgId: parsed.data.orgId, requestId: actor.requestId, now }) };
    } catch (error) {
      return this.error(actor.requestId, 'order.decide', error);
    }
  }

  async activeOrders(actor: ActorContext): Promise<Result<readonly ActiveOrderRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listActiveOrders(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'order.active', error);
    }
  }

  async refundOrder(actor: ActorContext, raw: unknown): Promise<Result<OrderRecord, PublicErrorEnvelope>> {
    if (!this.userActor(actor) || !this.platform(actor)) return this.denied(actor.requestId);
    const parsed = orderRefundSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the refund fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return { ok: true, value: await this.repository.refundOrder(actor, { orderId: parsed.data.orderId, requestId: actor.requestId, now }) };
    } catch (error) {
      return this.error(actor.requestId, 'order.refund', error);
    }
  }

  async proofViewUrl(actor: ActorContext, orderId: string): Promise<Result<{ readonly url: string; readonly expiresAt: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      const key = await this.repository.readOrderProofKey(actor, orderId);
      if (key === null) return this.denied(actor.requestId);
      const authorization = await this.storage.authorizeExactGet(key, this.proofPolicy.readTtlSeconds);
      return { ok: true, value: Object.freeze({ url: authorization.url, expiresAt: authorization.expiresAt.toISOString() }) };
    } catch (error) {
      return this.error(actor.requestId, 'proof.view', error);
    }
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

  /** Intake lead enterprise publik (tanpa sesi): consent wajib dicentang di formulir. */
  async submitLead(raw: unknown, requestId: string, ipHash: string): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const parsed = leadSubmitSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the lead fields.', requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.submitLead({
          nama: parsed.data.nama, email: parsed.data.email, kebutuhan: parsed.data.kebutuhan,
          consentedAt: now, consentTextVersion: LEAD_CONSENT_TEXT_VERSION, ipHash,
        }),
      };
    } catch (error) {
      return this.error(requestId, 'lead.submit', error);
    }
  }
}
