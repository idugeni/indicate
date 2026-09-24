import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ActivationAttempt, ResolvedSiteContext } from '@/modules/delivery/models';
import type { CloudflareAuthorityPort } from '@/integrations/cloudflare/ports';
import type { PendingHostnameProbePort } from '@/core/hostname/ports';
import type { DeliveryRepository } from '@/modules/delivery/ports';
import { DeliveryResourceUnavailableError } from '@/modules/delivery/ports';
import type { VercelHostingPort } from '@/integrations/vercel/ports';
import { normalizeRequestHostname } from '@/core/hostname/normalize-request-hostname';
import { hasReservedHostnameConflict } from '@/modules/delivery/hostname-resolver';
import { planInvalidation } from '@/modules/delivery/invalidation';

export class DeliveryOperationPendingError extends Error {
  constructor() { super('Delivery operation persisted for retry'); }
}

export interface DomainZoneResolver {
  resolve(hostname: string, organizationId: string): Promise<{ domainId: string; cloudflareZoneId: string } | null>;
}

export class DomainProvisioningService {
  constructor(
    private readonly repository: DeliveryRepository,
    private readonly cloudflare: CloudflareAuthorityPort,
    private readonly vercel: VercelHostingPort,
    private readonly probe: PendingHostnameProbePort,
    private readonly reservedHosts: ReadonlySet<string>,
    private readonly zoneResolver: DomainZoneResolver,
    private readonly retryDelaysSeconds: readonly number[] = [30, 120, 600],
    private readonly maxAttempts = 4,
  ) {}

  async activate(actor: AuthorizedTenantActorContext, siteId: string, rawHostname: string, now = new Date(), rawPreviousHostname: string | null = null): Promise<ResolvedSiteContext> {
    if (actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new DeliveryResourceUnavailableError();
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
      if (attempt.activationState === 'pending') {
        const owned = await this.zoneResolver.resolve(attempt.hostname, attempt.organizationId);
        if (owned === null) throw new Error('DEPENDENCY_UNAVAILABLE');
        const verification = await this.cloudflare.verifyDomainZone({ domainId: owned.domainId, normalizedHostname: attempt.hostname, cloudflareZoneId: owned.cloudflareZoneId });
        if (!verification.verified || verification.category !== 'verified') throw new Error('DEPENDENCY_UNAVAILABLE');
        attempt = await this.repository.updateActivation(actor, attempt.id, 'cloudflare_verified', { authority: this.cloudflare.authority, publicDelegation: true, zoneId: owned.cloudflareZoneId }, now.toISOString());
      }
      if (attempt.activationState === 'cloudflare_verified') {
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
      if (attempt.activationState === 'vercel_associated') {
        if (!await this.probe.verifyPendingHostname(attempt.hostname, attempt.id, actor.requestId)) throw new Error('DEPENDENCY_UNAVAILABLE');
        attempt = await this.repository.updateActivation(actor, attempt.id, 'probe_verified', { noindex: true, attemptId: attempt.id }, now.toISOString());
      }
      if (attempt.activationState !== 'probe_verified') throw new Error('CONFIGURATION_INVALID');
      return await this.repository.completeActivation(actor, attempt.id, planInvalidation({ kind: 'hostname', organizationId: actor.organizationId, siteId: attempt.siteId, previousHostname: attempt.previousHostname, currentHostname: attempt.hostname }), now.toISOString());
    } catch (error) {
      if (attempt.status !== 'completed' && attempt.activationState !== 'failed') {
        await this.persistFailure(actor, attempt, error, now);
        throw new DeliveryOperationPendingError();
      }
      throw error;
    }
  }

  async deactivate(actor: AuthorizedTenantActorContext, siteId: string, hostname: string, now = new Date()): Promise<void> {
    if (actor.regionScopeId !== undefined && actor.regionScopeId !== null) throw new DeliveryResourceUnavailableError();
    const attempt = await this.repository.deactivateSite(actor, siteId, hostname, planInvalidation({ kind: 'hostname', organizationId: actor.organizationId, siteId, previousHostname: hostname, currentHostname: null }), now.toISOString());
    await this.resumeDeactivation(actor, attempt, now);
  }

  async resumeDeactivation(actor: AuthorizedTenantActorContext, attempt: ActivationAttempt, now = new Date()): Promise<void> {
    if (attempt.operation !== 'deactivate' || attempt.activationState !== 'deactivating') throw new Error('CONFIGURATION_INVALID');
    try {
      await this.vercel.removeExactDomain(attempt.hostname);
      await this.repository.completeDeactivation(actor, attempt.id, now.toISOString());
    } catch (error) {
      await this.persistFailure(actor, attempt, error, now);
      throw new DeliveryOperationPendingError();
    }
  }

  async reconcile(now = new Date(), limit = 20): Promise<{ completed: number; failed: number }> {
    const claimToken = crypto.randomUUID();
    const attempts = await this.repository.claimActivationAttempts(now.toISOString(), limit, claimToken, new Date(now.getTime() + 30_000).toISOString());
    let completed = 0; let failed = 0;
    for (const attempt of attempts) {
      const actor: AuthorizedTenantActorContext = { actorType: 'system', actorId: `delivery:${attempt.id}`, organizationId: attempt.organizationId, permissionSet: new Set(['sites.manage']), entryPoint: 'reconciler', requestId: claimToken };
      try {
        if (attempt.operation === 'activate') await this.resume(actor, attempt, now); else await this.resumeDeactivation(actor, attempt, now);
        completed += 1;
      } catch { failed += 1; }
    }
    return { completed, failed };
  }

  private async persistFailure(actor: AuthorizedTenantActorContext, attempt: ActivationAttempt, error: unknown, now: Date): Promise<void> {
    const terminal = attempt.attempts + 1 >= this.maxAttempts;
    const rateLimited = error instanceof Error ? /retry_after_(\d+)/u.exec(error.message)?.[1] : undefined;
    const baseSeconds = rateLimited === undefined
      ? (this.retryDelaysSeconds[Math.min(attempt.attempts, this.retryDelaysSeconds.length - 1)] ?? 60)
      : Math.min(Math.max(Number(rateLimited), 1), 3600);
    const jittered = Math.max(1, Math.round(baseSeconds * (0.9 + Math.random() * 0.2)));
    const code = error instanceof Error && error.message === 'CONFIGURATION_INVALID' ? 'configuration_invalid' : 'dependency_unavailable';
    await this.repository.failActivation(actor, attempt.id, { code, activationState: attempt.activationState }, new Date(now.getTime() + jittered * 1_000).toISOString(), terminal, now.toISOString());
  }
}
