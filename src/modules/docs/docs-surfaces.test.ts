import { describe, expect, it } from 'vitest';

import { DOCS_PAGES, DOCS_SECTIONS, docsPage } from '@/modules/docs/navigation';
import { docsPageMetadata } from '@/modules/docs/page-meta';
import { docsLlms, docsSitemap } from '@/modules/docs/site-map';

describe('docs navigation', () => {
  it('setiap halaman masuk tepat satu section terdaftar', () => {
    expect(DOCS_SECTIONS).toEqual(['Mulai', 'Referensi', 'Operasi']);
    for (const page of DOCS_PAGES) expect(DOCS_SECTIONS).toContain(page.section);
    expect(new Set(DOCS_PAGES.map((page) => page.slug)).size).toBe(DOCS_PAGES.length);
  });

  it('mencari halaman per slug dan null untuk asing', () => {
    expect(docsPage('telegram')?.title).toBe('Bot Telegram');
    expect(docsPage('tidak-ada')).toBe(null);
  });
});

describe('docsPageMetadata', () => {
  it('membentuk metadata kanonik per halaman', () => {
    const metadata = docsPageMetadata('docs.example', 'telegram');
    expect(metadata.title).toEqual({ absolute: 'Bot Telegram | Indicate Docs' });
    const alternates = metadata.alternates as { canonical: string };
    expect(alternates.canonical).toBe('https://docs.example/telegram');
  });

  it('beranda tanpa suffix dan 404 untuk slug asing', () => {
    const home = docsPageMetadata('docs.example', 'home');
    expect(home.title).toEqual({ absolute: 'Dokumentasi Indicate' });
    expect(docsPageMetadata('docs.example', 'asing')).toMatchObject({ title: 'Not Found' });
  });
});

describe('docs site surfaces', () => {
  it('membuat sitemap dengan semua halaman', () => {
    const sitemap = docsSitemap('docs.example');
    expect(sitemap).toContain('https://docs.example/telegram');
    expect(sitemap).toContain('<changefreq>daily</changefreq>');
    expect(sitemap).toContain('<priority>1.0</priority>');
  });

  it('membuat llms.txt dengan tautan openapi', () => {
    const llms = docsLlms('docs.example');
    expect(llms).toContain('# Dokumentasi Indicate');
    expect(llms).toContain('https://docs.example/openapi.json');
  });
});
