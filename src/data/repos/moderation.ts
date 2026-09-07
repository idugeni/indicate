import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type { ActorContext } from '@/core/operation-context';
import type { ContentReportRecord, ErasureRequestRecord, LitigationHoldRecord, PrivacyRequestRecord } from '@/modules/moderation/models';
import { ModerationAccessDeniedError, ModerationConflictError, type ModerationRepository, type PrivacySubmitInput, type ReportSubmitInput } from '@/modules/moderation/ports';
import type * as schema from '@/data/schema';

type Database = PostgresJsDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

const POSTGRES_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2})(?::?(\d{2}))?)$/;
function iso(value: Date | string): string {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new TypeError('Invalid moderation timestamp.');
    return value.toISOString();
  }
  if (typeof value !== 'string' || !POSTGRES_TIMESTAMP.test(value)) throw new TypeError('Invalid moderation timestamp.');
  return new Date(value).toISOString();
}
function deniedViolation(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === '42501' || code === 'P0001' || (error instanceof Error && /permission required|not found|membership required|organization required|active user required|unknown target|report fields invalid|request fields invalid|request status invalid|decision note invalid/i.test(error.message));
}

function userActor(actor: ActorContext): { readonly id: string; readonly verifiedAuthUserId: string } {
  if (actor.actorType !== 'user') throw new ModerationAccessDeniedError();
  return { id: actor.actorId, verifiedAuthUserId: actor.verifiedAuthUserId };
}

export class DrizzleModerationRepository implements ModerationRepository {
  constructor(private readonly database: Database) {}

  private async moderationContext(tx: Transaction, actor: ActorContext): Promise<void> {
    if (actor.actorType !== 'user') throw new ModerationAccessDeniedError();
    await tx.execute(sql`SELECT set_config('app.actor_id', ${actor.actorId}, true)`);
    await tx.execute(sql`SELECT indicate_private.set_verified_user_context(${actor.verifiedAuthUserId}::uuid)`);
  }

  async submitReport(input: ReportSubmitInput): Promise<{ readonly id: string }> {
    try {
      const rows = await this.database.execute<{ content_report_submit: string }>(sql`SELECT indicate_private.content_report_submit(${input.requestId}, ${input.orgId}::uuid, ${input.siteId}::uuid, ${input.articleId}::uuid, ${input.contact}, ${input.category}, ${input.details}, ${input.articleUrl}, ${input.now}::timestamptz) AS content_report_submit`);
      const id = rows[0]?.content_report_submit;
      if (id === undefined) throw new ModerationConflictError();
      return Object.freeze({ id });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async listReports(actor: ActorContext): Promise<readonly ContentReportRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ id: string; org_id: string; site_id: string | null; article_id: string | null; reporter_contact: string; reason_category: string; details: string; article_url: string | null; status: ContentReportRecord['status']; created_at: Date | string }>(sql`SELECT * FROM indicate_private.content_report_list(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, orgId: row.org_id, siteId: row.site_id, articleId: row.article_id,
          reporterContact: row.reporter_contact, reasonCategory: row.reason_category as ContentReportRecord['reasonCategory'],
          details: row.details, articleUrl: row.article_url, status: row.status, createdAt: iso(row.created_at),
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async decideReport(actor: ActorContext, input: { readonly reportId: string; readonly actionTaken: boolean; readonly note: string | null; readonly requestId: string; readonly now: string }): Promise<void> {
    const { id } = userActor(actor);
    try {
      await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const updated = await tx.execute<{ content_report_decide: boolean }>(sql`SELECT indicate_private.content_report_decide(${id}::uuid, ${input.requestId}, ${input.reportId}::uuid, ${input.actionTaken}, ${input.note}, ${input.now}::timestamptz) AS content_report_decide`);
        if (updated[0]?.content_report_decide !== true) throw new ModerationConflictError();
      });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async submitPrivacyRequest(actor: ActorContext, input: PrivacySubmitInput): Promise<{ readonly ticketNumber: string }> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ privacy_request_submit: string }>(sql`SELECT indicate_private.privacy_request_submit(${id}::uuid, ${input.requestId}, ${input.orgId}::uuid, ${input.requestType}, ${input.details}, ${input.now}::timestamptz) AS privacy_request_submit`);
        const ticketNumber = rows[0]?.privacy_request_submit;
        if (ticketNumber === undefined) throw new ModerationConflictError();
        return Object.freeze({ ticketNumber });
      });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async listPrivacyRequests(actor: ActorContext): Promise<readonly PrivacyRequestRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ id: string; ticket_number: string; org_id: string; request_type: string; details: string; status: PrivacyRequestRecord['status']; created_at: Date | string }>(sql`SELECT * FROM indicate_private.privacy_request_list(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, ticketNumber: row.ticket_number, orgId: row.org_id,
          requestType: row.request_type as PrivacyRequestRecord['requestType'],
          details: row.details, status: row.status, createdAt: iso(row.created_at),
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }
  async decidePrivacyRequest(actor: ActorContext, input: { readonly ticket: string; readonly status: 'in_progress' | 'fulfilled' | 'rejected'; readonly note: string | null; readonly requestId: string; readonly now: string }): Promise<void> {
    const { id } = userActor(actor);
    try {
      await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const updated = await tx.execute<{ privacy_request_decide: boolean }>(sql`SELECT indicate_private.privacy_request_decide(${id}::uuid, ${input.requestId}, ${input.ticket}, ${input.status}, ${input.note}, ${input.now}::timestamptz) AS privacy_request_decide`);
        if (updated[0]?.privacy_request_decide !== true) throw new ModerationConflictError();
        return undefined;
      });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async listHolds(actor: ActorContext): Promise<readonly LitigationHoldRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ id: string; organization_id: string; reason: string; held_by: string; created_at: Date | string; released_at: Date | string | null; released_by: string | null }>(sql`SELECT * FROM indicate_private.hold_list(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, orgId: row.organization_id, reason: row.reason, heldBy: row.held_by,
          createdAt: iso(row.created_at),
          releasedAt: row.released_at === null ? null : iso(row.released_at),
          releasedBy: row.released_by,
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async createHold(actor: ActorContext, input: { readonly organizationId: string; readonly reason: string; readonly requestId: string; readonly now: string }): Promise<{ readonly id: string }> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ hold_create: string }>(sql`SELECT indicate_private.hold_create(${id}::uuid, ${input.requestId}, ${input.organizationId}::uuid, ${input.reason}, ${input.now}::timestamptz) AS hold_create`);
        const holdId = rows[0]?.hold_create;
        if (holdId === undefined) throw new ModerationConflictError();
        return Object.freeze({ id: holdId });
      });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if ((error as { code?: unknown })?.code === '23505') throw new ModerationConflictError();
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async releaseHold(actor: ActorContext, input: { readonly holdId: string; readonly requestId: string; readonly now: string }): Promise<void> {
    const { id } = userActor(actor);
    try {
      await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const updated = await tx.execute<{ hold_release: boolean }>(sql`SELECT indicate_private.hold_release(${id}::uuid, ${input.requestId}, ${input.holdId}::uuid, ${input.now}::timestamptz) AS hold_release`);
        if (updated[0]?.hold_release !== true) throw new ModerationConflictError();
        return undefined;
      });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async listErasureRequests(actor: ActorContext): Promise<readonly ErasureRequestRecord[]> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ id: string; organization_id: string; requested_by: string; reason: string; status: ErasureRequestRecord['status']; scheduled_for: Date | string; attempts: number; completed_at: Date | string | null; created_at: Date | string }>(sql`SELECT * FROM indicate_private.erasure_request_list(${id}::uuid)`);
        return rows.map((row) => Object.freeze({
          id: row.id, orgId: row.organization_id, requestedBy: row.requested_by, reason: row.reason,
          status: row.status, scheduledFor: iso(row.scheduled_for), attempts: row.attempts,
          completedAt: row.completed_at === null ? null : iso(row.completed_at),
          createdAt: iso(row.created_at),
        }));
      });
    } catch (error) {
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }

  async createErasureRequest(actor: ActorContext, input: { readonly organizationId: string; readonly reason: string; readonly scheduledFor: string; readonly requestId: string; readonly now: string }): Promise<{ readonly id: string }> {
    const { id } = userActor(actor);
    try {
      return await this.database.transaction(async (tx) => {
        await this.moderationContext(tx, actor);
        const rows = await tx.execute<{ erasure_request_create: string }>(sql`SELECT indicate_private.erasure_request_create(${id}::uuid, ${input.requestId}, ${input.organizationId}::uuid, ${input.reason}, ${input.scheduledFor}::timestamptz, ${input.now}::timestamptz) AS erasure_request_create`);
        const requestId = rows[0]?.erasure_request_create;
        if (requestId === undefined) throw new ModerationConflictError();
        return Object.freeze({ id: requestId });
      });
    } catch (error) {
      if (error instanceof ModerationConflictError) throw error;
      if (deniedViolation(error)) throw new ModerationAccessDeniedError();
      throw error;
    }
  }
}
