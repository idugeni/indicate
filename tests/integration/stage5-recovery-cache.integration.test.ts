import { describe, expect, it } from 'vitest';
import { DomainProvisioningService, Stage5OperationPendingError } from '@/application/stage5/domain-provisioning-service';
import { InvalidationDispatcher, planInvalidation } from '@/application/stage5/invalidation';
import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import { createStage5E2eRepository } from '@/infrastructure/testing/stage5-fixture';
import type { CloudflareAuthorityPort } from '@/ports/cloudflare';
import type { VercelHostingPort } from '@/ports/vercel-domain';

import { stage7RuntimeConfig } from '../helpers/stage7';

const config = stage7RuntimeConfig();
const readinessFixture = createStage7ReadinessFixture(config);
const alphaSite = readinessFixture.roots[0].apexSite;
const actor = { actorType: 'user' as const, actorId: 'user', verifiedAuthUserId: 'auth', organizationId: alphaSite.organizationId, permissionSet: new Set(['sites.manage']), entryPoint: 'cms' as const, requestId: 'request' };
class CloudflareFake implements CloudflareAuthorityPort { readonly authority = 'nameservers_dns_wildcard_ssl_proxy_cdn' as const; operations: string[] = []; async check() { return { service: 'cloudflare', status: 'healthy' as const }; } async verifyZone(hostname: string) { this.operations.push(`verify:${hostname}`); return { hostname, nameserversAuthoritative: true, publicDelegationAuthoritative: true, apexProxied: true, wildcardProxied: true, sslMode: 'full_strict' as const }; } async ensureExactVerificationTxt() {} async removeExactVerificationTxt() {} async purgeExactUrls() {} async purgeHostname() {} }
class VercelFake implements VercelHostingPort { readonly projectCount = 1 as const; readonly responsibility = 'application_hosting_only' as const; failRemoval = false; operations: string[] = []; async check() { return { service: 'vercel', status: 'healthy' as const }; } async associateExactDomain(hostname: string) { this.operations.push(`associate:${hostname}`); return { hostname, associated: true, verified: true }; } async verifyExactDomain(hostname: string) { this.operations.push(`verify:${hostname}`); return true; } async removeExactDomain(hostname: string) { this.operations.push(`remove:${hostname}`); if (this.failRemoval) throw new Error('offline'); } }

describe('Stage 5 durable recovery boundaries', () => {
  it('resumes from the persisted phase without replaying completed provider phases', async () => {
    const repo = createStage5E2eRepository(config); const cloudflare = new CloudflareFake(); const vercel = new VercelFake();
    await repo.deactivateSite(actor, alphaSite.id, 'alpha.example.web.id', planInvalidation({ kind: 'hostname', organizationId: actor.organizationId, siteId: alphaSite.id, previousHostname: 'alpha.example.web.id', currentHostname: null }), '2026-01-01T00:00:00.000Z');
    let attempt = await repo.beginActivation(actor, alphaSite.id, 'alpha.example.web.id', 'alpha.example.web.id', '2026-01-01T00:00:01.000Z');
    attempt = await repo.updateActivation(actor, attempt.id, 'cloudflare_verified', { publicDelegation: true }, '2026-01-01T00:00:01.000Z');
    const service = new DomainProvisioningService(repo, cloudflare, vercel, { verifyPendingHostname: async (_hostname, id) => id === attempt.id }, new Set());
    await expect(service.resume(actor, attempt, new Date('2026-01-01T00:00:02.000Z'))).resolves.toMatchObject({ normalizedHostname: 'alpha.example.web.id' });
    expect(cloudflare.operations).not.toContain('verify:alpha.example.web.id');
    expect(repo.snapshot().tasks.at(-1)).toMatchObject({ previousHostname: 'alpha.example.web.id', currentHostname: 'alpha.example.web.id' });
  });

  it('keeps failed Vercel deactivation cleanup durable and independently retryable', async () => {
    const repo = createStage5E2eRepository(config); const vercel = new VercelFake(); vercel.failRemoval = true;
    const service = new DomainProvisioningService(repo, new CloudflareFake(), vercel, { verifyPendingHostname: async () => true }, new Set(), [1], 3);
    await expect(service.deactivate(actor, alphaSite.id, 'alpha.example.web.id', new Date('2026-01-01T00:00:00.000Z'))).rejects.toThrow(Stage5OperationPendingError);
    expect(repo.snapshot().sites[0]?.active).toBe(false);
    expect(repo.snapshot().attempts[0]).toMatchObject({ operation: 'deactivate', phase: 'deactivating', status: 'pending', attempts: 1 });
    vercel.failRemoval = false;
    await expect(service.reconcile(new Date('2026-01-01T00:00:02.000Z'))).resolves.toEqual({ completed: 1, failed: 0 });
    expect(repo.snapshot().attempts[0]).toMatchObject({ phase: 'completed', status: 'completed' });
  });

  it('records database retry progress and bypass even when Redis coordination also fails', async () => {
    const repo = createStage5E2eRepository(config); const plan = planInvalidation({ kind: 'site_settings', organizationId: actor.organizationId, siteId: alphaSite.id, hostname: 'alpha.example.web.id' });
    await repo.createInvalidation(plan, '2026-01-01T00:00:00.000Z');
    const dispatcher = new InvalidationDispatcher(repo, { revalidateTags: async () => undefined, revalidatePaths: async () => undefined }, { incrementSiteVersion: async () => { throw new Error('redis offline'); }, setSiteBypass: async () => { throw new Error('redis offline'); } }, new CloudflareFake(), [10], 3);
    await expect(dispatcher.dispatch(new Date('2026-01-01T00:00:00.000Z'), 10)).resolves.toEqual({ completed: 0, failed: 1 });
    expect(repo.snapshot().tasks[0]).toMatchObject({ status: 'pending', attempts: 1, sanitizedFailure: { code: 'provider_unavailable' } });
    expect(repo.snapshot().bypasses).toContain(`${actor.organizationId}:${alphaSite.id}`);
  });
});
