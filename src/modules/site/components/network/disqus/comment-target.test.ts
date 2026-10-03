import { describe, expect, it } from 'vitest';

import { resolveCommentTargetUrl, type CommentTargetScope } from '@/modules/site/components/network/disqus/comment-target';

const scope: CommentTargetScope = { siteId: 'site-a', origin: 'https://portal.example' };

describe('resolveCommentTargetUrl', () => {
  it('menyusun URL absolut dari tautan relatif host', () => {
    expect(resolveCommentTargetUrl(scope, '/artikel-1')).toBe('https://portal.example/artikel-1');
  });

  it('menolak tautan tanpa garis miring di depan', () => {
    expect(resolveCommentTargetUrl(scope, 'artikel-1')).toBeNull();
  });

  it('memangkas spasi di sekitar tautan', () => {
    expect(resolveCommentTargetUrl(scope, '  /artikel-1  ')).toBe('https://portal.example/artikel-1');
  });

  // The reader lands on the origin city portal, whose thread is keyed by that
  // city's site id. Counting this site's thread here would report a discussion
  // nobody will ever see.
  it('menolak tautan lintas host absolut', () => {
    expect(resolveCommentTargetUrl(scope, 'https://kota.example/artikel-1')).toBeNull();
    expect(resolveCommentTargetUrl(scope, 'http://kota.example/artikel-1')).toBeNull();
    expect(resolveCommentTargetUrl(scope, 'HTTPS://kota.example/artikel-1')).toBeNull();
  });

  it('menolak tautan kosong', () => {
    expect(resolveCommentTargetUrl(scope, '')).toBeNull();
    expect(resolveCommentTargetUrl(scope, '   ')).toBeNull();
  });

  it('menolak seluruh scope ketika situs tidak mengaktifkan komentar', () => {
    expect(resolveCommentTargetUrl(null, '/artikel-1')).toBeNull();
  });

  // A protocol-relative or backslash form would otherwise slip past the http
  // check and resolve against a host the portal does not own.
  it('menolak bentuk tautan yang menyamar sebagai relatif', () => {
    expect(resolveCommentTargetUrl(scope, '//evil.example/artikel')).toBeNull();
    expect(resolveCommentTargetUrl(scope, '\\\\evil.example/artikel')).toBeNull();
  });
});
