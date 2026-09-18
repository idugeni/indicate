import { describe, expect, it } from 'vitest';

import { HARD_SAFETY_CAPS, RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS } from '@/core/config/runtime/runtime-constants';
import { HARD_CAPS } from '@/core/config/persisted/hard-caps';

describe('batas keamanan runtime', () => {
  it('membekukan semua nilai dan menjaga retry konsisten dengan max attempts', () => {
    expect(Object.isFrozen(HARD_SAFETY_CAPS)).toBe(true);
    expect(HARD_SAFETY_CAPS.publicationRetryDelayEntries).toBe(HARD_SAFETY_CAPS.publicationMaxAttempts - 1);
    expect(RUNTIME_CONFIG_SNAPSHOT_TTL_SECONDS).toBeGreaterThan(0);
  });

  it('mencerminkan caps yang sama di lapisan persisted', () => {
    expect(HARD_CAPS.mediaMaxBytes).toBe(HARD_SAFETY_CAPS.mediaMaxBytes);
    expect(HARD_CAPS.publicationBatchSize).toBe(HARD_SAFETY_CAPS.publicationBatchSize);
    expect(HARD_CAPS.rateLimitWindowSeconds).toBe(HARD_SAFETY_CAPS.rateLimitWindowSeconds);
    expect(Object.isFrozen(HARD_CAPS)).toBe(true);
  });
});
