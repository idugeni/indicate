import { describe, expect, it } from 'vitest';

import {
  cachePolicySchema,
  mediaPolicySchema,
  persistedReadModelSchema,
  publicationPolicySchema,
  rateLimitPolicySchema,
  webhookPolicySchema,
} from '@/core/config/persisted/persisted-schema';

describe('mediaPolicySchema', () => {
  it('menerima kebijakan valid', () => {
    expect(
      mediaPolicySchema.safeParse({
        allowedMimeTypes: ['image/jpeg', 'image/webp'],
        maxObjectBytes: 1000,
        uploadAuthorizationSeconds: 60,
        readAuthorizationSeconds: 60,
        version: 1,
      }).success,
    ).toBe(true);
  });

  it('menolak mime duplikat, di luar daftar, dan di atas cap', () => {
    const base = {
      allowedMimeTypes: ['image/jpeg'],
      maxObjectBytes: 1000,
      uploadAuthorizationSeconds: 60,
      readAuthorizationSeconds: 60,
      version: 1,
    };
    expect(mediaPolicySchema.safeParse({ ...base, allowedMimeTypes: ['image/jpeg', 'image/jpeg'] }).success).toBe(false);
    expect(mediaPolicySchema.safeParse({ ...base, allowedMimeTypes: ['image/gif'] }).success).toBe(false);
    expect(mediaPolicySchema.safeParse({ ...base, maxObjectBytes: Number.MAX_SAFE_INTEGER }).success).toBe(false);
  });
});

describe('publicationPolicySchema', () => {
  it('menolak retry melebihi attempts dan deadline di bawah minimum', () => {
    const base = {
      maxAttempts: 3,
      retryDelaysSeconds: [60, 120],
      leaseSeconds: 60,
      batchSize: 10,
      functionDeadlineSeconds: 60,
      version: 1,
    };
    expect(publicationPolicySchema.safeParse(base).success).toBe(true);
    expect(publicationPolicySchema.safeParse({ ...base, retryDelaysSeconds: [60, 120, 180] }).success).toBe(false);
    expect(publicationPolicySchema.safeParse({ ...base, functionDeadlineSeconds: 1 }).success).toBe(false);
  });
});

describe('webhookPolicySchema', () => {
  it('menolak retensi di bawah freshness', () => {
    expect(webhookPolicySchema.safeParse({ freshnessSeconds: 60, replayRetentionSeconds: 3600, version: 1 }).success).toBe(true);
    expect(webhookPolicySchema.safeParse({ freshnessSeconds: 3600, replayRetentionSeconds: 60, version: 1 }).success).toBe(false);
  });
});

describe('cachePolicySchema', () => {
  it('mengizinkan nol detik cache publik', () => {
    expect(cachePolicySchema.safeParse({ publicCacheSeconds: 0, cacheVersion: 1, version: 1 }).success).toBe(true);
  });
});

describe('rateLimitPolicySchema', () => {
  it('menolak allowance di atas cap per kelas', () => {
    expect(
      rateLimitPolicySchema.safeParse({ endpointClass: 'mutation', allowance: 1000, windowSeconds: 3600, version: 1 }).success,
    ).toBe(true);
    expect(
      rateLimitPolicySchema.safeParse({ endpointClass: 'mutation', allowance: 1001, windowSeconds: 3600, version: 1 }).success,
    ).toBe(false);
  });
});

describe('persistedReadModelSchema', () => {
  it('menolak environment di luar daftar bootstrap', () => {
    expect(
      persistedReadModelSchema.safeParse({
        environment: 'staging',
        configurationVersion: 1,
        readAt: '2026-09-18T00:00:00.000Z',
        sharedDeployment: {},
        mediaPolicy: {},
        publicationPolicy: {},
        webhookPolicy: {},
        cachePolicy: {},
        rateLimitPolicies: [],
        domains: [],
        sites: [],
        siteSettings: [],
      }).success,
    ).toBe(false);
  });
});
