import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { statusFor } from '@/app/api/dashboard/moderation/route';

describe('moderation statusFor', () => {
  it('memetakan konflik dan forbidden moderasi', () => {
    expect(statusFor(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
    expect(statusFor(createPublicError('FORBIDDEN', 'x', 'req-1'))).toBe(403);
  });

  it('menjatuhkan denial non-disclosing ke 500', () => {
    expect(statusFor(createNonDisclosingDenial('req-1'))).toBe(500);
    expect(statusFor(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(statusFor(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
  });
});
