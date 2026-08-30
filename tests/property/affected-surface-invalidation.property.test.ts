import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { planInvalidation } from '@/application/stage5/invalidation';
import { assertProperty } from '../helpers/property';

describe('Property 30: Invalidation planning covers every affected Site surface', () => {
  // Feature: indicate-mvp, Property 30: Invalidation planning covers every affected Site surface
  // **Validates: Requirements 11.26, 15.16, 16.9, 16.10, 16.11, 16.12**
  it('covers exact current and previous hosts without unrelated hostnames', () => {
    assertProperty('Property 30: Invalidation planning covers every affected Site surface', fc.property(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/), (label, slug) => {
      const host = `${label}.example.web.id`; const previous = `old-${host}`; const article = planInvalidation({ kind: 'article', organizationId: 'org', siteId: 'site', hostname: host, articleSlug: slug, categorySlug: 'daerah' });
      for (const path of ['/', '/articles', '/search', '/robots.txt', '/sitemap.xml', '/rss.xml', `/articles/${slug}`, '/categories/daerah']) expect(article.paths).toContain(path);
      expect(article.urls.every((url) => new URL(url).hostname === host)).toBe(true);
      const moved = planInvalidation({ kind: 'hostname', organizationId: 'org', siteId: 'site', previousHostname: previous, currentHostname: host }); expect(moved.tags).toContain(`host:${previous}`); expect(moved.tags).toContain(`host:${host}`); expect(new Set(moved.urls.map((url) => new URL(url).hostname))).toEqual(new Set([previous, host]));
    }));
  });
});
