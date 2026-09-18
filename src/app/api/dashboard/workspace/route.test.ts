import { describe, expect, it } from 'vitest';

import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { responseStatus } from '@/app/api/dashboard/workspace/route';

describe('workspace responseStatus', () => {
  it('memetakan denial non-disclosing ke 404', () => {
    expect(responseStatus(createNonDisclosingDenial('req-1'))).toBe(404);
  });

  it('memetakan input dan konflik domain', () => {
    expect(responseStatus(createPublicError('INVALID_INPUT', 'x', 'req-1'))).toBe(400);
    expect(responseStatus(createPublicError('CONFLICT', 'x', 'req-1'))).toBe(409);
  });

  it('memetakan forbidden langganan ke 403 dan cooldown ke 429', () => {
    expect(responseStatus(createPublicError('FORBIDDEN', 'x', 'req-1'))).toBe(403);
    expect(responseStatus(createPublicError('RATE_LIMITED', 'x', 'req-1'))).toBe(429);
  });

  it('memetakan dependency ke 503 dan sisanya ke 500', () => {
    expect(responseStatus(createPublicError('DEPENDENCY_UNAVAILABLE', 'x', 'req-1'))).toBe(503);
    expect(responseStatus(createPublicError('INTERNAL_ERROR', 'x', 'req-1'))).toBe(500);
  });
});
