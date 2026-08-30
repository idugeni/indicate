import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { assertAsyncProperty } from '../helpers/property';
import { acceptanceInput, stage4Actor, stage4State, TEST_ORG } from '../helpers/stage4';

// Feature: indicate-mvp, Property 26: Fencing permits one current worker owner
// **Validates: Requirements 12.22, 12.44, 12.47, 12.48**
describe('Property 26', () => { it('rejects stale worker writes after lease recovery and reclaim', async () => {
  await assertAsyncProperty('Property 26: Fencing permits one current worker owner', fc.asyncProperty(fc.string({ minLength: 1, maxLength: 30 }), async (suffix) => {
    const repository = new InMemoryStage4Repository([stage4State()]); const accepted = await repository.acceptPublication(stage4Actor(), acceptanceInput(TEST_ORG, `key-${suffix}`)); if (accepted.kind !== 'created') return;
    await repository.recordDispatchScheduled(TEST_ORG, accepted.job.id, '2026-08-30T00:00:00.000Z');
    const first = await repository.claimJob(TEST_ORG, accepted.job.id, 'worker-1', '2026-08-30T00:00:01.000Z', '2026-08-30T00:00:00.000Z'); expect(first).not.toBeNull(); if (first === null) return;
    await repository.recoverExpiredLease(TEST_ORG, accepted.job.id, 3, '2026-08-30T00:00:02.000Z'); const second = await repository.claimJob(TEST_ORG, accepted.job.id, 'worker-2', '2026-08-30T00:00:10.000Z', '2026-08-30T00:00:02.000Z'); expect(second?.fencingToken).toBeGreaterThan(first.fencingToken);
    const target = (await repository.snapshot(TEST_ORG))!.targets[0]!; await expect(repository.transitionTarget(first, { targetId: target.id, toState: 'processing', now: '2026-08-30T00:00:03.000Z' })).rejects.toThrow('stale_fence');
  }));
}); });
