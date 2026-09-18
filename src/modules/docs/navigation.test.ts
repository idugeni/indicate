import { describe, expect, it } from 'vitest';

import { DOCS_PAGES, DOCS_SECTIONS, docsPage } from '@/modules/docs/navigation';

describe('DOCS_PAGES', () => {
  it('mendaftarkan delapan halaman dengan slug dan path unik', () => {
    expect(DOCS_PAGES).toHaveLength(8);
    expect(new Set(DOCS_PAGES.map((page) => page.slug)).size).toBe(8);
    expect(new Set(DOCS_PAGES.map((page) => page.path)).size).toBe(8);
  });

  it('memakai path absolut dan metadata terisi', () => {
    for (const page of DOCS_PAGES) {
      expect(page.path.startsWith('/')).toBe(true);
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.description.length).toBeGreaterThan(0);
      expect(DOCS_SECTIONS).toContain(page.section);
    }
  });

  it('menempatkan beranda pada path akar', () => {
    expect(DOCS_PAGES.find((page) => page.slug === 'home')?.path).toBe('/');
  });
});

describe('docsPage', () => {
  it('menemukan halaman per slug', () => {
    expect(docsPage('home')?.title).toBe('Dokumentasi Indicate');
    expect(docsPage('quickstart')?.path).toBe('/quickstart');
    expect(docsPage('openapi')?.section).toBe('Operasi');
  });

  it('mengembalikan null untuk slug asing atau kosong', () => {
    expect(docsPage('tidak-ada')).toBe(null);
    expect(docsPage('')).toBe(null);
  });
});
