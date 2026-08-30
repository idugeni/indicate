import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createCacheIdentity } from '@/application/stage5/cache-identity';
import { assertProperty } from '../helpers/property';

describe('Property 29: Cache identities partition every selection dimension', () => {
  // Feature: indicate-mvp, Property 29: Cache identities partition every selection dimension
  // **Validates: Requirements 16.1–16.8, 16.14, 16.15, 21.19, 21.20**
  it('is canonical for equivalent input and distinct for every changed dimension', () => {
    assertProperty('Property 29: Cache identities partition every selection dimension', fc.property(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), fc.integer({ min: 1, max: 1000 }), (label, version) => {
      const context = { normalizedHostname: `${label}.example.web.id`, organizationId: 'org', domainId: 'domain', siteId: 'site', regionId: 'region', routingVersion: version, contentVersion: version };
      const base = { context, locale: 'id-ID', path: '/articles/', query: new URLSearchParams([['b', '2'], ['a', '1']]), preview: false, authClass: 'anonymous' as const };
      const identity = createCacheIdentity(base)!; expect(createCacheIdentity({ ...base, path: '/articles', query: new URLSearchParams([['a', '1'], ['b', '2']]) })!.key).toBe(identity.key);
      const variants = [{ ...base, context: { ...context, normalizedHostname: `other.${context.normalizedHostname}` } }, { ...base, context: { ...context, siteId: 'other' } }, { ...base, locale: 'en-US' }, { ...base, path: '/search' }, { ...base, query: new URLSearchParams('a=2') }, { ...base, preview: true }, { ...base, authClass: 'authenticated' as const }, { ...base, context: { ...context, routingVersion: version + 1 } }, { ...base, context: { ...context, contentVersion: version + 1 } }];
      for (const variant of variants) expect(createCacheIdentity(variant)!.key).not.toBe(identity.key); expect(createCacheIdentity({ ...base, context: null })).toBeNull();
    }));
  });
});
