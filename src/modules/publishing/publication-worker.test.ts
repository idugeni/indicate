import { describe, expect, it, vi } from 'vitest';

import type { QueueClaim, RedisCoordinationPort } from '@/integrations/redis/ports';
import type { ObjectStoragePort } from '@/integrations/storage/ports';
import type { PublicationJobRecord, WorkerClaim } from '@/modules/publishing/models';
import type { PublicationTargetPublisherPort, PublishingRepository } from '@/modules/publishing/ports';
import { PublicationWorker, type WorkerPolicy } from '@/modules/publishing/publication-worker';

const POLICY: WorkerPolicy = {
  maxAttempts: 3,
  delaysSeconds: [60, 120],
  leaseSeconds: 60,
  batchSize: 10,
  functionDeadlineSeconds: 60,
};

function jobRecord(overrides: Partial<PublicationJobRecord> = {}): PublicationJobRecord {
  return {
    id: 'job-1',
    organizationId: 'org-1',
    articleId: 'art-1',
    idempotencyKey: 'idem-1',
    fingerprint: 'fp-1',
    fingerprintVersion: 1,
    state: 'queued',
    options: {},
    dispatchStatus: 'pending',
    dispatchAttempts: 0,
    nextDispatchAt: '2026-09-18T00:00:00.000Z',
    leaseOwner: null,
    leaseExpiresAt: null,
    fencingToken: 1,
    finalizedAt: null,
    version: 1,
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt: '2026-09-18T00:00:00.000Z',
    ...overrides,
  };
}

function repositoryStub(overrides: Partial<PublishingRepository> = {}): PublishingRepository & { calls: string[] } {
  const calls: string[] = [];
  const record = (name: string) => calls.push(name);
  return {
    claimJob: async () => null,
    runnableTargets: async () => [],
    transitionTarget: async () => { throw new Error('tidak dipakai'); },
    acknowledgeTransitionReceipt: async () => { record('acknowledgeTransitionReceipt'); },
    releaseJob: async () => { record('releaseJob'); },
    getPublication: async () => null,
    findExpiredLeases: async () => [],
    recoverExpiredLease: async () => { record('recoverExpiredLease'); },
    claimDispatchGaps: async () => [],
    recordDispatchScheduled: async () => { record('recordDispatchScheduled'); },
    recordDispatchFailure: async () => { record('recordDispatchFailure'); },
    claimTransitionReceipts: async () => [],
    reconcileTransitionReceipt: async () => { record('reconcileTransitionReceipt'); },
    claimCleanupTasks: async () => [],
    completeCleanupTask: async () => { record('completeCleanupTask'); },
    failCleanupTask: async () => { record('failCleanupTask'); },
    ...overrides,
    calls,
  } as unknown as PublishingRepository & { calls: string[] };
}

function queueStub(claims: readonly QueueClaim[] = []): RedisCoordinationPort & { acknowledged: QueueClaim[] } {
  const acknowledged: QueueClaim[] = [];
  return {
    resourceCount: 1,
    namespace: 'test',
    check: async () => ({ service: 'redis', status: 'healthy' as const }),
    schedule: async () => {},
    claimDue: async () => claims,
    acknowledge: async (claim) => { acknowledged.push(claim); },
    mirrorState: async () => {},
    acknowledged,
  };
}

const PUBLISHER: PublicationTargetPublisherPort = { publish: async () => ({ kind: 'published', url: 'https://portal.example/a' }) };
const STORAGE: ObjectStoragePort = { deleteExact: async () => {} } as unknown as ObjectStoragePort;

describe('PublicationWorker run', () => {
  it('mengembalikan nol saat antrean kosong', async () => {
    const worker = new PublicationWorker(repositoryStub(), queueStub(), PUBLISHER, STORAGE, POLICY);
    await expect(worker.run('w-1')).resolves.toEqual({ claimed: 0, processed: 0, reconciled: 0, cleaned: 0 });
  });

  it('mengakui klaim ber-id rusak tanpa menyentuh repo klaim', async () => {
    const claim: QueueClaim = { logicalId: 'tanpa-pemisah', claimToken: 't-1', leaseExpiresAt: new Date() };
    const queue = queueStub([claim]);
    const claimJob = vi.fn(async () => null);
    const repository = repositoryStub({ claimJob: claimJob as PublishingRepository['claimJob'] });
    const worker = new PublicationWorker(repository, queue, PUBLISHER, STORAGE, POLICY);
    await expect(worker.run('w-1')).resolves.toEqual({ claimed: 0, processed: 0, reconciled: 0, cleaned: 0 });
    expect(queue.acknowledged).toEqual([claim]);
    expect(claimJob).not.toHaveBeenCalled();
  });

  it('mengklaim job tanpa target lalu melepas dan mengakui', async () => {
    const claim: QueueClaim = { logicalId: 'org-1:job-1', claimToken: 't-1', leaseExpiresAt: new Date() };
    const queue = queueStub([claim]);
    const workerClaim: WorkerClaim = { organizationId: 'org-1', jobId: 'job-1', workerId: 'w-1', fencingToken: 1, leaseExpiresAt: new Date().toISOString() };
    const repository = repositoryStub({ claimJob: async () => workerClaim });
    const worker = new PublicationWorker(repository, queue, PUBLISHER, STORAGE, POLICY);
    await expect(worker.run('w-1')).resolves.toEqual({ claimed: 1, processed: 0, reconciled: 0, cleaned: 0 });
    expect(repository.calls).toContain('releaseJob');
    expect(queue.acknowledged).toEqual([claim]);
  });
});

describe('PublicationWorker reconcile', () => {
  it('memulihkan lease kedaluwarsa dan menghitung rekonsiliasi', async () => {
    const repository = repositoryStub({ findExpiredLeases: async () => [jobRecord()] });
    const worker = new PublicationWorker(repository, queueStub(), PUBLISHER, STORAGE, POLICY);
    await expect(worker.reconcile()).resolves.toEqual({ claimed: 0, processed: 0, reconciled: 1, cleaned: 0 });
    expect(repository.calls).toContain('recoverExpiredLease');
  });

  it('mengembalikan nol saat tidak ada pekerjaan', async () => {
    const worker = new PublicationWorker(repositoryStub(), queueStub(), PUBLISHER, STORAGE, POLICY);
    await expect(worker.reconcile()).resolves.toEqual({ claimed: 0, processed: 0, reconciled: 0, cleaned: 0 });
  });
});
