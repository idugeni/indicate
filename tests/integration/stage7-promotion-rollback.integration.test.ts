import { describe, expect, it } from 'vitest';

import { InvalidationDispatcher } from '@/application/stage5/invalidation';
import { DomainProvisioningService, Stage5OperationPendingError } from '@/application/stage5/domain-provisioning-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { PublicationWorker } from '@/application/stage4/publication-worker';
import { decidePromotion, STAGE7_QUALITY_STAGES, validateRollback } from '@/application/stage7/release-gate';
import { PRODUCTION_READINESS_CHECK_ORDER } from '@/application/stage7/production-readiness';
import { signWebhook, WebhookService } from '@/application/stage6/webhook-service';
import { createStage7ReadinessFixture } from '@/domain/stage7/readiness-fixtures';
import type { Stage4TenantSnapshot } from '@/domain/stage4/models';
import { APPLICATION_HOST, DNS_AUTHORITY, SHARED_RESOURCES } from '@/infrastructure/deployment/topology';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { DeterministicPublicationTargetPublisher, InMemoryObjectStorage, InMemoryRedisCoordination } from '@/infrastructure/testing/stage4-providers';
import { createStage5E2eRepository } from '@/infrastructure/testing/stage5-fixture';
import { InMemoryStage6Repository } from '@/infrastructure/testing/stage6-memory';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { stage7RuntimeConfig } from '../helpers/stage7';

const passedReadiness = { ready: true, requiredSchemaVersion: 14, checks: PRODUCTION_READINESS_CHECK_ORDER.map((name) => ({ name, status: 'passed' as const, category: 'ready' })) };
const passedAcceptance = { accepted: true, scenarioCount: 9, failures: [] } as const;
const diagnostics = STAGE7_QUALITY_STAGES.map((stage) => ({ stage, passed: true, category: 'passed' }));
const NOW = new Date('2026-08-30T08:00:00.000Z');

function stage4RecoveryState(organizationId: string, siteId: string): Stage4TenantSnapshot {
  const articleId = crypto.randomUUID();
  return {
    organizationId,
    articles: [{ id: articleId, organizationId, active: true, leadMediaId: null }],
    sites: [{ id: siteId, organizationId, active: true, normalizedHostname: 'rollback.example.web.id', settingsMediaIds: [] }],
    articleSites: [], reservations: [], media: [],
    cleanupTasks: [{ id: crypto.randomUUID(), organizationId, objectKey: 'assets/rollback-orphan.png', reason: 'rollback_recovery', status: 'pending', attempts: 0, nextAttemptAt: NOW.toISOString(), sanitizedFailure: null }],
    invalidationIntents: [], jobs: [], targets: [], transitionReceipts: [], auditLogs: [],
  };
}

const completeRecovery = Object.freeze({ activation: true, cleanup: true, transitionReceipt: true, lease: true, invalidation: true, queue: true, webhookOutcome: true });

describe('Stage 7 promotion and rollback procedures', () => {
  it('fails promotion closed for migration, configuration, provider, acceptance, or quality failure', () => {
    expect(decidePromotion({ readiness: passedReadiness, acceptance: passedAcceptance, diagnostics }).promote).toBe(true);
    for (const failedCheck of ['runtime_configuration', 'schema_version', 'cloudflare_authority', 'active_database_mappings'] as const) {
      const readiness = { ready: false, requiredSchemaVersion: 14, checks: [{ name: failedCheck, status: 'failed' as const, category: 'unavailable' }] };
      expect(decidePromotion({ readiness, acceptance: passedAcceptance, diagnostics })).toMatchObject({ promote: false, failures: ['production_readiness'] });
    }
    expect(decidePromotion({ readiness: passedReadiness, acceptance: { accepted: false, scenarioCount: 9, failures: ['tenant_leak'] }, diagnostics }).promote).toBe(false);
    expect(decidePromotion({ readiness: passedReadiness, acceptance: passedAcceptance, diagnostics: diagnostics.map((item) => item.stage === 'e2e' ? { ...item, passed: false } : item) }).promote).toBe(false);
  });

  it('resumes every durable recovery family through its real reconciler in one shared topology', async () => {
    const config = stage7RuntimeConfig(); const fixture = createStage7ReadinessFixture(config); const site = fixture.regionalMatrix[0]!;

    // Activation recovery: database deactivation is durable before external cleanup.
    const stage5 = createStage5E2eRepository(config);
    let failRemoval = true;
    const provisioning = new DomainProvisioningService(
      stage5,
      {
        authority: 'nameservers_dns_wildcard_ssl_proxy_cdn', check: async () => ({ service: 'cloudflare', status: 'healthy' }),
        verifyZone: async (hostname) => ({ hostname, nameserversAuthoritative: true, publicDelegationAuthoritative: true, apexProxied: true, wildcardProxied: true, sslMode: 'full_strict' }),
        ensureExactVerificationTxt: async () => undefined, removeExactVerificationTxt: async () => undefined, purgeExactUrls: async () => undefined, purgeHostname: async () => undefined,
      },
      {
        projectCount: 1, responsibility: 'application_hosting_only', check: async () => ({ service: 'vercel', status: 'healthy' }),
        associateExactDomain: async (hostname) => ({ hostname, associated: true, verified: true }), verifyExactDomain: async () => true,
        removeExactDomain: async () => { if (failRemoval) { failRemoval = false; throw new Error('provider unavailable'); } },
      },
      { verifyPendingHostname: async () => true }, config.hosts.reserved, [1], 3,
    );
    const siteActor = { actorType: 'system' as const, actorId: 'rollback', organizationId: site.organizationId, permissionSet: new Set(['sites.manage']), entryPoint: 'reconciler' as const, requestId: 'rollback-activation' };
    await expect(provisioning.deactivate(siteActor, site.id, site.normalizedHostname, NOW)).rejects.toBeInstanceOf(Stage5OperationPendingError);
    await expect(provisioning.reconcile(new Date(NOW.getTime() + 2_000), 10)).resolves.toEqual({ completed: 1, failed: 0 });
    const activationRecovered = stage5.snapshot().attempts.every(({ status }) => status === 'completed');

    // Invalidation recovery runs through both application and provider boundaries.
    await stage5.createInvalidation({ organizationId: site.organizationId, siteId: site.id, previousHostname: null, currentHostname: site.normalizedHostname, tags: [`site:${site.id}`], paths: ['/'], urls: [`https://${site.normalizedHostname}/`], reason: 'stage7.rollback' }, NOW.toISOString());
    const dispatcher = new InvalidationDispatcher(
      stage5,
      { revalidateTags: async () => undefined, revalidatePaths: async () => undefined },
      { incrementSiteVersion: async () => undefined, setSiteBypass: async () => undefined },
      {
        authority: 'nameservers_dns_wildcard_ssl_proxy_cdn', check: async () => ({ service: 'cloudflare', status: 'healthy' }),
        verifyZone: async (hostname) => ({ hostname, nameserversAuthoritative: true, publicDelegationAuthoritative: true, apexProxied: true, wildcardProxied: true, sslMode: 'full_strict' }),
        ensureExactVerificationTxt: async () => undefined, removeExactVerificationTxt: async () => undefined, purgeExactUrls: async () => undefined, purgeHostname: async () => undefined,
      }, [1], 3,
    );
    await expect(dispatcher.dispatch(new Date(NOW.getTime() + 2_000), 20)).resolves.toMatchObject({ failed: 0 });
    const invalidationRecovered = stage5.snapshot().tasks.every(({ status }) => status === 'completed');

    // Queue gap, object cleanup, expired lease, and transition receipt recovery.
    const stage4State = stage4RecoveryState(site.organizationId, site.id);
    const stage4 = new InMemoryStage4Repository([stage4State]);
    const failingQueue = new InMemoryRedisCoordination(config.redis.namespace);
    failingQueue.failNextSchedule = true;
    const clock = { now: () => NOW };
    const publication = new PublicationService(stage4, failingQueue, new UuidGenerator(), { maxAttempts: 3, delaysSeconds: [1, 2] }, clock);
    const publicationActor = { actorType: 'user' as const, actorId: 'rollback-editor', verifiedAuthUserId: crypto.randomUUID(), organizationId: site.organizationId, permissionSet: new Set(['publishing.request', 'publishing.read']), entryPoint: 'cms' as const, requestId: 'rollback-publication' };
    const requested = await publication.request(publicationActor, { articleId: stage4State.articles[0]!.id, siteIds: [site.id], idempotencyKey: 'rollback-durable', options: { rollback: true } });
    expect(requested.ok).toBe(true); if (!requested.ok) return;
    const jobId = requested.value.job.id;
    const queue = new InMemoryRedisCoordination(config.redis.namespace);
    const storage = new InMemoryObjectStorage(() => NOW);
    const policy = { maxAttempts: 3, delaysSeconds: [1, 2], leaseSeconds: 5, batchSize: 20, functionDeadlineSeconds: 30 };
    const firstRecovery = new PublicationWorker(stage4, queue, new DeterministicPublicationTargetPublisher(), storage, policy, { now: () => new Date(NOW.getTime() + 2_000) });
    await expect(firstRecovery.reconcile()).resolves.toMatchObject({ cleaned: 1 });
    const claim = await stage4.claimJob(site.organizationId, jobId, 'rollback-worker', new Date(NOW.getTime() + 3_000).toISOString(), new Date(NOW.getTime() + 2_000).toISOString());
    expect(claim).not.toBeNull(); if (claim === null) return;
    const [target] = await stage4.runnableTargets(claim, new Date(NOW.getTime() + 2_000).toISOString(), 1);
    await stage4.transitionTarget(claim, { targetId: target!.id, toState: 'processing', now: new Date(NOW.getTime() + 2_000).toISOString() });
    const secondRecovery = new PublicationWorker(stage4, queue, new DeterministicPublicationTargetPublisher(), storage, policy, { now: () => new Date(NOW.getTime() + 4_000) });
    await expect(secondRecovery.reconcile()).resolves.toMatchObject({ reconciled: expect.any(Number) });
    const recoveredSnapshot = await stage4.snapshot(site.organizationId);
    const cleanupRecovered = recoveredSnapshot?.cleanupTasks.every(({ status }) => status === 'completed') === true;
    const transitionReceiptRecovered = recoveredSnapshot?.transitionReceipts.every(({ acknowledgedAt }) => acknowledgedAt !== null) === true;
    const leaseRecovered = recoveredSnapshot?.jobs.every(({ leaseOwner, leaseExpiresAt }) => leaseOwner === null && leaseExpiresAt === null) === true;
    const queueRecovered = queue.scheduled.has(`${site.organizationId}:${jobId}`);

    // A prepared webhook outcome is finalized by the next authenticated duplicate.
    const webhookRepository = new InMemoryStage6Repository();
    webhookRepository.failNextReplayFinalize = true;
    const webhookSecret = 'rollback-webhook-secret-32-characters';
    const webhookClock = { now: () => NOW };
    const webhook = new WebhookService(webhookRepository, { rollback: webhookSecret }, 300, 900, webhookClock);
    const rawBody = JSON.stringify({ event: 'rollback' }); const timestamp = Math.floor(NOW.getTime() / 1_000);
    const headers = { source: 'rollback', replayId: 'rollback-outcome', timestamp, signature: signWebhook(webhookSecret, timestamp, rawBody) };
    await expect(webhook.process(rawBody, headers, site.organizationId, 'rollback-webhook-first')).resolves.toMatchObject({ ok: true });
    const duplicate = await webhook.process(rawBody, headers, site.organizationId, 'rollback-webhook-second');
    const webhookOutcomeRecovered = duplicate.ok;

    const durableRecovery = { activation: activationRecovered, cleanup: cleanupRecovered, transitionReceipt: transitionReceiptRecovered, lease: leaseRecovered, invalidation: invalidationRecovered, queue: queueRecovered, webhookOutcome: webhookOutcomeRecovered };
    expect(durableRecovery).toEqual(completeRecovery);
    expect(validateRollback({ targetSchemaCompatible: true, singleVercelProject: APPLICATION_HOST.projectCount === 1, cloudflareAuthorityPreserved: DNS_AUTHORITY.provider === 'cloudflare', durableRecovery, createsAdditionalTopology: false })).toEqual({ promote: true, failures: [] });
    expect(SHARED_RESOURCES.every(({ count, tenantScoped }) => count === 1 && !tenantScoped)).toBe(true);
  });

  it('blocks rollback when any schema, authority, topology, or durable family is unsafe or missing', () => {
    const baseline = { targetSchemaCompatible: true, singleVercelProject: true, cloudflareAuthorityPreserved: true, durableRecovery: completeRecovery, createsAdditionalTopology: false };
    expect(validateRollback({ ...baseline, targetSchemaCompatible: false }).promote).toBe(false);
    expect(validateRollback({ ...baseline, singleVercelProject: false }).promote).toBe(false);
    expect(validateRollback({ ...baseline, cloudflareAuthorityPreserved: false }).promote).toBe(false);
    expect(validateRollback({ ...baseline, createsAdditionalTopology: true }).promote).toBe(false);
    for (const family of Object.keys(completeRecovery) as (keyof typeof completeRecovery)[]) {
      const decision = validateRollback({ ...baseline, durableRecovery: { ...completeRecovery, [family]: false } });
      expect(decision).toMatchObject({ promote: false });
      expect(decision.failures).toContain(`durable_recovery:${family}`);
    }
  });
});
