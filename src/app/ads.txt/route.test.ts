import { describe, expect, it } from 'vitest';

import { adsTxt } from '@/app/ads.txt/route';

describe('adsTxt', () => {
  it('menandai host tanpa penjual resmi', () => {
    const body = adsTxt('indicate.website', 'https://indicate.website/contact');
    expect(body).toContain('# ads.txt for indicate.website');
    expect(body).toContain('https://indicate.website/contact');
  });

  it('memakai kontak tenant untuk host tenant', () => {
    const body = adsTxt('portal.example', 'https://portal.example/kontak');
    expect(body).toContain('https://portal.example/kontak');
  });
});
