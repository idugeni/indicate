import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InMemoryStage4Repository } from '@/infrastructure/testing/stage4-memory';
import { assertAsyncProperty } from '../helpers/property';
import { acceptanceInput, stage4Actor, stage4State, TEST_ORG } from '../helpers/stage4';

// Feature: indicate-mvp, Property 18: Fingerprint conflicts preserve the original job
// **Validates: Requirements 12.10, 21.12**
describe('Property 18', () => { it('returns conflict and leaves the original graph unchanged', async () => {
  await assertAsyncProperty('Property 18: Fingerprint conflicts preserve the original job', fc.asyncProperty(fc.string({ minLength: 1, maxLength: 40 }), fc.string({ minLength: 1, maxLength: 40 }), async (first, second) => {
    fc.pre(first !== second); const repository = new InMemoryStage4Repository([stage4State()]); const original = acceptanceInput(TEST_ORG, 'same-key', `v1:${first}`);
    await repository.acceptPublication(stage4Actor(), original); const before = await repository.snapshot(TEST_ORG);
    const conflict = await repository.acceptPublication(stage4Actor(), acceptanceInput(TEST_ORG, 'same-key', `v1:${second}`));
    expect(conflict.kind).toBe('conflict'); expect(await repository.snapshot(TEST_ORG)).toEqual(before);
  }));
}); });
