import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyTargetTransition } from '@/domain/stage4/publication-policy';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 22: Terminal transitions are idempotent
// **Validates: Requirements 12.34, 12.35, 21.16**
describe('Property 22', () => { it('preserves all terminal outcome fields on repeats', () => {
  assertProperty('Property 22: Terminal transitions are idempotent', fc.property(fc.constantFrom('published' as const, 'failed' as const), fc.option(fc.webUrl(), { nil: null }), fc.option(fc.string(), { nil: null }), (state, url, failure) => {
    const current = { state, publishedUrl: url, publishedAt: '2026-08-30T00:00:00.000Z', sanitizedError: failure === null ? null : { code: failure } };
    expect(applyTargetTransition(current, state, { publishedUrl: null, publishedAt: null, sanitizedError: null })).toBe(current);
  }));
}); });
