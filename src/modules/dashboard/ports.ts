import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { AnalyticsProjection, AuditFilter, AuditRecord, DashboardProjection, DashboardTenantState } from '@/modules/dashboard/models';

export type MutableTenantState = {
  -readonly [Key in keyof DashboardTenantState]: DashboardTenantState[Key] extends readonly (infer Item)[] ? Item[] : DashboardTenantState[Key];
};

export interface DashboardTransaction {
  readonly state: MutableTenantState;
  resolveUserDisplayName(userId: string): Promise<string | null>;
  appendAudit(event: Omit<AuditRecord, 'id' | 'organizationId' | 'actorType' | 'actorId' | 'entryPoint' | 'requestId' | 'occurredAt'>): void;
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

export class DashboardQuotaExceededError extends Error {
  constructor(
    readonly resource: string,
    readonly limit: number,
  ) { super(`Subscription quota exceeded for ${resource} (limit ${limit}).`); }
}

/** Outside the writable states, mutations fail explicitly (renew prompt, not a non-disclosing denial). */
export class DashboardSubscriptionInactiveError extends Error {
  constructor(
    readonly accessState: string,
  ) { super(`Subscription is not writable (state ${accessState}).`); }
}
