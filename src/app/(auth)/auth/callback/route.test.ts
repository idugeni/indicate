import { describe, expect, it } from 'vitest';

import { resolveCallbackDestination, resolveTokenKind } from '@/app/(auth)/auth/callback/route';

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

describe('resolveTokenKind', () => {
  it('meneruskan tipe tautan email yang didukung', () => {
    expect(resolveTokenKind('signup')).toBe('signup');
    expect(resolveTokenKind('magiclink')).toBe('magiclink');
    expect(resolveTokenKind('recovery')).toBe('recovery');
    expect(resolveTokenKind('email')).toBe('email');
  });

  it('jatuh ke kode email untuk tipe asing', () => {
    expect(resolveTokenKind(null)).toBe('email');
    expect(resolveTokenKind('phone')).toBe('email');
  });
});
