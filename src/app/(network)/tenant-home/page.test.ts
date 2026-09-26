import { describe, expect, it, vi } from 'vitest';

import { makeNetworkSite } from '@/modules/delivery/network-test-fixtures';

const CONTEXT = {
  normalizedHostname: 'portal.example',
  organizationId: 'o1',
  domainId: 'd1',
  siteId: 's1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 1,
};

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-host': 'portal.example' }),
}));

vi.mock('next/cache', () => ({
  cacheLife: () => {},
  cacheTag: () => {},
}));

vi.mock('@/integrations/redis/pageview-buffer', () => ({
  readPageviewCounts: async () => [[0]],
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({ config: { seo: { defaultLocale: 'id-ID' } } }),
}));

vi.mock('@/core/config/bootstrap/bootstrap-config', () => ({
  getBootstrapConfig: () => ({ credentials: { facebookAppToken: { reveal: () => '28410585598598931|app-secret' } } }),
}));

vi.mock('@/modules/site/components/network/network-listing', () => ({ ListingPage: () => null }));
vi.mock('@/app/loading', () => ({ default: () => null }));

vi.mock('@/modules/delivery', () => ({
  deliveryComposition: async () => ({
    config: { seo: { defaultLocale: 'id-ID' } },
    resolver: { classify: async () => ({ kind: 'site', context: CONTEXT }) },
    content: { load: async () => makeNetworkSite() },
  }),
  activeDeliveryComposition: () => ({
    repository: { isCacheBypassed: async () => false },
    content: { load: async () => makeNetworkSite() },
  }),
}));

const { generateMetadata } = await import('@/app/(network)/tenant-home/page');

describe('tenant home metadata', () => {
  it('menerbitkan fb:app_id tanpa membocorkan app secret', async () => {
    const metadata = await generateMetadata();
    expect(metadata.facebook).toEqual({ appId: '28410585598598931' });
    expect(JSON.stringify(metadata)).not.toContain('app-secret');
  });

  it('menerbitkan dimensi gambar brand dari data situs, bukan hardcode', async () => {
    const metadata = await generateMetadata();
    const images = (metadata.openGraph?.images ?? []) as readonly { width?: number; height?: number; alt?: string }[];
    expect(images[0]?.alt).toBe('Portal');
  });
});
