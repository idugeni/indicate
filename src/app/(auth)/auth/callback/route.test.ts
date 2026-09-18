import { describe, expect, it } from 'vitest';

import { resolveCallbackDestination } from '@/app/(auth)/auth/callback/route';

describe('resolveCallbackDestination', () => {
  it('memakai dashboard kecuali alur recovery', () => {
    expect(resolveCallbackDestination(null, null)).toBe('/dashboard');
    expect(resolveCallbackDestination('recovery', null)).toBe('/update-password');
  });

  it('mengutamakan next yang sudah dibersihkan', () => {
    expect(resolveCallbackDestination(null, '/dashboard?tab=ops')).toBe('/dashboard?tab=ops');
    expect(resolveCallbackDestination('recovery', 'https://evil.example/phish')).toBe('/');
  });
});
