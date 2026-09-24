import { describe, expect, it } from 'vitest';

import { deriveRedisNamespace } from '@/core/config/runtime/derived-values';

describe('deriveRedisNamespace', () => {
  it('mempartisi kunci per environment dan versi cache', () => {
    expect(deriveRedisNamespace('production', 3)).toBe('indicate:production:v3');
  });
});
