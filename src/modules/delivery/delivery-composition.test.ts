import { beforeEach, describe, expect, it, vi } from 'vitest';

const RUNTIME_CONTEXT = {
  bootstrap: {
    database: { pooledUrl: { reveal: () => 'postgresql://indicate:secret@db.example.invalid:5432/postgres' } },
  },
  config: {
    hosts: { dashboard: 'indicate.website', api: 'api.indicate.website', webhook: 'webhook.indicate.website', reserved: [] },
    supabase: { pooledDatabaseUrl: 'postgresql://indicate:secret@db.example.invalid:5432/postgres' },
    seo: { defaultAssetUrl: 'https://media.example.invalid' },
    r2: { publicHost: 'https://cdn.example.invalid' },
    cache: { defaultTtlSeconds: 60 },
    redis: { url: 'https://redis.example.invalid', token: 'token', namespace: 'indicate:test', resourceId: 'resource' },
  },
};

vi.mock('@/core/config/runtime/runtime-context', () => ({
  getServerRuntimeContext: vi.fn(async () => RUNTIME_CONTEXT),
}));

async function freshModule() {
  vi.resetModules();
  return import('@/modules/delivery/delivery-composition');
}

describe('activeDeliveryComposition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('menolak akses sinkron sebelum runtime context ter-resolve', async () => {
    const { activeDeliveryComposition } = await freshModule();
    expect(() => activeDeliveryComposition()).toThrow('delivery_composition_unresolved');
  });

  it('menjadi sinkon dan stabil setelah composition dibangun', async () => {
    const { activeDeliveryComposition, deliveryComposition } = await freshModule();
    const first = await deliveryComposition();
    expect(activeDeliveryComposition()).toBe(first);
    expect(activeDeliveryComposition()).toBe(activeDeliveryComposition());
  });

  it('tidak membangun ulang pada panggilan berikutnya', async () => {
    const { getServerRuntimeContext } = await import('@/core/config/runtime/runtime-context');
    const { deliveryComposition } = await freshModule();
    const first = await deliveryComposition();
    const second = await deliveryComposition();
    expect(second).toBe(first);
    expect(vi.mocked(getServerRuntimeContext)).toHaveBeenCalledTimes(1);
  });
});
