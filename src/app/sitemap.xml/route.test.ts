import { describe, expect, it } from 'vitest';

import { controlPlaneSitemap } from '@/app/sitemap.xml/route';

describe('controlPlaneSitemap', () => {
  it('mencakup root harian prioritas satu dan layanan mingguan', () => {
    const xml = controlPlaneSitemap('indicate.web.id');
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://indicate.web.id/</loc><lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq><priority>1.0</priority>');
    expect(xml).toContain('<loc>https://indicate.web.id/pricing</loc>');
    expect(xml).toContain('<changefreq>weekly</changefreq><priority>0.7</priority>');
  });
});
