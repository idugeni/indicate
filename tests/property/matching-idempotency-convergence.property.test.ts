import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { assertAsyncProperty } from '../helpers/property';
import { acceptanceInput, stage4Actor, stage4State, TEST_ORG } from '../helpers/stage4';

// Feature: indicate-mvp, Property 17: Matching idempotent publication requests converge
// **Validates: Requirements 12.3, 12.4, 12.8, 12.9, 21.11**
describe('Property 17', () => { it('converges concurrent matching requests to one job and one relation per Site', async () => {
  await assertAsyncProperty('Property 17: Matching idempotent publication requests converge', fc.asyncProperty(fc.string({ minLength: 1, maxLength: 40 }), async (key) => {
    const repository = new InMemoryStage4Repository([stage4State()]); const input = acceptanceInput(TEST_ORG, key, `v1:${key}`);
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => repository.acceptPublication(stage4Actor(), input)));
    expect(new Set(outcomes.map((outcome) => outcome.kind === 'conflict' ? outcome.existingJobId : outcome.job.id)).size).toBe(1);
    const snapshot = await repository.snapshot(TEST_ORG); expect(snapshot?.jobs).toHaveLength(1); expect(snapshot?.articleSites).toHaveLength(2);
  }));
}); });
