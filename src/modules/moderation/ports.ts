import type { ActorContext } from '@/core/operation-context';
import type { ContentReportRecord, ErasureRequestRecord, LitigationHoldRecord, PrivacyRequestRecord } from '@/modules/moderation/models';

export class ModerationAccessDeniedError extends Error {}
export class ModerationConflictError extends Error {}

export interface ReportSubmitInput {
  readonly orgId: string;
  readonly siteId: string | null;
  readonly articleId: string | null;
  readonly contact: string;
  readonly category: ContentReportRecord['reasonCategory'];
  readonly details: string;
  readonly articleUrl: string | null;
  readonly requestId: string;
  readonly now: string;
}

export interface PrivacySubmitInput {
  readonly orgId: string;
  readonly requestType: PrivacyRequestRecord['requestType'];
  readonly details: string;
  readonly requestId: string;
  readonly now: string;
}

export interface ModerationRepository {
  submitReport(input: ReportSubmitInput): Promise<{ readonly id: string }>;
  listReports(actor: ActorContext): Promise<readonly ContentReportRecord[]>;
  decideReport(actor: ActorContext, input: { readonly reportId: string; readonly actionTaken: boolean; readonly note: string | null; readonly requestId: string; readonly now: string }): Promise<void>;
  submitPrivacyRequest(actor: ActorContext, input: PrivacySubmitInput): Promise<{ readonly ticketNumber: string }>;
  listPrivacyRequests(actor: ActorContext): Promise<readonly PrivacyRequestRecord[]>;
  decidePrivacyRequest(actor: ActorContext, input: { readonly ticket: string; readonly status: 'in_progress' | 'fulfilled' | 'rejected'; readonly note: string | null; readonly requestId: string; readonly now: string }): Promise<void>;
  listHolds(actor: ActorContext): Promise<readonly LitigationHoldRecord[]>;
  createHold(actor: ActorContext, input: { readonly organizationId: string; readonly reason: string; readonly requestId: string; readonly now: string }): Promise<{ readonly id: string }>;
  releaseHold(actor: ActorContext, input: { readonly holdId: string; readonly requestId: string; readonly now: string }): Promise<void>;
  listErasureRequests(actor: ActorContext): Promise<readonly ErasureRequestRecord[]>;
  createErasureRequest(actor: ActorContext, input: { readonly organizationId: string; readonly reason: string; readonly scheduledFor: string; readonly requestId: string; readonly now: string }): Promise<{ readonly id: string }>;
}
