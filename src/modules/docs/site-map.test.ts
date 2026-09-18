import { describe, expect, it } from 'vitest';

import { docsLlms, docsSitemap } from '@/modules/docs/site-map';
import { DOCS_PAGES } from '@/modules/docs/navigation';

describe('docsSitemap', () => {
  it('memuat semua halaman dengan tanggal hari ini', () => {
    const today = new Date().toISOString().slice(0, 10);
    const sitemap = docsSitemap('docs.example');
    expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    for (const page of DOCS_PAGES) {
      expect(sitemap).toContain(`https://docs.example${page.path}`);
    }
    expect(sitemap).toContain(`<lastmod>${today}</lastmod>`);
  });

  it('memprioritaskan beranda harian di atas halaman mingguan', () => {
    const sitemap = docsSitemap('docs.example');
    expect(sitemap).toContain(
      '<loc>https://docs.example/</loc><lastmod>' +
        new Date().toISOString().slice(0, 10) +
        '</lastmod><changefreq>daily</changefreq><priority>1.0</priority>',
    );
    expect(sitemap).toContain('<changefreq>weekly</changefreq><priority>0.7</priority>');
  });

  it('meloloskan karakter xml pada host', () => {
    const sitemap = docsSitemap('docs.example/a&b');
    expect(sitemap).toContain('https://docs.example/a&amp;b/');
    expect(sitemap).not.toContain('a&b/');
  });
});

describe('docsLlms', () => {
  it('membuka dengan judul dan ringkasan layanan', () => {
    const llms = docsLlms('docs.example');
    expect(llms.startsWith('# Dokumentasi Indicate')).toBe(true);
    expect(llms).toContain('## Halaman');
  });

  it('menautkan setiap halaman beserta spesifikasinya', () => {
    const llms = docsLlms('docs.example');
    for (const page of DOCS_PAGES) {
      expect(llms).toContain(`[${page.title}](https://docs.example${page.path})`);
    }
    expect(llms).toContain('[Spesifikasi OpenAPI](https://docs.example/openapi.json)');
  });
});
