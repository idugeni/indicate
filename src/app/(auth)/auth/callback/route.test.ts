import { describe, expect, it } from 'vitest';

import { resolveCallbackDestination } from '@/app/(auth)/auth/callback/route-helpers';

describe('resolveCallbackDestination with Neon Auth', () => {
  it('defaults a successful verification callback to dashboard', () => {
    expect(resolveCallbackDestination('signup', null)).toBe('/dashboard');
    expect(resolveCallbackDestination(null, null)).toBe('/dashboard');
  });

  it('uses a sanitized local next destination', () => {
    expect(resolveCallbackDestination(null, '/dashboard?tab=ops')).toBe('/dashboard?tab=ops');
    expect(resolveCallbackDestination(null, 'https://evil.example/phish')).toBe('/');
  });
});
