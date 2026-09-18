import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { statusFor } from '@/app/api/dashboard/integrations/route';

describe('integrations statusFor', () => {
  it('memetakan rate limit webhook ke 429', () => {
    expect(statusFor(createPublicError('RATE_LIMITED', 'x', 'req-1'))).toBe(429);
    expect(statusFor(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
  });

  it('memetakan denial, input, dan dependency', () => {
    expect(statusFor(createNonDisclosingDenial('req-1'))).toBe(404);
    expect(statusFor(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(statusFor(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
    expect(statusFor(createPublicError('INTERNAL_ERROR', 'x', 'req-1'))).toBe(500);
  });
});
