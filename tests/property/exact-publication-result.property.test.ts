import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { projectPublicationResult } from '@/domain/stage4/publication-policy';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 25: Publication Result is derived exactly from successful targets
// **Validates: Requirements 12.38, 12.39, 12.40, 12.41, 12.42, 12.43, 21.18**
describe('Property 25', () => { it('counts and returns exactly published target URLs', () => {
  assertProperty('Property 25: Publication Result is derived exactly from successful targets', fc.property(fc.array(fc.boolean(), { minLength: 1, maxLength: 30 }), (successes) => {
    const targets = successes.map((success, index) => ({ state: success ? 'published' as const : 'failed' as const, publishedUrl: success ? `https://site-${index}.example.test/a` : null }));
    const result = projectPublicationResult(targets); const urls = targets.flatMap((target) => target.publishedUrl === null ? [] : [target.publishedUrl]).sort();
    expect(result.successfulCount).toBe(urls.length); expect(result.urls).toEqual(urls); expect(result.finalState).toBe(successes.every(Boolean) ? 'published' : 'failed');
  }));
}); });
