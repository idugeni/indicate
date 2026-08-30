import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { hasReservedHostnameConflict, HostnameResolver } from '@/application/stage5/hostname-resolver';
import { assertAsyncProperty } from '../helpers/property';

const controls = new Set(['indicate.web.id', 'api.indicate.web.id', 'webhook.indicate.web.id']);
describe('Property 5: Control-plane hostnames cannot become public Sites', () => {
  // Feature: indicate-mvp, Property 5: Control-plane hostnames cannot become public Sites
  // **Validates: Requirements 3.21, 3.22, 3.23, 21.31**
  it('rejects normalized conflicts and always classifies control hosts first', async () => {
    await assertAsyncProperty('Property 5: Control-plane hostnames cannot become public Sites', fc.asyncProperty(fc.constantFrom(...controls), fc.constantFrom('', '.', ':443'), async (hostname, suffix) => {
      const candidate = `${hostname.toUpperCase()}${suffix}`;
      expect(hasReservedHostnameConflict(candidate, controls)).toBe(true);
      const resolver = new HostnameResolver({ findActiveSitesByExactHostname: async () => [{ normalizedHostname: hostname, organizationId: 'foreign', domainId: 'd', siteId: 's', regionId: null, routingVersion: 1, contentVersion: 1 }] }, { cms: 'indicate.web.id', api: 'api.indicate.web.id', webhook: 'webhook.indicate.web.id' });
      expect((await resolver.classify(candidate)).kind).toBe('control');
    }));
  });
});
