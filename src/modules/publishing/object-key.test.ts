import { describe, expect, it } from 'vitest';

import {
  buildScopedObjectKey,
  buildStructuredObjectKey,
  buildThumbObjectKey,
  createCollisionToken,
  isLegacyMediaKey,
  isPublicObjectKey,
  isPublicPurpose,
  normalizePurpose,
  objectKeyPrefix,
} from '@/modules/publishing/object-key';

describe('objectKeyPrefix', () => {
  it('memetakan prefix per jenis owner', () => {
    expect(objectKeyPrefix({ kind: 'article', articleId: 'a-1' })).toBe('articles/a-1/');
    expect(objectKeyPrefix({ kind: 'site', siteId: 's-1' })).toBe('sites/s-1/');
    expect(objectKeyPrefix({ kind: 'organization' })).toBe('assets/');
  });
});

describe('buildThumbObjectKey', () => {
  it('menyisipkan infix thumb sebelum ekstensi', () => {
    expect(buildThumbObjectKey('articles/a-1/foto-abcd1234.jpg')).toBe('articles/a-1/foto-abcd1234-thumb.jpg');
    expect(buildThumbObjectKey('assets/file')).toBe('assets/file-thumb');
  });

  it('mempertahankan prefix publik pada thumb', () => {
    expect(buildThumbObjectKey('pub/o/org/p/article-cover/y=2026/m=09/organization/23-foto-abcdef1234567890.webp')).toBe(
      'pub/o/org/p/article-cover/y=2026/m=09/organization/23-foto-abcdef1234567890-thumb.webp',
    );
  });
});

describe('visibilitas publik', () => {
  it('membedakan purpose artikel dari privat', () => {
    expect(isPublicPurpose('article-cover')).toBe(true);
    expect(isPublicPurpose('article-image')).toBe(true);
    expect(isPublicPurpose('site-logo')).toBe(false);
    expect(isPublicPurpose('organization-asset')).toBe(false);
    expect(isPublicPurpose('tak-dikenal')).toBe(false);
  });

  it('membedakan key publik dari privat', () => {
    expect(isPublicObjectKey('pub/o/org/p/article-cover/y=2026/f.webp')).toBe(true);
    expect(isPublicObjectKey('o/org/p/article-cover/y=2026/f.webp')).toBe(false);
    expect(isPublicObjectKey('articles/a-1/f.webp')).toBe(false);
    expect(isPublicObjectKey('')).toBe(false);
  });

  it('memberi prefix pub untuk visibilitas publik', () => {
    const key = buildScopedObjectKey({
      owner: { kind: 'organization' },
      organizationId: '0199a2b3-4c5d-7e8f-9012-3456789abc00',
      purpose: 'article-cover',
      filename: 'sampul.jpg',
      collisionToken: 'k9m2qx7v4a1b8c3d',
      now: new Date('2026-09-23T10:00:00.000Z'),
      visibility: 'public',
    });
    expect(key.startsWith('pub/o/')).toBe(true);
    expect(isPublicObjectKey(key)).toBe(true);
  });
});

describe('buildStructuredObjectKey', () => {
  it('membersihkan nama file dan menempel token tabrakan', () => {
    expect(buildStructuredObjectKey({ kind: 'article', articleId: 'a-1' }, 'Foto Acara.JPG', 'collisiontokenabcdef')).toBe(
      'articles/a-1/foto-acara-collisiontokenabcdef.jpg',
    );
  });

  it('menolak token tabrakan yang terlalu pendek', () => {
    expect(() => buildStructuredObjectKey({ kind: 'site', siteId: 's-1' }, 'f.jpg', 'id-1')).toThrow();
  });
});

describe('buildScopedObjectKey', () => {
  const org = '0199a2b3-4c5d-7e8f-9012-3456789abc00';
  const article = '0199a2b3-4c5d-7e8f-9012-3456789abcde';
  const now = new Date('2026-09-23T10:00:00.000Z');

  it('membangun key tenant-scoped untuk inline artikel', () => {
    expect(
      buildScopedObjectKey({
        owner: { kind: 'organization' },
        organizationId: org,
        purpose: 'article-inline',
        filename: 'Suasana Pasar Pagi.webp',
        collisionToken: 'k9m2qx7v4a1b8c3d',
        now,
      }),
    ).toBe(`o/${org}/p/article-inline/y=2026/m=09/organization/23-suasana-pasar-pagi-k9m2qx7v4a1b8c3d.webp`);
  });

  it('membangun key artikel dengan segmen owner', () => {
    const key = buildScopedObjectKey({
      owner: { kind: 'article', articleId: article },
      organizationId: org,
      purpose: 'article-image',
      filename: 'foto.jpg',
      collisionToken: '0123456789abcdef',
      now,
    });
    expect(key).toBe(`o/${org}/p/article-image/y=2026/m=09/article/${article}/23-foto-0123456789abcdef.jpg`);
    expect(buildThumbObjectKey(key)).toBe(`o/${org}/p/article-image/y=2026/m=09/article/${article}/23-foto-0123456789abcdef-thumb.jpg`);
  });

  it('menolak token selain 16 karakter dan organisasi bukan uuid', () => {
    expect(() =>
      buildScopedObjectKey({
        owner: { kind: 'organization' },
        organizationId: org,
        purpose: 'article-inline',
        filename: 'a.jpg',
        collisionToken: 'pendek',
        now,
      }),
    ).toThrow();
    expect(() =>
      buildScopedObjectKey({
        owner: { kind: 'organization' },
        organizationId: 'org-1',
        purpose: 'article-inline',
        filename: 'a.jpg',
        collisionToken: '0123456789abcdef',
        now,
      }),
    ).toThrow();
  });
});

describe('purpose helpers', () => {
  it('menormalkan purpose legacy dan mendeteksi key lama', () => {
    expect(normalizePurpose('inline_article')).toBe('article-inline');
    expect(normalizePurpose('article-image')).toBe('article-image');
    expect(normalizePurpose('acak')).toBe('organization-asset');
    expect(createCollisionToken()).toMatch(/^[0-9a-f]{16}$/);
    expect(isLegacyMediaKey('assets/foto-abc.jpg')).toBe(true);
    expect(isLegacyMediaKey('o/org/p/article-inline/y=2026/m=09/organization/23-a-b.webp')).toBe(false);
  });
});
