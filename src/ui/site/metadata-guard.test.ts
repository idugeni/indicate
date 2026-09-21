import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { siteMetadata } from '@/ui/site/metadata-guard';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://dasbor.example/';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://contoh.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'kunci-publik-cukup-panjang';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('siteMetadata', () => {
  it('membangun kanonis, robots, dan kartu sosial dari origin control-plane', () => {
    const metadata = siteMetadata('Layanan', 'Deskripsi layanan.', '/services');
    expect(metadata.title).toBe('Layanan');
    expect(metadata.description).toBe('Deskripsi layanan.');
    expect(metadata.alternates?.canonical).toBe('https://dasbor.example/services');
    expect(metadata.alternates?.languages?.['id-ID']).toBe('https://dasbor.example/services');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    const openGraph = metadata.openGraph;
    if (typeof openGraph !== 'object' || openGraph === null) throw new Error('openGraph hilang');
    expect(openGraph.url).toBe('https://dasbor.example/services');
    expect(openGraph.title).toBe('Layanan | Indicate');
    expect(openGraph.images).toEqual([
      { url: 'https://dasbor.example/opengraph-image', width: 1200, height: 630, alt: 'Layanan | Indicate' },
    ]);
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Layanan | Indicate',
      images: ['https://dasbor.example/opengraph-image'],
    });
  });

  it('memangkas garis miring akhir pada site url', () => {
    const metadata = siteMetadata('Harga', 'Deskripsi harga.', '/pricing');
    expect(metadata.alternates?.canonical).toBe('https://dasbor.example/pricing');
  });
});
