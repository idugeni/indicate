import { describe, expect, it } from 'vitest';

import {
  buildStructuredObjectKey,
  buildThumbObjectKey,
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
