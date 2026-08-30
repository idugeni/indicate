import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { assertAsyncProperty } from '../helpers/property';
import { acceptanceInput, stage4Actor, stage4State, TEST_ARTICLE, TEST_ORG, TEST_ORG_B } from '../helpers/stage4';

// Feature: indicate-mvp, Property 19: Idempotency keys are tenant-partitioned
// **Validates: Requirements 12.11, 21.13**
describe('Property 19', () => { it('keeps identical keys independent across Organizations', async () => {
  await assertAsyncProperty('Property 19: Idempotency keys are tenant-partitioned', fc.asyncProperty(fc.string({ minLength: 1, maxLength: 50 }), async (key) => {
    const repository = new InMemoryStage4Repository([stage4State(), stage4State(TEST_ORG_B, TEST_ARTICLE)]);
    const [first, second] = await Promise.all([repository.acceptPublication(stage4Actor(TEST_ORG), acceptanceInput(TEST_ORG, key, 'v1:a')), repository.acceptPublication(stage4Actor(TEST_ORG_B), acceptanceInput(TEST_ORG_B, key, 'v1:b'))]);
    expect(first.kind).toBe('created'); expect(second.kind).toBe('created'); if (first.kind === 'created' && second.kind === 'created') expect(first.job.id).not.toBe(second.job.id);
  }));
}); });
