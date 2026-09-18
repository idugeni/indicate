import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { statusFor } from '@/app/api/dashboard/billing/route';

describe('billing statusFor', () => {
  it('memetakan forbidden platform ke 403 dan rate limit ke 429', () => {
    expect(statusFor(createPublicError('FORBIDDEN', 'x', 'req-1'))).toBe(403);
    expect(statusFor(createPublicError('RATE_LIMITED', 'x', 'req-1'))).toBe(429);
  });

  it('memetakan denial, input, konflik, dan dependency', () => {
    expect(statusFor(createNonDisclosingDenial('req-1'))).toBe(404);
    expect(statusFor(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(statusFor(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
    expect(statusFor(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
    expect(statusFor(createPublicError('INTERNAL_ERROR', 'x', 'req-1'))).toBe(500);
  });
});
