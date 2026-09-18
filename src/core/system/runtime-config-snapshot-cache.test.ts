import { describe, expect, it, vi } from 'vitest';

import { FixedMonotonicClock } from '@/core/system/monotonic-clock';
import { RuntimeConfigSnapshotCache, type SnapshotSharedStore } from '@/core/system/runtime-config-snapshot-cache';
import type { PersistedRuntimeConfigReadModel } from '@/core/config/persisted/read-model';
import type { RuntimeConfigReadRepository } from '@/modules/persisted-config/ports';

const ORG = '11111111-1111-4111-8111-111111111111';
const DOMAIN = '22222222-2222-4222-8222-222222222222';
const SITE = '33333333-3333-4333-8333-333333333333';

function validModel(): PersistedRuntimeConfigReadModel {
  return {
    environment: 'test',
    configurationVersion: 7,
    readAt: '2026-09-18T00:00:00.000Z',
    sharedDeployment: {
      supabaseProjectRef: 'abcdefgh1234',
      cloudflareAccountId: 'cf-1',
      vercelProjectId: 'prj-1',
      vercelTeamId: 'team-1',
      vercelProductionTargetHostname: 'app.example',
      r2AccountId: 'r2-1',
      r2BucketName: 'indicate-media',
      upstashRedisResourceId: 'redis-1',
      version: 1,
      updatedAt: '2026-09-18T00:00:00.000Z',
    },
    mediaPolicy: {
      allowedMimeTypes: ['image/jpeg'],
      maxObjectBytes: 1000,
      uploadAuthorizationSeconds: 60,
      readAuthorizationSeconds: 60,
      version: 1,
    },
    publicationPolicy: {
      maxAttempts: 3,
      retryDelaysSeconds: [60, 120],
      leaseSeconds: 60,
      batchSize: 10,
      functionDeadlineSeconds: 60,
      version: 1,
    },
    webhookPolicy: { freshnessSeconds: 60, replayRetentionSeconds: 3600, version: 1 },
    cachePolicy: { publicCacheSeconds: 60, cacheVersion: 1, version: 1 },
    rateLimitPolicies: [
      { endpointClass: 'mutation', allowance: 100, windowSeconds: 60, version: 1 },
      { endpointClass: 'webhook', allowance: 200, windowSeconds: 60, version: 1 },
      { endpointClass: 'public_read', allowance: 300, windowSeconds: 60, version: 1 },
    ],
    domains: [
      {
        organizationId: ORG,
        domainId: DOMAIN,
        normalizedHostname: 'berita.example',
        cloudflareZoneId: 'zone-1',
        routingVersion: 1,
        version: 1,
      },
    ],
    sites: [
      {
        organizationId: ORG,
        siteId: SITE,
        domainId: DOMAIN,
        normalizedHostname: 'www.berita.example',
        regionId: null,
        routingVersion: 1,
        contentVersion: 0,
        version: 1,
        domainOrganizationId: ORG,
        domainNormalizedHostname: 'berita.example',
        settingsVersion: 1,
      },
    ],
    siteSettings: [
      {
        organizationId: ORG,
        siteId: SITE,
        locale: 'id-ID',
        seoDefaultTitle: 'Berita',
        seoDefaultDescription: 'Kabar terkini',
        seoRobotsDirective: 'index,follow',
        seoOpenGraphSiteName: 'Berita',
        seoSchemaVersion: 1,
        defaultMediaId: null,
        defaultMediaObjectKey: null,
        defaultMediaState: 'active',
        defaultMediaOrganizationId: null,
        version: 1,
      },
    ],
  };
}

function setup(readComplete: () => Promise<PersistedRuntimeConfigReadModel>, store: SnapshotSharedStore | null = null) {
  const clock = new FixedMonotonicClock();
  const repository: RuntimeConfigReadRepository = {
    readComplete,
    readInventoryVersion: async () => ({ configurationVersion: 7 }),
  };
  return { clock, cache: new RuntimeConfigSnapshotCache({ repository, clock, snapshotStore: store }) };
}

describe('RuntimeConfigSnapshotCache baca penuh', () => {
  it('mengadopsi snapshot postgres dan memakai ulang saat segar', async () => {
    const readComplete = vi.fn(async () => validModel());
    const { cache } = setup(readComplete);
    const first = await cache.get('test');
    expect(first.source).toBe('postgres');
    expect(first.snapshot.configurationVersion).toBe(7);
    const second = await cache.get('test');
    expect(second).toBe(first);
    expect(readComplete).toHaveBeenCalledOnce();
    expect(cache.status('test')).toMatchObject({ configurationVersion: 7, outcome: 'available', source: 'postgres' });
  });

  it('melempar saat parser menolak dan status tetap unavailable', async () => {
    const { cache } = setup(async () => ({ ...validModel(), rateLimitPolicies: [] }));
    await expect(cache.get('test')).rejects.toThrow('configuration snapshot rejected by parser');
    expect(cache.status('test')).toMatchObject({ outcome: 'unavailable' });
  });

  it('mengambil ulang setelah invalidate revisi lebih baru', async () => {
    const readComplete = vi.fn(async () => validModel());
    const { cache, clock } = setup(readComplete);
    await cache.get('test');
    cache.invalidate({ runtimeRevision: 6 });
    expect(readComplete).toHaveBeenCalledOnce();
    cache.invalidate({ runtimeRevision: 8 });
    clock.advance(1);
    await cache.get('test');
    expect(readComplete).toHaveBeenCalledTimes(2);
  });
});

describe('RuntimeConfigSnapshotCache lapis bersama', () => {
  it('mengadopsi model tervalidasi dari store tanpa baca penuh', async () => {
    const readComplete = vi.fn(async () => validModel());
    const store: SnapshotSharedStore = {
      read: async () => validModel(),
      write: async () => {},
    };
    const { cache } = setup(readComplete, store);
    const entry = await cache.get('test');
    expect(entry.snapshot.configurationVersion).toBe(7);
    expect(readComplete).not.toHaveBeenCalled();
  });
});
