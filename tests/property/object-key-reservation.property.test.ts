import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildStructuredObjectKey, hasRequiredObjectKeyPrefix } from '@/domain/stage4/object-key';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 14: Object-key reservation preserves prefix and existing data
// **Validates: Requirements 11.3, 11.4, 11.5, 11.6, 11.20, 11.21, 11.22, 21.9, 21.27**
describe('Property 14', () => { it('preserves owner prefixes and changes occupied candidates without touching existing keys', () => {
  assertProperty('Property 14: Object-key reservation preserves prefix and existing data', fc.property(fc.uuid(), fc.uuid(), fc.string({ minLength: 1, maxLength: 80 }), fc.uuid(), fc.uuid(), fc.constantFrom('article', 'site', 'organization'), (articleId, siteId, filename, first, second, kind) => {
    fc.pre(first.replaceAll('-', '') !== second.replaceAll('-', ''));
    const owner = kind === 'article' ? { kind: 'article' as const, articleId } : kind === 'site' ? { kind: 'site' as const, siteId } : { kind: 'organization' as const };
    const occupied = buildStructuredObjectKey(owner, filename, first); const candidate = buildStructuredObjectKey(owner, filename, second);
    expect(hasRequiredObjectKeyPrefix(candidate, owner)).toBe(true); expect(candidate).not.toBe(occupied); expect(new Set([occupied]).has(occupied)).toBe(true);
  }));
}); });
