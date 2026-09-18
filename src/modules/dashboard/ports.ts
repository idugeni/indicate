import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttemptRecord, AnalyticsProjection, AuditFilter, AuditRecord, DashboardProjection, DashboardTenantState, InvitationSummary, OperationsProjection, RetentionRunRecord } from '@/modules/dashboard/models';

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
  /** Ringkasan hitung untuk view dashboard; tanpa memuat state tenan penuh. */
  dashboardCounts(actor: AuthorizedTenantActorContext, permission: string): Promise<DashboardProjection>;
  /** Agregasi analitik (group-by) untuk rentang tanggal; tanpa memuat state tenan penuh. */
  analyticsSummary(
    actor: AuthorizedTenantActorContext,
    permission: string,
    filter: { readonly from?: string | undefined; readonly to?: string | undefined },
  ): Promise<AnalyticsProjection>;
  /** Log audit terbaru (desc, dibatasi) sesuai filter; tanpa memuat state tenan penuh. */
  auditLogPage(actor: AuthorizedTenantActorContext, permission: string, filter: AuditFilter): Promise<readonly AuditRecord[]>;
  /** Bukti runs retensi/sweep (global + org); tanpa memuat state tenan penuh. */
  retentionRuns(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly RetentionRunRecord[]>;
  /** Upaya aktivasi domain (desc, dibatasi); tanpa memuat state tenan penuh. */
  activationAttempts(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly ActivationAttemptRecord[]>;
  /** Membuat undangan anggota sekali pakai untuk org aktor; tanpa memuat state tenan penuh. */
  createInvitation(actor: AuthorizedTenantActorContext, permission: string, input: { readonly email: string; readonly roleId: string; readonly tokenHash: string }): Promise<{ readonly id: string }>;
  /** Daftar undangan org aktor (maks 100, terbaru dulu); tanpa memuat state tenan penuh. */
  listInvitations(actor: AuthorizedTenantActorContext, permission: string): Promise<readonly InvitationSummary[]>;
  /** Membatalkan undangan pending milik org aktor. */
  revokeInvitation(actor: AuthorizedTenantActorContext, permission: string, input: { readonly id: string }): Promise<{ readonly id: string }>;
  /** Ringkasan operasional read-only (desc, dibatasi); tanpa memuat state tenan penuh. */
  operationsSummary(actor: AuthorizedTenantActorContext, permission: string): Promise<OperationsProjection>;
  /** Antre purge cache manual per site (null = semua dalam scope); langsung dieksekusi dispatcher. */
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
