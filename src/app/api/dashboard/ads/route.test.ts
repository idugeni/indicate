import { describe, expect, it } from 'vitest';

import { statusFor } from '@/app/api/dashboard/ads/route';

describe('statusFor iklan', () => {
  it('memetakan kode envelope ke status HTTP', () => {
    const envelope = (code: string) => ({ error: { code, message: 'x', requestId: 'r' } }) as unknown as Parameters<typeof statusFor>[0];
    expect(statusFor(envelope('INVALID_INPUT'))).toBe(400);
    expect(statusFor(envelope('RESOURCE_UNAVAILABLE'))).toBe(404);
    expect(statusFor(envelope('FORBIDDEN'))).toBe(403);
    expect(statusFor(envelope('CONFLICT'))).toBe(409);
    expect(statusFor(envelope('DEPENDENCY_UNAVAILABLE'))).toBe(503);
    expect(statusFor(envelope('UNKNOWN'))).toBe(500);
  });
});
