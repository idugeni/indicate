import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from '@/core/security/safe-redirect-path';

describe('safeRedirectPath', () => {
  it('mengembalikan akar untuk null dan path absolut', () => {
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('https://evil.example/phish')).toBe('/');
    expect(safeRedirectPath('//evil.example/phish')).toBe('/');
  });

  it('menolak backslash dan skema non-path', () => {
    expect(safeRedirectPath('/a\\b')).toBe('/');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/');
    expect(safeRedirectPath('dashboard')).toBe('/');
  });

  it('mempertahankan path, query, dan hash relatif', () => {
    expect(safeRedirectPath('/dashboard?tab=ops#main')).toBe('/dashboard?tab=ops#main');
    expect(safeRedirectPath('/')).toBe('/');
  });
});
