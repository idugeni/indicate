import { describe, expect, it } from 'vitest';
import { resolveGoogleSiteVerification } from '@/core/config/google-verification';

describe('resolveGoogleSiteVerification', () => {
  it('mengembalikan token valid yang sudah dipangkas', () => {
    expect(resolveGoogleSiteVerification({ GOOGLE_SITE_VERIFICATION: '  dBw4xYz_9-ABCdef1234567890abcDEF  ' })).toBe(
      'dBw4xYz_9-ABCdef1234567890abcDEF',
    );
  });

  it('mengembalikan undefined saat kosong atau format salah', () => {
    expect(resolveGoogleSiteVerification({})).toBe(undefined);
    expect(resolveGoogleSiteVerification({ GOOGLE_SITE_VERIFICATION: '' })).toBe(undefined);
    expect(resolveGoogleSiteVerification({ GOOGLE_SITE_VERIFICATION: 'pendek' })).toBe(undefined);
    expect(resolveGoogleSiteVerification({ GOOGLE_SITE_VERIFICATION: '<meta content=x>' })).toBe(undefined);
  });
});
