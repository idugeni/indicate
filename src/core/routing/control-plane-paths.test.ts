import { describe, expect, it } from 'vitest';

import { SERVICE_PATHS, isServicePath } from '@/core/routing/control-plane-paths';

describe('isServicePath', () => {
  it('menerima path layanan persis dan segmen anak', () => {
    expect(isServicePath('/pricing')).toBe(true);
    expect(isServicePath('/pricing/startup')).toBe(true);
  });

  it('menolak tenant yang hanya berbagi prefix', () => {
    expect(isServicePath('/pricingx')).toBe(false);
    expect(isServicePath('/berita/pricing')).toBe(false);
    expect(isServicePath('/')).toBe(false);
  });

  it('menjaga daftar layanan tetap beku dan terdokumentasi', () => {
    expect(SERVICE_PATHS).toContain('/services');
    expect(Object.isFrozen(SERVICE_PATHS)).toBe(true);
  });
});
