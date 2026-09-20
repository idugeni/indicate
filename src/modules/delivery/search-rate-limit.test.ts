import { describe, expect, it, vi } from 'vitest';

import { createPublicError } from '@/core/errors';
import {
  checkSearchRateLimit,
  SEARCH_RATE_LIMIT_CLASS,
  SEARCH_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS,
} from '@/modules/delivery/search-rate-limit';

const POLICY = { allowance: 30, windowSeconds: 60 };
const REQUEST_ID = 'req-search-1';

function limiterWith(enforce: (key: string) => Promise<never>) {
  return {
    publicKey: (endpointClass: string, source: string) => `${endpointClass}:${source}`,
    enforce: vi.fn(enforce),
  };
}

describe('checkSearchRateLimit', () => {
  it('mengizinkan saat kuota tersedia', async () => {
    const limiter = limiterWith(async () => ({ ok: true, value: { allowed: true, retryAfterSeconds: 0 } }) as never);
    const result = await checkSearchRateLimit(limiter as never, {
      hostname: 'portal.example',
      policy: POLICY as never,
      requestId: REQUEST_ID,
    });
    expect(result).toEqual({ allowed: true });
  });

  it('mengunci kunci per-host pada kelas tenant-search', async () => {
    const limiter = limiterWith(async () => ({ ok: true, value: { allowed: true, retryAfterSeconds: 0 } }) as never);
    await checkSearchRateLimit(limiter as never, {
      hostname: 'portal.example',
      policy: POLICY as never,
      requestId: REQUEST_ID,
    });
    expect(limiter.enforce).toHaveBeenCalledWith(
      `${SEARCH_RATE_LIMIT_CLASS}:portal.example`,
      expect.objectContaining({ failureMode: 'closed' }),
      REQUEST_ID,
    );
  });

  it('menahan dengan jeda dari keputusan saat RATE_LIMITED', async () => {
    const limiter = limiterWith(
      async () =>
        ({
          ok: false,
          error: createPublicError('RATE_LIMITED', 'Request limit exceeded. Retry later.', REQUEST_ID, {
            retryAfterSeconds: ['25'],
          }),
        }) as never,
    );
    const result = await checkSearchRateLimit(limiter as never, {
      hostname: 'portal.example',
      policy: POLICY as never,
      requestId: REQUEST_ID,
    });
    expect(result).toEqual({ allowed: false, retryAfterSeconds: '25' });
  });

  it('memakai jeda bawaan saat field retry hilang', async () => {
    const limiter = limiterWith(
      async () =>
        ({ ok: false, error: createPublicError('RATE_LIMITED', 'Request limit exceeded. Retry later.', REQUEST_ID) }) as never,
    );
    const result = await checkSearchRateLimit(limiter as never, {
      hostname: 'portal.example',
      policy: POLICY as never,
      requestId: REQUEST_ID,
    });
    expect(result).toEqual({ allowed: false, retryAfterSeconds: SEARCH_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS });
  });

  it('fail-open saat Redis tidak tersedia', async () => {
    const limiter = limiterWith(
      async () =>
        ({
          ok: false,
          error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Request protection is temporarily unavailable.', REQUEST_ID),
        }) as never,
    );
    const result = await checkSearchRateLimit(limiter as never, {
      hostname: 'portal.example',
      policy: POLICY as never,
      requestId: REQUEST_ID,
    });
    expect(result).toEqual({ allowed: true });
  });

  it('fail-open saat kebijakan tidak valid', async () => {
    const limiter = limiterWith(
      async () =>
        ({
          ok: false,
          error: createPublicError('CONFIGURATION_INVALID', 'Rate-limit policy is unavailable.', REQUEST_ID),
        }) as never,
    );
    const result = await checkSearchRateLimit(limiter as never, {
      hostname: 'portal.example',
      policy: POLICY as never,
      requestId: REQUEST_ID,
    });
    expect(result).toEqual({ allowed: true });
  });
});
