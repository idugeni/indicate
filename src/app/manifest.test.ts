import { describe, expect, it } from 'vitest';

import manifest, { controlPlaneManifest, tenantManifestData } from '@/app/manifest';

describe('manifest', () => {
  it('mengekspos metadata instalasi control-plane berbahasa Indonesia', () => {
    const data = controlPlaneManifest();
    expect(data.name).toContain('Indicate');
    expect(data.short_name).toBe('Indicate');
    expect(data.description?.length).toBeGreaterThan(0);
    expect(data.start_url).toBe('/');
    expect(data.display).toBe('standalone');
    expect(data.lang).toBe('id-ID');
  });

  it('memakai warna tema dan ikon yang konsisten', () => {
    const data = controlPlaneManifest();
    expect(data.background_color).toBe('#0e1320');
    expect(data.theme_color).toBe('#0e1320');
    expect(data.icons?.[0]?.src).toBe('/apple-icon.png');
    expect(data.icons?.[0]?.type).toBe('image/png');
  });

  it('melayani manifest tenant tanpa ikon control-plane', () => {
    const data = tenantManifestData('Fakta01', 'Portal berita Fakta01.');
    expect(data.name).toBe('Fakta01');
    expect(data.icons?.map((icon) => icon.src)).toEqual(['/icon.png', '/apple-touch-icon.png']);
    expect(JSON.stringify(data)).not.toContain('apple-icon.png');
  });

  it('jatuh ke control-plane saat konteks host tidak tersedia', async () => {
    const data = await manifest();
    expect(data.short_name).toBe('Indicate');
  });
});
