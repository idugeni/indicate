import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PublicationWorker } from '@/application/stage4/publication-worker';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { DeterministicPublicationTargetPublisher, InMemoryObjectStorage, InMemoryRedisCoordination } from '@/infrastructure/testing/stage4-providers';
import { assertAsyncProperty } from '../helpers/property';
import { acceptanceInput, stage4Actor, stage4State, TEST_ORG } from '../helpers/stage4';

// Feature: indicate-mvp, Property 20: Dispatch reconciliation is idempotent and bounded
// **Validates: Requirements 12.14, 12.15, 12.16, 12.17, 12.18, 21.28**
describe('Property 20', () => { it('duplicate scans schedule one logical job without duplicating durable rows', async () => {
  await assertAsyncProperty('Property 20: Dispatch reconciliation is idempotent and bounded', fc.asyncProperty(fc.integer({ min: 1, max: 8 }), async (runs) => {
    const repository = new InMemoryStage4Repository([stage4State()]); await repository.acceptPublication(stage4Actor(), acceptanceInput());
    const queue = new InMemoryRedisCoordination(); const worker = new PublicationWorker(repository, queue, new DeterministicPublicationTargetPublisher(), new InMemoryObjectStorage(), { maxAttempts: 3, delaysSeconds: [1, 2], leaseSeconds: 10, batchSize: 10, functionDeadlineSeconds: 20 });
    await Promise.all(Array.from({ length: runs }, () => worker.reconcile())); const snapshot = await repository.snapshot(TEST_ORG);
    expect(snapshot?.jobs).toHaveLength(1); expect(snapshot?.articleSites).toHaveLength(2); expect(queue.scheduled.size).toBeLessThanOrEqual(1);
  }));
}); });
