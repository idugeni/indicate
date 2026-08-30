import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { PublishingState } from '@/domain/stage4/models';
import { isAllowedJobTransition, isAllowedTargetTransition, PUBLISHING_STATES } from '@/domain/stage4/publication-policy';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 21: Publishing transitions match the complete allowed model
// **Validates: Requirements 12.20, 12.21, 12.23, 12.24, 12.25, 12.26, 12.27, 12.32, 12.33, 12.36, 21.14, 21.15**
describe('Property 21', () => { it('accepts exactly the specified job and target relations', () => {
  const job = new Set(['queued:processing','queued:retrying','queued:failed','processing:published','processing:retrying','processing:failed','retrying:processing','retrying:failed','published:published','failed:failed']);
  const target = new Set(['queued:processing','processing:published','processing:retrying','processing:failed','retrying:processing','retrying:failed','published:published','failed:failed']);
  assertProperty('Property 21: Publishing transitions match the complete allowed model', fc.property(fc.constantFrom(...PUBLISHING_STATES), fc.constantFrom(...PUBLISHING_STATES), (from: PublishingState, to: PublishingState) => {
    expect(isAllowedJobTransition(from, to)).toBe(job.has(`${from}:${to}`)); expect(isAllowedTargetTransition(from, to)).toBe(target.has(`${from}:${to}`));
  }));
}); });
