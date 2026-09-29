import { beforeEach, describe, expect, it, vi } from 'vitest';

const CONTEXT = {
  normalizedHostname: 'portal.example',
  organizationId: 'o1',
  domainId: 'd1',
  siteId: 's1',
  regionId: null,
  routingVersion: 1,
  contentVersion: 1,
};

const mocks = vi.hoisted(() => ({
  networkMetadata: vi.fn(),
  resolveNetworkSite: vi.fn(),
  checkSearchRateLimit: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-host': 'portal.example' }),
}));

vi.mock('@/modules/delivery/network-runtime', () => ({
  classifyTenantHost: async () => ({ kind: 'site', context: CONTEXT }),
  networkMetadata: mocks.networkMetadata,
  resolveNetworkSite: mocks.resolveNetworkSite,
}));

vi.mock('@/modules/delivery/search-rate-limit', () => ({
  checkSearchRateLimit: mocks.checkSearchRateLimit,
}));

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: async () => ({
    config: { rateLimits: { publicRead: { allowance: 300, windowSeconds: 60 } } },
  }),
}));

vi.mock('@/modules/integrations', () => ({
  createProductionIntegrationsContext: async () => ({ rateLimits: {} }),
}));

vi.mock('@/modules/site/components/network/network-listing', () => ({ SearchPage: () => null }));

const { generateMetadata, normalizeQuery } = await import('@/app/(network)/search/page');

describe('normalizeQuery', () => {
  it('memotong kueri hingga 120 karakter', () => {
    expect(normalizeQuery('berita')).toBe('berita');
    expect(normalizeQuery('x'.repeat(200)).length).toBe(120);
    expect(normalizeQuery(undefined)).toBe('');
  });

  it('memakai entri pertama saat berulang', () => {
    expect(normalizeQuery(['satu', 'dua'])).toBe('satu');
  });
});

describe('search metadata rate limit', () => {
  beforeEach(() => {
    mocks.networkMetadata.mockReset();
    mocks.resolveNetworkSite.mockReset();
    mocks.checkSearchRateLimit.mockReset();
    mocks.networkMetadata.mockResolvedValue({ title: { absolute: 'tenant search' } });
  });

  it('tidak menyentuh database saat limiter menolak', async () => {
    mocks.checkSearchRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: '60' });

    const metadata = await generateMetadata({ searchParams: Promise.resolve({ q: 'jalan' }) });

    expect(mocks.resolveNetworkSite).not.toHaveBeenCalled();
    expect(mocks.networkMetadata).not.toHaveBeenCalled();
    expect(metadata.robots).toMatchObject({ index: false });
  });

  it('tetap membaca situs tenant saat limiter mengizinkan', async () => {
    mocks.checkSearchRateLimit.mockResolvedValue({ allowed: true });

    const metadata = await generateMetadata({ searchParams: Promise.resolve({ q: 'jalan' }) });

    expect(mocks.networkMetadata).toHaveBeenCalledWith('/search', { search: 'jalan' });
    expect(metadata.title).toEqual({ absolute: 'tenant search' });
  });
});
