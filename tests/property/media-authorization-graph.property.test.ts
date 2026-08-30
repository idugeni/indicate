import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canPublicAccessMedia } from '@/domain/stage4/media-authorization';
import { assertProperty } from '../helpers/property';

// Feature: indicate-mvp, Property 15: Media access follows the exact ownership and publication graph
// **Validates: Requirements 11.7, 11.8, 11.9, 11.14, 11.15, 11.23, 11.24, 11.25, 11.27, 21.10, 21.30**
describe('Property 15', () => { it('authorizes only exact active Site references or published Article relations', () => {
  assertProperty('Property 15: Media access follows the exact ownership and publication graph', fc.property(fc.uuid(), fc.uuid(), fc.uuid(), fc.uuid(), fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(), (org, siteId, articleId, mediaId, sameOrg, published, settingsReference, articleActive) => {
    const mediaOrg = sameOrg ? org : crypto.randomUUID();
    const media = { id: mediaId, organizationId: mediaOrg, objectKey: `articles/${articleId}/x-safe.jpg`, purpose: 'lead', mediaType: 'image/jpeg', sizeBytes: 10, checksum: 'sum', owner: { kind: 'article' as const, articleId }, state: 'active' as const, version: 1, createdAt: '', updatedAt: '' };
    const context = { normalizedHostname: 'site.example.test', organizationId: org, domainId: crypto.randomUUID(), siteId, regionId: null, routingVersion: 1 };
    const site = { id: siteId, organizationId: org, active: true, normalizedHostname: context.normalizedHostname, settingsMediaIds: settingsReference ? [mediaId] : [] };
    const articles = [{ id: articleId, organizationId: org, active: articleActive, leadMediaId: mediaId }];
    const articleSites = [{ id: crypto.randomUUID(), organizationId: org, articleId, siteId, active: true, state: published ? 'published' as const : 'queued' as const, publishedUrl: published ? 'https://site.example.test/a' : null, publishedAt: published ? '' : null, version: 1 }];
    expect(canPublicAccessMedia({ context, media, site, articles, articleSites })).toBe(sameOrg && (settingsReference || (published && articleActive)));
  }));
}); });
