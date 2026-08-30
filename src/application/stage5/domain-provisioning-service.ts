import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { ActivationAttempt, ResolvedSiteContext } from '@/domain/stage5/models';
import type { CloudflareAuthorityPort } from '@/ports/cloudflare';
import type { PendingHostnameProbePort } from '@/ports/public-probe';
import type { Stage5Repository } from '@/ports/stage5-repository';
import type { VercelHostingPort } from '@/ports/vercel-domain';
import { normalizeRequestHostname } from '@/shared/hostname/normalize-request-hostname';
import { hasReservedHostnameConflict } from './hostname-resolver';
import { planInvalidation } from './invalidation';

export class Stage5OperationPendingError extends Error {
  constructor() { super('Stage 5 operation persisted for retry'); }
}

export class DomainProvisioningService {
  constructor(
    private readonly repository: Stage5Repository,
    private readonly cloudflare: CloudflareAuthorityPort,
    private readonly vercel: VercelHostingPort,
    private readonly probe: PendingHostnameProbePort,
    private readonly reservedHosts: ReadonlySet<string>,
    private readonly retryDelaysSeconds: readonly number[] = [30, 120, 600],
    private readonly maxAttempts = 4,
  ) {}

  async activate(actor: AuthorizedTenantActorContext, siteId: string, rawHostname: string, now = new Date(), rawPreviousHostname: string | null = null): Promise<ResolvedSiteContext> {
    const parsed = normalizeRequestHostname(rawHostname);
    const previous = rawPreviousHostname === null ? null : normalizeRequestHostname(rawPreviousHostname);
    if (!parsed.ok || (previous !== null && !previous.ok) || hasReservedHostnameConflict(rawHostname, this.reservedHosts) || (rawPreviousHostname !== null && hasReservedHostnameConflict(rawPreviousHostname, this.reservedHosts))) throw new Error('CONFIGURATION_INVALID');
    const attempt = await this.repository.beginActivation(actor, siteId, parsed.hostname, previous?.hostname ?? null, now.toISOString());
    return this.resume(actor, attempt, now);
  }

  async resume(actor: AuthorizedTenantActorContext, initial: ActivationAttempt, now = new Date()): Promise<ResolvedSiteContext> {
    if (initial.operation !== 'activate') throw new Error('CONFIGURATION_INVALID');
    let attempt = initial;
    try {
      if (attempt.phase === 'pending') {
        const zone = await this.cloudflare.verifyZone(attempt.hostname);
        if (!zone.nameserversAuthoritative || !zone.publicDelegationAuthoritative || !zone.apexProxied || !zone.wildcardProxied || zone.sslMode !== 'full_strict') throw new Error('DEPENDENCY_UNAVAILABLE');
        attempt = await this.repository.updateActivation(actor, attempt.id, 'cloudflare_verified', { authority: this.cloudflare.authority, publicDelegation: true }, now.toISOString());
      }
      if (attempt.phase === 'cloudflare_verified') {
        const association = await this.vercel.associateExactDomain(attempt.hostname);
        let verified = association.verified;
        if (association.verificationChallenge !== undefined && !verified) {
          const challenge = association.verificationChallenge;
          await this.cloudflare.ensureExactVerificationTxt(attempt.hostname, challenge.name, challenge.value);
          verified = await this.vercel.verifyExactDomain(attempt.hostname);
          if (verified) await this.cloudflare.removeExactVerificationTxt(attempt.hostname, challenge.name, challenge.value);
        } else if (association.associated) {
          verified = verified && await this.vercel.verifyExactDomain(attempt.hostname);
        }
        if (!association.associated || !verified) throw new Error('DEPENDENCY_UNAVAILABLE');
        attempt = await this.repository.updateActivation(actor, attempt.id, 'vercel_associated', { exactDomain: true, verified: true, responsibility: this.vercel.responsibility }, now.toISOString());
      }
      if (attempt.phase === 'vercel_associated') {
        if (!await this.probe.verifyPendingHostname(attempt.hostname, attempt.id)) throw new Error('DEPENDENCY_UNAVAILABLE');
        attempt = await this.repository.updateActivation(actor, attempt.id, 'probe_verified', { noindex: true, attemptId: attempt.id }, now.toISOString());
      }
      if (attempt.phase !== 'probe_verified') throw new Error('CONFIGURATION_INVALID');
      return await this.repository.completeActivation(actor, attempt.id, planInvalidation({ kind: 'hostname', organizationId: actor.organizationId, siteId: attempt.siteId, previousHostname: attempt.previousHostname, currentHostname: attempt.hostname }), now.toISOString());
    } catch (error) {
      if (attempt.status !== 'completed' && attempt.phase !== 'failed') {
        await this.persistFailure(actor, attempt, error, now);
        throw new Stage5OperationPendingError();
      }
      throw error;
    }
  }

  async deactivate(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, now = new Date()): Promise<void> {
    const attempt = await this.repository.deactivateSite(actor, siteId, hostname, planInvalidation({ kind: 'hostname', organizationId: actor.organizationId, siteId, previousHostname: hostname, currentHostname: null }), now.toISOString());
    await this.resumeDeactivation(actor, attempt, now);
  }

  async resumeDeactivation(actor: AuthorizedTenantActorContext, attempt: ActivationAttempt, now = new Date()): Promise<void> {
    if (attempt.operation !== 'deactivate' || attempt.phase !== 'deactivating') throw new Error('CONFIGURATION_INVALID');
    try {
      await this.vercel.removeExactDomain(attempt.hostname);
      await this.repository.completeDeactivation(actor, attempt.id, now.toISOString());
    } catch (error) {
      await this.persistFailure(actor, attempt, error, now);
      throw new Stage5OperationPendingError();
    }
  }

  async reconcile(now = new Date(), limit = 20): Promise<{ completed: number; failed: number }> {
    const claimToken = crypto.randomUUID();
    const attempts = await this.repository.claimActivationAttempts(now.toISOString(), limit, claimToken, new Date(now.getTime() + 30_000).toISOString());
    let completed = 0; let failed = 0;
    for (const attempt of attempts) {
      const actor: AuthorizedTenantActorContext = { actorType: 'system', actorId: `stage5:${attempt.id}`, organizationId: attempt.organizationId, permissionSet: new Set(['sites.manage']), entryPoint: 'reconciler', requestId: claimToken };
      try {
        if (attempt.operation === 'activate') await this.resume(actor, attempt, now); else await this.resumeDeactivation(actor, attempt, now);
        completed += 1;
      } catch { failed += 1; }
    }
    return { completed, failed };
  }

  private async persistFailure(actor: AuthorizedTenantActorContext, attempt: ActivationAttempt, error: unknown, now: Date): Promise<void> {
    const terminal = attempt.attempts + 1 >= this.maxAttempts;
    const seconds = this.retryDelaysSeconds[Math.min(attempt.attempts, this.retryDelaysSeconds.length - 1)] ?? 60;
    const code = error instanceof Error && error.message === 'CONFIGURATION_INVALID' ? 'configuration_invalid' : 'dependency_unavailable';
    await this.repository.failActivation(actor, attempt.id, { code, phase: attempt.phase }, new Date(now.getTime() + seconds * 1_000).toISOString(), terminal, now.toISOString());
  }
}
