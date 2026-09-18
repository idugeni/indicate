import { describe, expect, it } from 'vitest';

import { parsePersistedReadModel } from '@/core/config/persisted/parser';
import type { PersistedRuntimeConfigReadModel } from '@/core/config/persisted/read-model';

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

describe('parsePersistedReadModel sukses', () => {
  it('membangun snapshot beku dengan indeks hostname', () => {
    const result = parsePersistedReadModel(validModel(), 'test');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.snapshot.configurationVersion).toBe(7);
    expect(result.snapshot.domainByHostname.get('berita.example')?.domainId).toBe(DOMAIN);
    expect(result.snapshot.siteByHostname.get('www.berita.example')?.siteId).toBe(SITE);
    expect(Object.isFrozen(result.snapshot)).toBe(true);
  });
});

describe('parsePersistedReadModel gagal', () => {
  it('menolak environment yang tidak cocok', () => {
    const result = parsePersistedReadModel(validModel(), 'production');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.issues).toEqual([{ path: 'environment', category: 'environment_mismatch' }]);
  });

  it('menolak kebijakan rate limit ganda atau hilang', () => {
    const duplicated = validModel();
    const missing = validModel();
    const duplicateResult = parsePersistedReadModel(
      { ...duplicated, rateLimitPolicies: [...duplicated.rateLimitPolicies, duplicated.rateLimitPolicies[0]!] },
      'test',
    );
    expect(duplicateResult.success).toBe(false);
    const missingResult = parsePersistedReadModel(
      { ...missing, rateLimitPolicies: missing.rateLimitPolicies.slice(0, 2) },
      'test',
    );
    expect(missingResult.success).toBe(false);
    if (!missingResult.success) {
      expect(missingResult.issues.some((issue) => issue.category === 'missing_rate_limit_policy')).toBe(true);
    }
  });

  it('menolak situs lintas tenant', () => {
    const model = validModel();
    const other = '44444444-4444-4444-8444-444444444444';
    const result = parsePersistedReadModel(
      { ...model, sites: [{ ...model.sites[0]!, organizationId: other, domainOrganizationId: other }] },
      'test',
    );
    expect(result.success).toBe(false);
  });
});
