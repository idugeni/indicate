import type { ActorContext } from '@/core/operation-context';
import type { ContentReportRecord, ErasureRequestRecord, LitigationHoldRecord, PrivacyRequestRecord } from '@/modules/moderation/models';
import { ModerationAccessDeniedError, ModerationConflictError, type ModerationRepository } from '@/modules/moderation/ports';
import { erasureRequestSchema, holdCreateSchema, holdReleaseSchema, privacyDecideSchema, privacySubmitSchema, reportDecideSchema, reportSubmitSchema } from '@/modules/moderation/schemas';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

export class ModerationService {
  constructor(
    private readonly repository: ModerationRepository,
    private readonly clock: { now(): Date } = { now: () => new Date() },
  ) {}

  private userActor(actor: ActorContext): actor is ActorContext & { readonly actorType: 'user'; readonly verifiedAuthUserId: string } {
    return actor.actorType === 'user';
  }

  private denied(requestId: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createNonDisclosingDenial(requestId) };
  }

  private failure(requestId: string): Result<never, PublicErrorEnvelope> {
    return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Moderation is temporarily unavailable.', requestId) };
  }

  private error(requestId: string, action: string, error: unknown): Result<never, PublicErrorEnvelope> {
    if (error instanceof ModerationAccessDeniedError) return this.denied(requestId);
    if (error instanceof ModerationConflictError) return { ok: false, error: createPublicError('CONFLICT', `Moderation ${action} could not be completed.`, requestId) };
    return this.failure(requestId);
  }

  /** Public intake (no session): validated here and bounded by edge rate limits. */
  async submitReport(raw: unknown, requestId: string): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    const parsed = reportSubmitSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the report fields.', requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.submitReport({
          orgId: parsed.data.orgId, siteId: parsed.data.siteId, articleId: parsed.data.articleId,
          contact: parsed.data.contact, category: parsed.data.category, details: parsed.data.details,
          articleUrl: parsed.data.articleUrl, requestId, now,
        }),
      };
    } catch (error) {
      return this.error(requestId, 'report.submit', error);
    }
  }

  async listReports(actor: ActorContext): Promise<Result<readonly ContentReportRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listReports(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'report.list', error);
    }
  }

  async decideReport(actor: ActorContext, raw: unknown): Promise<Result<{ readonly decided: true }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = reportDecideSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the decision fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      await this.repository.decideReport(actor, { reportId: parsed.data.reportId, actionTaken: parsed.data.actionTaken, note: parsed.data.note, requestId: actor.requestId, now });
      return { ok: true, value: Object.freeze({ decided: true as const }) };
    } catch (error) {
      return this.error(actor.requestId, 'report.decide', error);
    }
  }

  async submitPrivacyRequest(actor: ActorContext, raw: unknown): Promise<Result<{ readonly ticketNumber: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = privacySubmitSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the request fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.submitPrivacyRequest(actor, {
          orgId: parsed.data.orgId, requestType: parsed.data.requestType, details: parsed.data.details,
          requestId: actor.requestId, now,
        }),
      };
    } catch (error) {
      return this.error(actor.requestId, 'privacy.submit', error);
    }
  }

  async listPrivacyRequests(actor: ActorContext): Promise<Result<readonly PrivacyRequestRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listPrivacyRequests(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'privacy.list', error);
    }
  }

  async decidePrivacyRequest(actor: ActorContext, raw: unknown): Promise<Result<{ readonly decided: true }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = privacyDecideSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the decision fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      await this.repository.decidePrivacyRequest(actor, { ticket: parsed.data.ticket, status: parsed.data.status, note: parsed.data.note, requestId: actor.requestId, now });
      return { ok: true, value: Object.freeze({ decided: true as const }) };
    } catch (error) {
      return this.error(actor.requestId, 'privacy.decide', error);
    }
  }

  async listHolds(actor: ActorContext): Promise<Result<readonly LitigationHoldRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listHolds(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'hold.list', error);
    }
  }

  async createHold(actor: ActorContext, raw: unknown): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = holdCreateSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the hold fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.createHold(actor, {
          organizationId: parsed.data.organizationId, reason: parsed.data.reason,
          requestId: actor.requestId, now,
        }),
      };
    } catch (error) {
      return this.error(actor.requestId, 'hold.create', error);
    }
  }

  async releaseHold(actor: ActorContext, raw: unknown): Promise<Result<{ readonly released: true }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = holdReleaseSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the hold fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      await this.repository.releaseHold(actor, { holdId: parsed.data.holdId, requestId: actor.requestId, now });
      return { ok: true, value: Object.freeze({ released: true as const }) };
    } catch (error) {
      return this.error(actor.requestId, 'hold.release', error);
    }
  }

  async listErasureRequests(actor: ActorContext): Promise<Result<readonly ErasureRequestRecord[], PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    try {
      return { ok: true, value: await this.repository.listErasureRequests(actor) };
    } catch (error) {
      return this.error(actor.requestId, 'erasure.list', error);
    }
  }

  async createErasureRequest(actor: ActorContext, raw: unknown): Promise<Result<{ readonly id: string }, PublicErrorEnvelope>> {
    if (!this.userActor(actor)) return this.denied(actor.requestId);
    const parsed = erasureRequestSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: createPublicError('INVALID_INPUT', 'Please correct the erasure fields.', actor.requestId) };
    try {
      const now = this.clock.now().toISOString();
      return {
        ok: true,
        value: await this.repository.createErasureRequest(actor, {
          organizationId: parsed.data.organizationId, reason: parsed.data.reason,
          scheduledFor: parsed.data.scheduledFor, requestId: actor.requestId, now,
        }),
      };
    } catch (error) {
      return this.error(actor.requestId, 'erasure.request', error);
    }
  }
}
