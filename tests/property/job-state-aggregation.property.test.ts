import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { PublishingState } from '@/domain/stage4/models';
import { aggregateJobState, PUBLISHING_STATES } from '@/domain/stage4/publication-policy';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 23: Job state is the exact aggregate of target states
// **Validates: Requirements 12.28, 12.29, 12.30, 12.31, 21.14**
describe('Property 23', () => { it('uses processing, retrying, published, failed, then queued precedence', () => {
  assertProperty('Property 23: Job state is the exact aggregate of target states', fc.property(fc.array(fc.constantFrom(...PUBLISHING_STATES), { minLength: 1, maxLength: 20 }), (states: PublishingState[]) => {
    const expected = states.includes('processing') ? 'processing' : states.includes('retrying') ? 'retrying' : states.every((state) => state === 'published') ? 'published' : states.every((state) => state === 'published' || state === 'failed') && states.includes('failed') ? 'failed' : 'queued';
    expect(aggregateJobState(states)).toBe(expected);
  }));
}); });
