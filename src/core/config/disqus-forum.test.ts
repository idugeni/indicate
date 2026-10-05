import { describe, expect, it } from 'vitest';

import { disqusLanguage, disqusThreadIdentifier, resolveDisqusShortname } from '@/core/config/disqus-forum';

describe('resolveDisqusShortname', () => {
  it('menerima label forum yang valid', () => {
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: 'indicate' })).toBe('indicate');
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: 'berita-jatim-9' })).toBe('berita-jatim-9');
  });

  it('memangkas spasi di sekitar nilai', () => {
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: ' -portal-  ' })).toBeUndefined();
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: '  portal  ' })).toBe('portal');
  });

  it('menolak nilai kosong dan yang belum diisi', () => {
    expect(resolveDisqusShortname({})).toBeUndefined();
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: '' })).toBeUndefined();
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: '   ' })).toBeUndefined();
  });

  it('membaca nilai bawaan proses tanpa argumen agar bisa ditanam bundler', () => {
    const previous = process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
    process.env.NEXT_PUBLIC_DISQUS_SHORTNAME = 'indicate-1';
    try {
      expect(resolveDisqusShortname()).toBe('indicate-1');
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_DISQUS_SHORTNAME;
      else process.env.NEXT_PUBLIC_DISQUS_SHORTNAME = previous;
    }
    expect(resolveDisqusShortname()).toBeUndefined();
  });

  // The shortname becomes the host of https://<shortname>.disqus.com/embed.js, so
  // anything that can redirect that script to another origin must never survive.
  it.each([
    ['jalur absolut', 'evil.com/embed.js', false],
    ['port eksplisit', 'evil.com:8443', false],
    ['kredensial', 'user@evil.com', false],
    ['hash', 'evil.com#', false],
    ['wildcard', '*.disqus.com', false],
    ['path traversal', '../../evil', false],
    ['host hugging', 'a.disqus.com.evil.com', false],
    ['huruf besar', 'Indicate', false],
    ['underscore', 'indicate_forum', false],
    ['spasi internal', 'indicate forum', false],
    ['label terlalu pendek', 'ab', false],
    ['hyphen di awal', '-indicate', false],
    ['hyphen di akhir', 'indicate-', false],
    ['newline', 'indicate\n.evil.com', false],
    ['label tepat 63 karakter', `a${'b'.repeat(62)}`, true],
    ['label 64 karakter', `a${'b'.repeat(63)}`, false],
  ])('%s -> %s', (label, value, accepted) => {
    expect(resolveDisqusShortname({ NEXT_PUBLIC_DISQUS_SHORTNAME: value })).toBe(accepted ? value : undefined);
  });
});

describe('disqusThreadIdentifier', () => {
  // Threads are keyed by shortname + identifier under one network-wide forum, so
  // a bare article id would merge every portal's discussion into one.
  it('memisahkan thread per situs untuk artikel yang sama', () => {
    const article = '11111111-1111-4111-8111-111111111111';
    const kota = disqusThreadIdentifier('site-a', article);
    const regions = disqusThreadIdentifier('site-b', article);
    expect(kota).not.toBe(regions);
    expect(kota).toBe(`site-a:${article}`);
  });

  it('stabil untuk thread yang sama', () => {
    expect(disqusThreadIdentifier('site-a', 'art-1')).toBe(disqusThreadIdentifier('site-a', 'art-1'));
  });

  it('memisahkan artikel berbeda dalam satu situs', () => {
    expect(disqusThreadIdentifier('site-a', 'art-1')).not.toBe(disqusThreadIdentifier('site-a', 'art-2'));
  });

  // Both arguments are uuid columns, so the `:` separator cannot appear in either.
  it('tidak ambigu untuk pasangan uuid yang berbeda', () => {
    const site = '11111111-1111-4111-8111-111111111111';
    const otherSite = '22222222-2222-4222-8222-222222222222';
    const article = '33333333-3333-4333-8333-333333333333';
    const otherArticle = '44444444-4444-4444-8444-444444444444';
    const ids = new Set([
      disqusThreadIdentifier(site, article),
      disqusThreadIdentifier(site, otherArticle),
      disqusThreadIdentifier(otherSite, article),
      disqusThreadIdentifier(otherSite, otherArticle),
    ]);
    expect(ids.size).toBe(4);
  });
});

describe('disqusLanguage', () => {
  it('mengambil subtag utama dari locale BCP 47', () => {
    expect(disqusLanguage('id-ID')).toBe('id');
    expect(disqusLanguage('en-US')).toBe('en');
    expect(disqusLanguage('PT-br')).toBe('pt');
  });

  it('mengembalikan null tanpa locale yang bisa dipakai', () => {
    expect(disqusLanguage(null)).toBeNull();
    expect(disqusLanguage(undefined)).toBeNull();
    expect(disqusLanguage('')).toBeNull();
    expect(disqusLanguage('   ')).toBeNull();
    expect(disqusLanguage('indonesian')).toBeNull();
  });
});
