import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { controlPlaneIcons, siteMetadata } from '@/ui/site/metadata-guard';

vi.mock('@/core/config/bootstrap/bootstrap-config', () => ({
  getBootstrapConfig: () => ({
    credentials: { facebookAppToken: { reveal: () => '28410585598598931|app-secret' } },
    controlHosts: { dashboard: 'dasbor.example' },
  }),
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://dasbor.example/';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://contoh.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'kunci-publik-cukup-panjang';
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('controlPlaneIcons', () => {
  it('menyediakan sumber icon resolusi tinggi untuk crawler', () => {
    const metadata = controlPlaneIcons();
    const icons = metadata.icons;
    if (typeof icons !== 'object' || icons === null || icons instanceof URL || Array.isArray(icons) || !('icon' in icons)) {
      throw new Error('icons hilang');
    }
    expect(icons.icon).toContainEqual({ url: '/favicon.ico', sizes: '48x48' });
    expect(icons.icon).toContainEqual({ url: '/apple-icon.png', sizes: '512x512', type: 'image/png' });
    expect(icons.apple).toBe('/apple-icon.png');
  });
});

describe('siteMetadata', () => {  it('membangun kanonis, robots, dan kartu sosial dari origin control-plane', () => {
    const metadata = siteMetadata('Layanan', 'Deskripsi layanan.', '/services');
    expect(metadata.title).toBe('Layanan');
    expect(metadata.description).toBe('Deskripsi layanan.');
    expect(metadata.alternates?.canonical).toBe('https://dasbor.example/services');
    expect(metadata.alternates?.languages?.['id-ID']).toBe('https://dasbor.example/services');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    const openGraph = metadata.openGraph;
    if (typeof openGraph !== 'object' || openGraph === null) throw new Error('openGraph hilang');
    expect(metadata.openGraph).toMatchObject({
      url: 'https://dasbor.example/services',
      title: 'Layanan | Indicate',
    });
    expect(metadata.openGraph).not.toHaveProperty('images');
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Layanan | Indicate',
    });
    expect(metadata.twitter).not.toHaveProperty('images');
  });

  it('memangkas garis miring akhir pada site url', () => {
    const metadata = siteMetadata('Harga', 'Deskripsi harga.', '/pricing');
    expect(metadata.alternates?.canonical).toBe('https://dasbor.example/pricing');
  });

  it('menyerahkan gambar sosial ke file opengraph-image per-segmen', () => {
    const metadata = siteMetadata('Layanan', 'Deskripsi layanan.', '/services');
    expect(metadata.openGraph).not.toHaveProperty('images');
    expect(metadata.twitter).not.toHaveProperty('images');
  });

  it('menerbitkan fb:app_id tanpa membocorkan app secret', () => {
    const metadata = siteMetadata('Layanan', 'Deskripsi layanan.', '/services');
    expect(metadata.facebook).toEqual({ appId: '28410585598598931' });
    expect(JSON.stringify(metadata)).not.toContain('app-secret');
  });
});
