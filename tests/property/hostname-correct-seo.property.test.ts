import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildSeoDocument, serializeJsonLd, serializeRss, serializeSitemap } from '@/application/stage5/seo';
import type { PublicSiteData } from '@/domain/stage5/models';
import { assertProperty } from '../helpers/property';

describe('Property 28: SEO output is hostname-correct, visible, and syntactically safe', () => {
  // Feature: indicate-mvp, Property 28: SEO output is hostname-correct, visible, and syntactically safe
  // **Validates: Requirements 15.1–15.13, 15.17, 21.8**
  it('uses only the resolved host and safely serializes untrusted content', () => {
    assertProperty('Property 28: SEO output is hostname-correct, visible, and syntactically safe', fc.property(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), fc.string({ maxLength: 40 }), (label, text) => {
      const host = `${label}.example.web.id`; const unsafe = `${text}<script>&\u2028`;
      const site: PublicSiteData = { context: { normalizedHostname: host, organizationId: 'org', domainId: 'domain', siteId: 'site', regionId: null, routingVersion: 1, contentVersion: 1 }, settings: { name: unsafe, description: unsafe, colors: {}, socialLinks: {}, navigation: [], logoUrl: null, faviconUrl: null, fallbackImageUrl: `https://${host}/fallback.jpg`, robots: [] }, articles: [{ id: 'a', slug: 'story', title: unsafe, description: unsafe, body: unsafe, regionId: 'r', categoryId: null, categorySlug: null, categoryName: null, authorName: null, publisherName: null, attribution: unsafe, publisherVerified: false, independent: true, officialInstitution: null, publishedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', imageUrl: null, imageWidth: null, imageHeight: null }] };
      const seo = buildSeoDocument(site, { path: '/articles/story', article: site.articles[0]! }); const json = serializeJsonLd(seo.jsonLd); const sitemap = serializeSitemap(site); const rss = serializeRss(site);
      expect(new URL(seo.canonical!).hostname).toBe(host); expect(json).not.toContain('<script>'); expect(() => JSON.parse(json)).not.toThrow(); expect(sitemap).not.toContain('<script>'); expect(rss).not.toContain('<script>'); expect(`${sitemap}${rss}`).not.toContain('evil.example');
    }));
  });
});
