import { describe, expect, it } from 'vitest';

import {
  extractOfficialArticleText,
  isOfficialNewsUrl,
  jakartaDayKey,
  parseOfficialNewsFeed,
} from '@/modules/newsroom/official-feed';

describe('official newsroom source feed', () => {
  it('accepts only HTTPS URLs on the official Ditjenpas domain', () => {
    expect(isOfficialNewsUrl('https://www.ditjenpas.go.id/berita-resmi')).toBe(true);
    expect(isOfficialNewsUrl('https://ditjenpas.go.id/berita-resmi')).toBe(true);
    expect(isOfficialNewsUrl('http://www.ditjenpas.go.id/berita-resmi')).toBe(false);
    expect(isOfficialNewsUrl('https://ditjenpas.go.id.evil.example/berita')).toBe(false);
    expect(isOfficialNewsUrl('https://user@www.ditjenpas.go.id/berita')).toBe(false);
  });

  it('parses RSS items, cleans HTML, sorts newest-first, and rejects off-domain links', () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Berita Lama &amp; Resmi]]></title>
          <link>https://www.ditjenpas.go.id/berita-lama</link>
          <description><![CDATA[<p>Isi lama <strong>resmi</strong>.</p>]]></description>
          <pubDate>Mon, 19 Oct 2026 10:00:00 +0700</pubDate>
        </item>
        <item>
          <title>Berita Terbaru</title>
          <link>https://www.ditjenpas.go.id/berita-baru</link>
          <description>Isi &amp; konteks terbaru</description>
          <pubDate>Tue, 20 Oct 2026 10:00:00 +0700</pubDate>
        </item>
        <item>
          <title>Berita Palsu</title>
          <link>https://ditjenpas.go.id.evil.example/berita-palsu</link>
          <description>Harus dibuang</description>
          <pubDate>Wed, 21 Oct 2026 10:00:00 +0700</pubDate>
        </item>
      </channel></rss>`;
    const stories = parseOfficialNewsFeed(xml);
    expect(stories).toHaveLength(2);
    expect(stories[0]?.title).toBe('Berita Terbaru');
    expect(stories[1]?.description).toContain('Isi lama resmi.');
  });

  it('fails closed on oversized or entity-declaring XML', () => {
    expect(parseOfficialNewsFeed('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>')).toEqual([]);
    expect(parseOfficialNewsFeed('x'.repeat(1_000_001))).toEqual([]);
  });

  it('extracts readable body text without script or page chrome', () => {
    expect(extractOfficialArticleText('<nav>Menu</nav><article><h1>Judul</h1><p>Fakta penting.</p><script>RAHASIA()</script></article>'))
      .toBe('Judul Fakta penting.');
  });

  it('uses the Jakarta calendar day rather than the UTC date', () => {
    expect(jakartaDayKey(new Date('2026-10-20T17:15:00.000Z'))).toBe('2026-10-21');
  });
});
