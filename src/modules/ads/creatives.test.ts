import { describe, expect, it } from 'vitest';

import { isAdCreative } from '@/modules/ads/creatives';

describe('isAdCreative', () => {
  it('menerima kreatif gambar dengan URL aman', () => {
    expect(
      isAdCreative({ kind: 'image', imageUrl: 'https://cdn.example/iklan.png', href: 'https://pengiklan.example', alt: 'Promo' }),
    ).toBe(true);
  });

  it('menolak URL gambar relatif selain root dan protokol selain https', () => {
    expect(isAdCreative({ kind: 'image', imageUrl: 'javascript:alert(1)' })).toBe(false);
    expect(isAdCreative({ kind: 'image', imageUrl: 'http://cdn.example/iklan.png' })).toBe(false);
    expect(isAdCreative({ kind: 'image', imageUrl: '//cdn.example/iklan.png' })).toBe(false);
  });

  it('menolak URL klik javascript dan protokol asing', () => {
    expect(isAdCreative({ kind: 'image', imageUrl: 'https://cdn.example/a.png', href: 'javascript:alert(1)' })).toBe(false);
    expect(isAdCreative({ kind: 'image', imageUrl: 'https://cdn.example/a.png', href: '/promo' })).toBe(true);
  });
  it('menerima HTML non-kosong dalam batas ukuran', () => {
    expect(isAdCreative({ kind: 'html', html: '<div>Promo</div>' })).toBe(true);
    expect(isAdCreative({ kind: 'html', html: '' })).toBe(false);
  });

  it('menerima penyedia yang dikenal dan menolak yang asing', () => {
    expect(isAdCreative({ kind: 'provider', provider: 'adsense', clientId: 'ca-pub-1' })).toBe(true);
    expect(isAdCreative({ kind: 'provider', provider: 'sembarang' })).toBe(false);
  });

  it('menolak payload bukan objek dan jenis tak dikenal', () => {
    expect(isAdCreative(null)).toBe(false);
    expect(isAdCreative('iklan')).toBe(false);
    expect(isAdCreative({ kind: 'video', src: 'https://cdn.example/a.mp4' })).toBe(false);
  });
});
