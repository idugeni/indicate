import { describe, expect, it } from 'vitest';

import { assertDistinctR2Buckets, deriveRedisNamespace } from '@/core/config/runtime/derived-values';

describe('deriveRedisNamespace', () => {
  it('mempartisi kunci per environment dan versi cache', () => {
    expect(deriveRedisNamespace('production', 3)).toBe('indicate:production:v3');
  });
});

describe('assertDistinctR2Buckets', () => {
  it('menerima tiga bucket yang berbeda', () => {
    expect(() => assertDistinctR2Buckets({
      privateBucket: 'indicate-media-private',
      publicBucket: 'indicate-media-public',
      auditBucket: 'indicate-audit-worm',
    })).not.toThrow();
  });

  it('menerima peran publik dan audit yang belum dikonfigurasi', () => {
    expect(() => assertDistinctR2Buckets({
      privateBucket: 'indicate-media-private',
      publicBucket: null,
      auditBucket: null,
    })).not.toThrow();
  });

  it('menolak bucket privat yang memakai nama bucket audit', () => {
    expect(() => assertDistinctR2Buckets({
      privateBucket: 'indicate-audit-worm',
      publicBucket: 'indicate-media-public',
      auditBucket: 'indicate-audit-worm',
    })).toThrow(/r2_bucket_role_conflict.*both audit and private/);
  });

  it('menolak bucket privat yang memakai nama bucket publik', () => {
    expect(() => assertDistinctR2Buckets({
      privateBucket: 'indicate-media-public',
      publicBucket: 'indicate-media-public',
      auditBucket: null,
    })).toThrow(/r2_bucket_role_conflict.*both public and private/);
  });
});
