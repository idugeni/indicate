import { describe, expect, it } from 'vitest';

import { resolveSignOutDestination } from '@/app/(auth)/auth/sign-out/route';

describe('resolveSignOutDestination', () => {
  it('kembali ke sign-in saat tanpa next', () => {
    expect(resolveSignOutDestination(null)).toBe('/sign-in');
  });

  it('membersihkan next dan menolak URL absolut', () => {
    expect(resolveSignOutDestination('/dashboard?tab=ops')).toBe('/dashboard?tab=ops');
    expect(resolveSignOutDestination('https://evil.example/phish')).toBe('/');
  });
});
