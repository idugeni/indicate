import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { status as genericStatus } from '@/app/api/webhooks/generic/route';
import { status as resendStatus } from '@/app/api/webhooks/resend/route';
import { status as v1Status } from '@/app/api/v1/commands/route';

describe.each([
  ['resend', resendStatus],
  ['generic', genericStatus],
] as const)('%s webhook status', (_name, status) => {
  it('memetakan input, rate limit, konflik, dan dependency', () => {
    expect(status(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(status(createPublicError('RATE_LIMITED', 'x', 'req-1'))).toBe(429);
    expect(status(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
    expect(status(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
  });

  it('menjatuhkan sisanya ke 404 non-disclosing', () => {
    expect(status(createNonDisclosingDenial('req-1'))).toBe(404);
    expect(status(createPublicError('INTERNAL_ERROR', 'x', 'req-1'))).toBe(404);
  });
});

describe('v1 commands status', () => {
  it('memetakan denial, input, rate limit, dan dependency', () => {
    expect(v1Status(createNonDisclosingDenial('req-1'))).toBe(404);
    expect(v1Status(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(v1Status(createPublicError('RATE_LIMITED', 'x', 'req-1'))).toBe(429);
    expect(v1Status(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
  });

  it('menjatuhkan konflik ke 409', () => {
    expect(v1Status(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
    expect(v1Status(createPublicError('IDEMPOTENCY_CONFLICT', 'x', 'req-1'))).toBe(409);
  });
});
