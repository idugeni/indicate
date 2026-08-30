import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { ActivationAttempt, InvalidationPlan, InvalidationTask, PublicContentQuery, PublicSiteData, ResolvedSiteContext } from '@/domain/stage5/models';

export interface Stage5Repository {
  findActiveSitesByExactHostname(hostname: string): Promise<readonly ResolvedSiteContext[]>;
  findPendingActivation(hostname: string, attemptId: string): Promise<boolean>;
  loadPublicSite(context: ResolvedSiteContext, query: PublicContentQuery): Promise<PublicSiteData | null>;
  isCacheBypassed(context: ResolvedSiteContext): Promise<boolean>;
  beginActivation(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, previousHostname: string | null, now: string): Promise<ActivationAttempt>;
  updateActivation(actor: AuthorizedTenantActorContext, attemptId: string, phase: ActivationAttempt['phase'], externalStatus: Readonly<Record<string, unknown>>, now: string): Promise<ActivationAttempt>;
  failActivation(actor: AuthorizedTenantActorContext, attemptId: string, failure: Readonly<Record<string, unknown>>, nextAttemptAt: string, terminal: boolean, now: string): Promise<ActivationAttempt>;
  claimActivationAttempts(now: string, limit: number, claimToken: string, claimExpiresAt: string): Promise<readonly ActivationAttempt[]>;
  completeActivation(actor: AuthorizedTenantActorContext, attemptId: string, plan: InvalidationPlan, now: string): Promise<ResolvedSiteContext>;
  deactivateSite(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, plan: InvalidationPlan, now: string): Promise<ActivationAttempt>;
  completeDeactivation(actor: AuthorizedTenantActorContext, attemptId: string, now: string): Promise<void>;
  createInvalidation(plan: InvalidationPlan, now: string): Promise<InvalidationTask>;
  claimInvalidations(now: string, limit: number): Promise<readonly InvalidationTask[]>;
  completeInvalidation(task: InvalidationTask, now: string): Promise<void>;
  failInvalidation(task: InvalidationTask, failure: Readonly<Record<string, unknown>>, nextAttemptAt: string, terminal: boolean, now: string): Promise<void>;
}

export class Stage5ResourceUnavailableError extends Error {
  constructor() { super('Public resource unavailable'); }
}
export class Stage5ConflictError extends Error {
  constructor(message = 'Stage 5 conflict') { super(message); }
}
