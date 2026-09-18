import { describe, expect, it } from 'vitest';

import { canPublicAccessMedia, canTenantAccessMedia } from '@/modules/publishing/media-authorization';
import type {
  MediaAssetRecord,
  PublishingArticleRef,
  PublishingArticleSiteRef,
  PublishingSiteRef,
} from '@/modules/publishing/models';

function media(lewat: Partial<MediaAssetRecord> = {}): MediaAssetRecord {
  return {
    id: 'm1',
    organizationId: 'o1',
    objectKey: 'media/m1.jpg',
    purpose: 'lead',
    mediaType: 'image/jpeg',
    sizeBytes: 1024,
    checksum: 'abc',
    thumbObjectKey: null,
    owner: { kind: 'article', articleId: 'a1' },
    state: 'active',
    version: 1,
    createdAt: '2026-09-14T10:00:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
    ...lewat,
  };
}

function situs(lewat: Partial<PublishingSiteRef> = {}): PublishingSiteRef {
  return {
    id: 's1',
    organizationId: 'o1',
    active: true,
    normalizedHostname: 'portal.example',
    settingsMediaIds: [],
    ...lewat,
  };
}

function artikel(lewat: Partial<PublishingArticleRef> = {}): PublishingArticleRef {
  return {
    id: 'a1',
    organizationId: 'o1',
    active: true,
    leadMediaId: 'm1',
    title: 'Judul',
    slug: 'judul',
    ...lewat,
  };
}

function relasi(lewat: Partial<PublishingArticleSiteRef> = {}): PublishingArticleSiteRef {
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
    ...lewat,
  };
}

const konteks = {
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
  it('mengizinkan media yang terdaftar di pengaturan situs', () => {
    const hasil = canPublicAccessMedia({
      context: konteks,
      media: media({ owner: { kind: 'organization' } }),
      site: situs({ settingsMediaIds: ['m1'] }),
      articles: [],
      articleSites: [],
    });
    expect(hasil).toBe(true);
  });

  it('mengizinkan media artikel yang tayang di situs', () => {
    const hasil = canPublicAccessMedia({
      context: konteks,
      media: media(),
      site: situs(),
      articles: [artikel()],
      articleSites: [relasi()],
    });
    expect(hasil).toBe(true);
  });

  it('menolak media tidak aktif atau beda organisasi', () => {
    const dasar = { context: konteks, site: situs(), articles: [artikel()], articleSites: [relasi()] };
    expect(canPublicAccessMedia({ ...dasar, media: media({ state: 'archived' }) })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, media: media({ organizationId: 'o2' }) })).toBe(false);
  });

  it('menolak situs yang tidak cocok atau nonaktif', () => {
    const dasar = { context: konteks, media: media(), articles: [artikel()], articleSites: [relasi()] };
    expect(canPublicAccessMedia({ ...dasar, site: situs({ id: 's2' }) })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, site: situs({ active: false }) })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, site: situs({ organizationId: 'o2' }) })).toBe(false);
  });

  it('menolak pemilik non-artikel di luar pengaturan situs', () => {
    const hasil = canPublicAccessMedia({
      context: konteks,
      media: media({ owner: { kind: 'site', siteId: 's1' } }),
      site: situs(),
      articles: [artikel()],
      articleSites: [relasi()],
    });
    expect(hasil).toBe(false);
  });

  it('menolak artikel yang hilang, nonaktif, atau beda organisasi', () => {
    const dasar = { context: konteks, media: media(), site: situs(), articleSites: [relasi()] };
    expect(canPublicAccessMedia({ ...dasar, articles: [] })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, articles: [artikel({ active: false })] })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, articles: [artikel({ organizationId: 'o2' })] })).toBe(false);
  });

  it('menolak relasi yang belum tayang atau tidak cocok', () => {
    const dasar = { context: konteks, media: media(), site: situs(), articles: [artikel()] };
    expect(canPublicAccessMedia({ ...dasar, articleSites: [] })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, articleSites: [relasi({ state: 'queued' })] })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, articleSites: [relasi({ active: false })] })).toBe(false);
    expect(canPublicAccessMedia({ ...dasar, articleSites: [relasi({ siteId: 's2' })] })).toBe(false);
  });
});
