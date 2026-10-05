import { describe, expect, it } from 'vitest';

import { planSitemapSync } from '@/app/api/internal/maintenance/gsc-sitemap-sync/route';

describe('planSitemapSync', () => {
  it('submit saat live tapi belum terdaftar', () => {
    expect(planSitemapSync(false, true)).toBe('submit');
  });

  it('delete saat terdaftar tapi feed kering', () => {
    expect(planSitemapSync(true, false)).toBe('delete');
  });

  it('none saat sudah selaras', () => {
    expect(planSitemapSync(true, true)).toBe('none');
    expect(planSitemapSync(false, false)).toBe('none');
  });
});
