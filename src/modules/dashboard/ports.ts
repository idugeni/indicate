import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttemptRecord, AnalyticsProjection, AuditFilter, AuditRecord, DashboardProjection, DashboardTenantState, EditorialSummaries, EditorialSummaryArticle, InvitationSummary, OperationsProjection, RetentionRunRecord } from '@/modules/dashboard/models';

export type MutableTenantState = {
  -readonly [Key in keyof DashboardTenantState]: DashboardTenantState[Key] extends readonly (infer Item)[] ? Item[] : DashboardTenantState[Key];
};

export interface DashboardTransaction {
  readonly state: MutableTenantState;
  resolveUserDisplayName(userId: string): Promise<string | null>;
  appendAudit(event: Omit<AuditRecord, 'id' | 'organizationId' | 'actorType' | 'actorId' | 'entryPoint' | 'requestId' | 'occurredAt'>): void;
}

export interface CachePurgeTarget {
  readonly siteId: string;
  readonly hostname: string;
}

export interface DashboardRepository {
  read(actor: AuthorizedTenantActorContext, permission: string): Promise<DashboardTenantState>;
  /** Bodyless editorial summary (title + sites + in-scope regions); without loading the full tenant state. */
  listEditorialSummaries(actor: AuthorizedTenantActorContext, permission: string): Promise<EditorialSummaries>;
  /** Search articles by title/body on the database side (desc, bounded); without loading the full tenant state. */
  searchArticleSummaries(actor: AuthorizedTenantActorContext, permission: string, keyword: string, limit: number): Promise<readonly EditorialSummaryArticle[]>;
  /** Count summary for the dashboard view; without loading the full tenant state. */
  dashboardCounts(actor: AuthorizedTenantActorContext, permission: string): Promise<DashboardProjection>;
  /** Analytics aggregation (group-by) for a date range; without loading the full tenant state. */
  analyticsSummary(
    actor: AuthorizedTenantActorContext,
    permission: string,
    filter: { readonly from?: string | undefined; readonly to?: string | undefined },
  ): Promise<AnalyticsProjection>;
  /** Latest audit log (desc, bounded) matching the filter; without loading the full tenant state. */
  auditLogPage(actor: AuthorizedTenantActorContext, permission: string, filter: AuditFilter): Promise<readonly AuditRecord[]>;
  /** Retention/sweep run evidence (global + org); without loading the full tenant state. */
  retentionRuns(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly RetentionRunRecord[]>;
  /** Domain activation attempts (desc, bounded); without loading the full tenant state. */
  activationAttempts(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly ActivationAttemptRecord[]>;
  /** Create a single-use member invitation for the actor org; without loading the full tenant state. */
  createInvitation(actor: AuthorizedTenantActorContext, permission: string, input: { readonly email: string; readonly roleId: string; readonly tokenHash: string }): Promise<{ readonly id: string }>;
  /** List the actor org's invitations (max 100, newest first); without loading the full tenant state. */
  listInvitations(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly InvitationSummary[]>;
  /** Revoke a pending invitation owned by the actor org. */
  revokeInvitation(actor: AuthorizedTenantActorContext, permission: string, input: { readonly id: string }): Promise<{ readonly id: string }>;
  /** Read-only operations summary (desc, bounded); without loading the full tenant state. */
  operationsSummary(actor: AuthorizedTenantActorContext, permission: string): Promise<OperationsProjection>;
  /** Enqueue a manual cache purge per site (null = all in scope); executed directly by the dispatcher. */
  enqueueCachePurge(actor: AuthorizedTenantActorContext, permission: string, siteId: string | null): Promise<readonly CachePurgeTarget[]>;
  recordDenied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<void>;
  execute<T>(
    actor: AuthorizedTenantActorContext,
    permission: string,
    operation: (transaction: DashboardTransaction) => T | Promise<T>,
  ): Promise<T>;
}

export class DashboardAccessDeniedError extends Error {
  constructor() { super('Dashboard tenant resource unavailable'); }
}

export class DashboardConflictError extends Error {
  constructor() { super('The record was changed by another operation.'); }
}

/**
 * Reject a manual bulk purge issued inside the per-organization cooldown window.
 *
 * @param retryAfterSeconds - Seconds the caller should wait before retrying.
 */
export class DashboardRateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) { super(`Manual purge rate limited, retry after ${retryAfterSeconds}s.`); }
}

/** Outside the writable states, mutations fail explicitly (renew prompt, not a non-disclosing denial). */
export class DashboardSubscriptionInactiveError extends Error {
  constructor(
    readonly accessState: string,
  ) { super(`Subscription is not writable (state ${accessState}).`); }
}
