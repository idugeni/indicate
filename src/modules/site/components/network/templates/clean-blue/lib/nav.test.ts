import { describe, expect, it } from 'vitest';

import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { categoryNav } from '@/modules/site/components/network/templates/clean-blue/lib/nav';

function makeArticle(categorySlug: string | null, categoryName: string | null): NetworkArticle {
  return {
    id: `id-${categorySlug ?? 'none'}-${categoryName ?? 'none'}`,
    slug: `slug-${categorySlug ?? 'none'}`,
    title: 'Judul',
    description: 'Deskripsi singkat.',
    body: 'Isi berita.',
    tags: [],
    regionId: 'r1',
    categoryId: null,
    categorySlug,
    categoryName,
    authorName: null,
    authorDisplayName: null,
    publisherName: null,
    attribution: 'Redaksi',
    publisherLogoUrl: null,
    publisherCity: null,
    authorBio: null,
    authorAvatarUrl: null,
    publisherVerified: false,
    independent: false,
    officialInstitution: null,
    publishedAt: '2026-09-14T10:00:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
    articleSiteId: 'as1',
    viewCount: 0,
    imageUrl: null,
    thumbnailUrl: null,
    imageWidth: null,
    imageHeight: null,
    gallery: [],
  };
}

function makeSite(
  articles: readonly NetworkArticle[],
  navigation: { readonly label: string; readonly path: string }[] = [],
): NetworkSiteData {
  return {
    context: {
      normalizedHostname: 'portal.example',
      organizationId: 'o1',
      domainId: 'd1',
      siteId: 's1',
      regionId: null,
      routingVersion: 1,
      contentVersion: 1,
    },
    regionName: null,
    settings: {
      name: 'Portal',
      description: 'Deskripsi',
      tagline: null,
      seoDefaultTitle: null,
      seoDefaultDescription: null,
      seoSiteName: null,
      locale: null,
      colors: {},
      socialLinks: {},
      navigation,
      logoUrl: '/brand/logo.svg',
      faviconUrl: null,
      defaultImageUrl: '/brand/default.jpg',
      robots: [],
    },
    articles,
  };
}

describe('categoryNav', () => {
  it('pakai navigasi eksplisit bila diisi, dibatasi limit', () => {
    const site = makeSite([], [
      { label: 'A', path: '/a' },
      { label: 'B', path: '/b' },
      { label: 'C', path: '/c' },
    ]);
    expect(categoryNav(site, 2)).toEqual([
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
    ]);
  });

  it('turunkan kanal unik dari artikel sesuai urutan muncul', () => {
    const site = makeSite([
      makeArticle('nasional', 'Nasional'),
      makeArticle('nasional', 'Nasional'),
      makeArticle(null, null),
      makeArticle('tekno', null),
    ]);
    expect(categoryNav(site)).toEqual([
      { label: 'Nasional', href: '/categories/nasional' },
      { label: 'tekno', href: '/categories/tekno' },
    ]);
  });

  it('kosong bila tanpa navigasi dan tanpa artikel berkategori', () => {
    expect(categoryNav(makeSite([]))).toEqual([]);
  });
});
