import { describe, expect, it } from 'vitest';

import { controlPlaneLlmsFull, tenantLlmsFull } from '@/app/llms-full.txt/route-helpers';

describe('controlPlaneLlmsFull', () => {
  it('memuat ringkasan plus indeks machine-surface', () => {
    const body = controlPlaneLlmsFull('indicate.website');
    expect(body).toContain('# Indicate');
    expect(body).toContain('## Full');
    expect(body).toContain('(https://indicate.website/news-sitemap.xml)');
    expect(body).toContain('(https://indicate.website/robots.txt)');
    expect(body).toContain('(https://indicate.website/.well-known/security.txt)');
    expect(body).toContain('(https://indicate.website/ads.txt)');
  });

  it('tetap menyematkan direktori portal dan partner', () => {
    const body = controlPlaneLlmsFull(
      'indicate.website',
      [{ name: 'Portal Uji', hostname: 'portaluji.web.id' }],
      [{ name: 'Mitra Contoh' }],
    );
    expect(body).toContain('- [Portal Uji](https://portaluji.web.id)');
    expect(body).toContain('- Mitra Contoh');
  });
});

describe('tenantLlmsFull', () => {
  it('melewati batas 30 artikel versi ringkas dan menautkan feed', () => {
    const articles = Array.from({ length: 40 }, (slot, index) => ({ title: `A${index}`, slug: `a-${index}`, href: `/a-${index}` }));
    const body = tenantLlmsFull('portal.example', 'Portal', 'Kabar terkini', ['Teknologi'], articles);
    expect(body).toContain('## Liputan lengkap');
    expect(body).toContain('a-30');
    expect(body).toContain('(https://portal.example/rss.xml)');
    expect(body).toContain('(https://portal.example/news-sitemap.xml)');
    expect(body).toContain('(https://portal.example/sitemap.xml)');
  });

  it('membatasi liputan pada 100 artikel', () => {
    const articles = Array.from({ length: 110 }, (slot, index) => ({ title: `A${index}`, slug: `a-${index}`, href: `/a-${index}` }));
    const body = tenantLlmsFull('portal.example', 'Portal', 'Deskripsi', [], articles);
    expect(body).toContain('a-99');
    expect(body).not.toContain('a-100');
  });
});
