import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { retryDelaySeconds, retryableTargetIds } from '@/domain/stage4/publication-policy';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 24: Retry execution remains within policy and preserves successes
// **Validates: Requirements 12.19, 12.25, 12.27, 12.37, 21.17**
describe('Property 24', () => { it('bounds attempts and excludes published targets', () => {
  assertProperty('Property 24: Retry execution remains within policy and preserves successes', fc.property(fc.integer({ min: 1, max: 10 }), fc.array(fc.integer({ min: 1, max: 3600 }), { minLength: 1, maxLength: 9 }), fc.integer({ min: 1, max: 12 }), (maxAttempts, delays, attempt) => {
    const policy = { maxAttempts, delaysSeconds: delays.slice(0, Math.max(1, maxAttempts - 1)) }; const delay = retryDelaySeconds(policy, attempt);
    expect(delay === null || policy.delaysSeconds.includes(delay)).toBe(true); if (attempt >= maxAttempts) expect(delay).toBeNull();
    const ids = retryableTargetIds([{ id: 'published', state: 'published', attempt }, { id: 'retry', state: 'retrying', attempt }], policy);
    expect(ids).not.toContain('published'); expect(ids.includes('retry')).toBe(attempt < maxAttempts);
  }));
}); });
