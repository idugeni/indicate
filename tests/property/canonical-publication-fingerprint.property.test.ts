import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { publicationFingerprint } from '@/domain/stage4/publication-policy';
import { assertAsyncProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 16: Publication fingerprints are canonical
// **Validates: Requirements 12.1, 12.2**
describe('Property 16', () => { it('converges for target permutations and changes for semantic deltas', async () => {
  await assertAsyncProperty('Property 16: Publication fingerprints are canonical', fc.asyncProperty(fc.uuid(), fc.uuid(), fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 8 }), fc.string({ minLength: 1, maxLength: 20 }), async (organizationId, articleId, siteIds, mode) => {
    const input = { organizationId, articleId, siteIds, options: { mode, nested: { b: 2, a: 1 } } };
    const canonical = await publicationFingerprint(input); const permuted = await publicationFingerprint({ ...input, siteIds: [...siteIds].reverse().flatMap((id) => [id, id]), options: { nested: { a: 1, b: 2 }, mode } });
    expect(permuted).toBe(canonical); expect(await publicationFingerprint({ ...input, articleId: crypto.randomUUID() })).not.toBe(canonical);
  }));
}); });
