import { describe, expect, it } from 'vitest';

import {
  extractOfficialArticleText,
  isOfficialNewsHost,
  isOfficialNewsUrl,
  jakartaDayKey,
  parseOfficialNewsFeed,
  parseOfficialNewsIndex,
} from '@/modules/newsroom/official-feed';

describe('official newsroom source feed', () => {
  it('accepts only HTTPS URLs on the official Ditjenpas domain', () => {
    expect(isOfficialNewsHost('https://www.ditjenpas.go.id/')).toBe(true);
    expect(isOfficialNewsHost('https://ditjenpas.go.id/rss/posts')).toBe(true);
    expect(isOfficialNewsHost('http://www.ditjenpas.go.id/')).toBe(false);
    expect(isOfficialNewsHost('https://ditjenpas.go.id.evil.example/berita')).toBe(false);
    expect(isOfficialNewsUrl('https://www.ditjenpas.go.id/berita-resmi')).toBe(true);
    expect(isOfficialNewsUrl('https://ditjenpas.go.id/berita-resmi')).toBe(true);
    expect(isOfficialNewsUrl('http://www.ditjenpas.go.id/berita-resmi')).toBe(false);
    expect(isOfficialNewsUrl('https://ditjenpas.go.id.evil.example/berita')).toBe(false);
    expect(isOfficialNewsUrl('https://user@www.ditjenpas.go.id/berita')).toBe(false);
  });

  it('parses current official homepage cards when the RSS endpoint is unavailable', () => {
    const html = `
      <div class="post-item-horizontal">
        <a href="https://www.ditjenpas.go.id/category/kabar-rutan">KABAR RUTAN</a>
        <a href="https://www.ditjenpas.go.id/berita-terbaru">
          <img alt="Berita Terbaru Resmi tentang Pembinaan" src="/cover.jpg">
        </a>
        <h3 class="title"><a href="https://www.ditjenpas.go.id/berita-terbaru">Berita Terbaru Resmi...</a></h3>
        <i class="icon-clock"></i>&nbsp;&nbsp;Oct 21, 2026
        <!-- /.post item -->
      </div>
      <div class="post-item-horizontal">
        <a href="https://www.ditjenpas.go.id/profile/redaksi">Redaksi</a>
        <a href="https://ditjenpas.go.id.evil.example/berita-palsu">
          <img alt="Berita Palsu" src="/cover.jpg">
        </a>
        <!-- /.post item -->
      </div>`;
    const stories = parseOfficialNewsIndex(html);
    expect(stories).toHaveLength(1);
    expect(stories[0]?.title).toBe('Berita Terbaru Resmi tentang Pembinaan');
    expect(stories[0]?.url).toBe('https://www.ditjenpas.go.id/berita-terbaru');
    expect(stories[0]?.publishedAt?.startsWith('2026-10-21')).toBe(true);
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

  it('extracts the primary article body from the official Ditjenpas page template', () => {
    const html = '<section id="main"><div class="post-content"><div class="post-text text-style"><p>Fakta resmi satu.</p><p>Fakta resmi dua.</p></div><div class="post-tags">Related links should not become article text.</div></div></section>';
    expect(extractOfficialArticleText(html)).toBe('Fakta resmi satu. Fakta resmi dua.');
  });

  it('uses the Jakarta calendar day rather than the UTC date', () => {
    expect(jakartaDayKey(new Date('2026-10-20T17:15:00.000Z'))).toBe('2026-10-21');
  });
});
