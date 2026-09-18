import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { statusFor } from '@/app/api/dashboard/publishing/route';

describe('publishing statusFor', () => {
  it('memetakan konflik idempotency dan transisi ke 409', () => {
    expect(statusFor(createPublicError('IDEMPOTENCY_CONFLICT', 'x', 'req-1'))).toBe(409);
    expect(statusFor(createPublicError('INVALID_STATE_TRANSITION', 'x', 'req-1'))).toBe(409);
    expect(statusFor(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
  });

  it('memetakan denial dan dependency', () => {
    expect(statusFor(createNonDisclosingDenial('req-1'))).toBe(404);
    expect(statusFor(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(statusFor(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
    expect(statusFor(createPublicError('INTERNAL_ERROR', 'x', 'req-1'))).toBe(500);
  });
});
