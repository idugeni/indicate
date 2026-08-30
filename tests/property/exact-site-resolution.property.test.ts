import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HostnameResolver } from '@/application/stage5/hostname-resolver';
import type { ResolvedSiteContext } from '@/domain/stage5/models';
import { assertAsyncProperty } from '../helpers/property';

describe('Property 4: Site resolution is exact and active', () => {
  // Feature: indicate-mvp, Property 4: Site resolution is exact and active
  // **Validates: Requirements 3.11, 3.12, 3.13, 3.14, 3.15, 3.18, 21.7**
  it('selects one unique active exact hostname and never a near match', async () => {
    await assertAsyncProperty('Property 4: Site resolution is exact and active', fc.asyncProperty(fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/), fc.boolean(), async (label, active) => {
      const hostname = `${label}.example.web.id`; const context: ResolvedSiteContext = { normalizedHostname: hostname, organizationId: 'org', domainId: 'domain', siteId: 'site', regionId: null, routingVersion: 1, contentVersion: 1 };
      const resolver = new HostnameResolver({ findActiveSitesByExactHostname: async (candidate) => candidate === hostname && active ? [context] : [] }, { cms: 'indicate.web.id', api: 'api.indicate.web.id', webhook: 'webhook.indicate.web.id' });
      expect((await resolver.classify(hostname)).kind).toBe(active ? 'site' : 'unknown');
      for (const near of [`x${hostname}`, `x.${hostname}`, `${hostname}.evil.test`, hostname.slice(1)]) expect((await resolver.classify(near)).kind).not.toBe('site');
    }));
  });
});
