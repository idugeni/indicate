import { describe, expect, it } from 'vitest';

import { SERVICE_PATHS } from '@/core/routing/control-plane-paths';
import { controlPlaneSitemap } from '@/app/sitemap.xml/route';

describe('controlPlaneSitemap', () => {
  it('memuat root dan seluruh service path sebagai URL absolut', () => {
    const body = controlPlaneSitemap('indicate.website');
    expect(body).toContain('<loc>https://indicate.website/</loc>');
    for (const path of SERVICE_PATHS.filter((service) => service !== '/status')) {
      expect(body).toContain(`<loc>https://indicate.website${path}</loc>`);
    }
  });

  it('mengeluarkan status apex karena status tayang di subdomain', () => {
    const body = controlPlaneSitemap('indicate.website');
    expect(body).not.toContain('<loc>https://indicate.website/status</loc>');
  });

  it('tidak mengirim changefreq dan priority yang diabaikan Google', () => {
    const body = controlPlaneSitemap('indicate.website');
    expect(body).not.toContain('<changefreq>');
    expect(body).not.toContain('<priority>');
    // Setiap entri tetap membawa lastmod, satu-satunya hint yang dipakai Google.
    expect(body).toContain('</loc><lastmod>');
  });

  it('membungkus entri dalam urlset sitemap yang valid', () => {
    const body = controlPlaneSitemap('indicate.website');
    expect(body.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(body.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});
