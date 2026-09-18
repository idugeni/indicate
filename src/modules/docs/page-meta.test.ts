import { describe, expect, it } from 'vitest';

import { docsPageMetadata } from '@/modules/docs/page-meta';

describe('docsPageMetadata', () => {
  it('menulis judul beranda tanpa akhiran situs', () => {
    const metadata = docsPageMetadata('docs.example', 'home');
    expect(metadata.title).toEqual({ absolute: 'Dokumentasi Indicate' });
    const alternates = metadata.alternates as { canonical: string; languages: Record<string, string> };
    expect(alternates.canonical).toBe('https://docs.example/');
    expect(alternates.languages['id-ID']).toBe('https://docs.example/');
  });

  it('menempelkan akhiran situs pada halaman isi', () => {
    const metadata = docsPageMetadata('docs.example', 'errors');
    expect(metadata.title).toEqual({ absolute: 'Error & rate limit | Indicate Docs' });
    expect(metadata.description).toContain('Envelope error');
  });

  it('menyertakan open graph dan twitter berbahasa Indonesia', () => {
    const metadata = docsPageMetadata('docs.example', 'webhooks');
    const openGraph = metadata.openGraph as {
      type: string;
      locale: string;
      url: string;
      siteName: string;
      images: readonly { url: string; width: number; height: number }[];
    };
    expect(openGraph.type).toBe('website');
    expect(openGraph.locale).toBe('id_ID');
    expect(openGraph.url).toBe('https://docs.example/webhooks');
    expect(openGraph.siteName).toBe('Indicate Docs');
    expect(openGraph.images[0]).toMatchObject({
      url: 'https://docs.example/docs-opengraph-image',
      width: 1200,
      height: 630,
    });
    const twitter = metadata.twitter as { card: string; images: readonly string[] };
    expect(twitter.card).toBe('summary_large_image');
    expect(twitter.images).toEqual(['https://docs.example/docs-opengraph-image']);
  });

  it('menandai halaman dan slug asing agar mudah diindeks atau ditolak', () => {
    expect(docsPageMetadata('docs.example', 'api-reference').robots).toMatchObject({ index: true });
    expect(docsPageMetadata('docs.example', 'khayalan')).toMatchObject({ title: 'Not Found' });
    expect(docsPageMetadata('docs.example', 'khayalan').robots).toEqual({ index: false, follow: false });
  });
});
