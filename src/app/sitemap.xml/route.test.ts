import { describe, expect, it } from 'vitest';

import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';
import { controlPlaneSitemap } from '@/app/sitemap.xml/route';

describe('controlPlaneSitemap', () => {
  it('memuat root dan seluruh service path sebagai URL absolut', () => {
    const body = controlPlaneSitemap('indicate.web.id');
    expect(body).toContain('<loc>https://indicate.web.id/</loc>');
    for (const path of SERVICE_PATHS) {
      expect(body).toContain(`<loc>https://indicate.web.id${path}</loc>`);
    }
  });

  it('memberi prioritas tertinggi pada beranda', () => {
    const body = controlPlaneSitemap('indicate.web.id');
    expect(body).toContain('<changefreq>daily</changefreq><priority>1.0</priority>');
    expect(body).toContain('<changefreq>weekly</changefreq><priority>0.7</priority>');
  });

  it('membungkus entri dalam urlset sitemap yang valid', () => {
    const body = controlPlaneSitemap('indicate.web.id');
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(body.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});
