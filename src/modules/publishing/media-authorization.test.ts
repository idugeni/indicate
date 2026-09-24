import { describe, expect, it } from 'vitest';

import { canPublicAccessMedia, canTenantAccessMedia } from '@/modules/publishing/media-authorization';
import type {
  MediaAssetRecord,
  PublishingArticleRef,
  PublishingArticleSiteRef,
  PublishingSiteRef,
} from '@/modules/publishing/models';

function media(overrides: Partial<MediaAssetRecord> = {}): MediaAssetRecord {
  return {
    id: 'm1',
    organizationId: 'o1',
    objectKey: 'media/m1.jpg',
    purpose: 'lead',
    mediaType: 'image/jpeg',
    sizeBytes: 1024,
    checksum: 'abc',
    thumbObjectKey: null,
    widthPx: null,
    heightPx: null,
    altText: null,
    caption: null,
    sortOrder: 0,
    focalX: null,
    focalY: null,
    owner: { kind: 'article', articleId: 'a1' },
    state: 'active',
    version: 1,
    createdAt: '2026-09-14T10:00:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
    ...overrides,
  };
}

function site(overrides: Partial<PublishingSiteRef> = {}): PublishingSiteRef {
  return {
    id: 's1',
    organizationId: 'o1',
    active: true,
    normalizedHostname: 'portal.example',
    settingsMediaIds: [],
    ...overrides,
  };
}

function article(overrides: Partial<PublishingArticleRef> = {}): PublishingArticleRef {
  return {
    id: 'a1',
    organizationId: 'o1',
    active: true,
    leadMediaId: 'm1',
    title: 'Judul',
    slug: 'judul',
    ...overrides,
  };
}

function relation(overrides: Partial<PublishingArticleSiteRef> = {}): PublishingArticleSiteRef {
  return {
    id: 'as1',
    organizationId: 'o1',
    articleId: 'a1',
    siteId: 's1',
    active: true,
    state: 'published',
    publishedUrl: 'https://portal.example/judul',
    publishedAt: '2026-09-14T10:00:00.000Z',
    version: 1,
    ...overrides,
  };
}

const context = {
  normalizedHostname: 'portal.example',
  organizationId: 'o1',
  domainId: 'd1',
  siteId: 's1',
  regionId: null,
  routingVersion: 1,
};

describe('canTenantAccessMedia', () => {
  it('mengizinkan media aktif milik organisasi sendiri', () => {
    expect(canTenantAccessMedia('o1', media())).toBe(true);
  });

  it('menolak media organisasi lain', () => {
    expect(canTenantAccessMedia('o2', media())).toBe(false);
  });

  it('menolak media yang ditolak atau diarsipkan', () => {
    expect(canTenantAccessMedia('o1', media({ state: 'rejected' }))).toBe(false);
    expect(canTenantAccessMedia('o1', media({ state: 'archived' }))).toBe(false);
  });
});

describe('canPublicAccessMedia', () => {
  it('mengizinkan media yang terdaftar di pengaturan site', () => {
    const result = canPublicAccessMedia({
      context: context,
      media: media({ owner: { kind: 'organization' } }),
      site: site({ settingsMediaIds: ['m1'] }),
      articles: [],
      articleSites: [],
    });
    expect(result).toBe(true);
  });

  it('mengizinkan media article yang tayang di site', () => {
    const result = canPublicAccessMedia({
      context: context,
      media: media(),
      site: site(),
      articles: [article()],
      articleSites: [relation()],
    });
    expect(result).toBe(true);
  });

  it('menolak media tidak aktif atau beda organisasi', () => {
    const base = { context: context, site: site(), articles: [article()], articleSites: [relation()] };
    expect(canPublicAccessMedia({ ...base, media: media({ state: 'archived' }) })).toBe(false);
    expect(canPublicAccessMedia({ ...base, media: media({ organizationId: 'o2' }) })).toBe(false);
  });

  it('menolak site yang tidak cocok atau nonaktif', () => {
    const base = { context: context, media: media(), articles: [article()], articleSites: [relation()] };
    expect(canPublicAccessMedia({ ...base, site: site({ id: 's2' }) })).toBe(false);
    expect(canPublicAccessMedia({ ...base, site: site({ active: false }) })).toBe(false);
    expect(canPublicAccessMedia({ ...base, site: site({ organizationId: 'o2' }) })).toBe(false);
  });

  it('menolak pemilik non-article di luar pengaturan site', () => {
    const result = canPublicAccessMedia({
      context: context,
      media: media({ owner: { kind: 'site', siteId: 's1' } }),
      site: site(),
      articles: [article()],
      articleSites: [relation()],
    });
    expect(result).toBe(false);
  });

  it('menolak article yang hilang, nonaktif, atau beda organisasi', () => {
    const base = { context: context, media: media(), site: site(), articleSites: [relation()] };
    expect(canPublicAccessMedia({ ...base, articles: [] })).toBe(false);
    expect(canPublicAccessMedia({ ...base, articles: [article({ active: false })] })).toBe(false);
    expect(canPublicAccessMedia({ ...base, articles: [article({ organizationId: 'o2' })] })).toBe(false);
  });

  it('menolak relation yang belum tayang atau tidak cocok', () => {
    const base = { context: context, media: media(), site: site(), articles: [article()] };
    expect(canPublicAccessMedia({ ...base, articleSites: [] })).toBe(false);
    expect(canPublicAccessMedia({ ...base, articleSites: [relation({ state: 'queued' })] })).toBe(false);
    expect(canPublicAccessMedia({ ...base, articleSites: [relation({ active: false })] })).toBe(false);
    expect(canPublicAccessMedia({ ...base, articleSites: [relation({ siteId: 's2' })] })).toBe(false);
  });
});
