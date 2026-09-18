import { describe, expect, it } from 'vitest';

import { planInvalidation } from '@/modules/delivery/invalidation';

describe('planInvalidation', () => {
  it('memetakan mutasi artikel ke path dan tag', () => {
    const plan = planInvalidation({
      kind: 'article',
      organizationId: 'org-1',
      siteId: 'site-1',
      hostname: 'portal.example',
      articleSlug: 'berita-utama',
      categorySlug: 'politik',
    });
    expect(plan.paths).toContain('/berita-utama');
    expect(plan.paths).toContain('/categories/politik');
    expect(plan.tags).toContain('article:berita-utama');
    expect(plan.urls).toContain('https://portal.example/berita-utama');
    expect(plan.reason).toBe('article');
  });

  it('memetakan mutasi hostname ke kedua host', () => {
    const plan = planInvalidation({
      kind: 'hostname',
      organizationId: 'org-1',
      siteId: 'site-1',
      previousHostname: 'lama.example',
      currentHostname: 'baru.example',
    });
    expect(plan.previousHostname).toBe('lama.example');
    expect(plan.currentHostname).toBe('baru.example');
    expect(plan.urls.some((url) => url.startsWith('https://lama.example/'))).toBe(true);
    expect(plan.urls.some((url) => url.startsWith('https://baru.example/'))).toBe(true);
  });

  it('memetakan mutasi publisher ke banyak slug', () => {
    const plan = planInvalidation({
      kind: 'publisher',
      organizationId: 'org-1',
      siteId: 'site-1',
      hostname: 'portal.example',
      articleSlugs: ['a-satu', 'a-dua'],
    });
    expect(plan.paths).toContain('/a-satu');
    expect(plan.paths).toContain('/a-dua');
    expect(plan.tags).toContain('article:a-dua');
  });

  it('mengurutkan tags paths urls secara deterministik', () => {
    const first = planInvalidation({
      kind: 'publication',
      organizationId: 'org-1',
      siteId: 'site-1',
      hostname: 'portal.example',
      articleSlug: 'berita-utama',
    });
    const second = planInvalidation({
      kind: 'publication',
      organizationId: 'org-1',
      siteId: 'site-1',
      hostname: 'portal.example',
      articleSlug: 'berita-utama',
    });
    expect(first).toEqual(second);
    const sorted = [...first.tags].sort();
    expect(first.tags).toEqual(sorted);
  });
});
