import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { AD_SLOT_IDS } from '@/modules/ads/slots';
import { AdShellBottom, AdShellTop, AdSlot, MobileAnchorSlot } from '@/modules/ads/ad-slot';

function allOn(): Record<string, unknown> {
  return Object.fromEntries(
    AD_SLOT_IDS.map((slot) => [slot, { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/x.png' } }]),
  );
}

function siteFor(templateId: string, ads?: Record<string, unknown>) {
  const site = makeNetworkSite();
  return {
    ...site,
    settings: {
      ...site.settings,
      colors: { templateId },
      ...(ads === undefined ? {} : { ads }),
    },
  };
}

describe('AdSlot', () => {
  it('tidak merender slot yang dinonaktifkan tenant', () => {
    const html = renderToStaticMarkup(
      <AdSlot site={siteFor('clean-blue', { leaderboard: { enabled: false } })} slot="leaderboard" />,
    );
    expect(html).toBe('');
  });

  it('tidak merender slot di luar peta template', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('clean-blue')} slot="sidebar-middle" />);
    expect(html).toBe('');
  });

  it('tidak pernah merusak halaman untuk template tak dikenal', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('template-asing')} slot="leaderboard" />);
    expect(html).toBe('');
  });

  it('tidak merender apa pun untuk slot aktif tanpa kreatif (UI bersih)', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('clean-blue', { leaderboard: { enabled: true } })} slot="leaderboard" />);
    expect(html).toBe('');
  });

  it('tidak menampilkan CTA house-ad saat slot kosong', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('clean-blue', { leaderboard: { enabled: true } })} slot="leaderboard" />);
    expect(html).not.toContain('Pasang Iklan');
    expect(html).not.toContain('href="/kontak"');
  });

  it('merender label dan ruang cadangan untuk slot terisi', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: {
            enabled: true,
            creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png', href: 'https://pengiklan.example', alt: 'Promo' },
          },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('data-ad-slot="leaderboard"');
    expect(html).toContain('Iklan');
    expect(html).toContain('aspect-[');
  });

  it('menampilkan label iklan yang terlihat (bukan hanya screen-reader)', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png' } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('Iklan');
    expect(html).not.toContain('sr-only');
  });

  it('merender kreatif gambar dengan tautan bersponsor dan lazy loading', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: {
            enabled: true,
            creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png', href: 'https://pengiklan.example', alt: 'Promo' },
          },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('src="https://cdn.example/a.png"');
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain('loading="lazy"');
  });

  it('tidak memakai loading lazy untuk slot di atas lipatan', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png' } },
        })}
        slot="leaderboard"
        eager
      />,
    );
    expect(html).not.toContain('loading="lazy"');
  });

  it('merender unit AdSense nyata dengan ins dan client id', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: {
            enabled: true,
            creative: { kind: 'provider', provider: 'adsense', clientId: 'ca-pub-1', slotId: '123' },
          },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('data-ad-provider="adsense"');
    expect(html).toContain('adsbygoogle');
    expect(html).toContain('data-ad-client="ca-pub-1"');
    expect(html).toContain('data-ad-slot="123"');
    expect(html).not.toContain('siap untuk penyedia');
  });

  it('merender ins responsif tanpa data-ad-slot saat slotId absen', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { enabled: true, creative: { kind: 'provider', provider: 'adsense', clientId: 'ca-pub-1' } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('adsbygoogle');
    expect(html).toContain('data-ad-client="ca-pub-1"');
    expect(html).not.toContain('data-ad-slot="123"');
  });

  it('tanpa clientId tidak merender apa pun (bukan kotak kosong)', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { enabled: true, creative: { kind: 'provider', provider: 'adsense' } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toBe('');
  });

  it('clientId kosong dianggap absen (tidak merender apa pun)', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { enabled: true, creative: { kind: 'provider', provider: 'adsense', clientId: '   ' } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toBe('');
  });

  it('tidak memakai lebar tetap pada wadah luar, hanya batas maksimum', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('red-editorial', allOn())} slot="mobile-banner" />);
    expect(html).toContain('md:hidden');
    expect(html).not.toMatch(/(?<!max-)width:\s*\d+px/);
  });

  it('memakai rasio kreatif berdimensi untuk menahan CLS', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png', width: 728, height: 90 } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('aspect-ratio:728 / 90');
  });

  it('tidak meregangkan kreatif kotak di slot lebar: dibatasi lebar intrinsik dan terpusat', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          'content-middle': { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/box.png', width: 336, height: 280 } },
        })}
        slot="content-middle"
      />,
    );
    expect(html).toContain('max-width:336px');
    expect(html).toContain('mx-auto');
  });
});

describe('AdShellTop', () => {
  it('merender slot atas milik template dan mengosongkan template tanpa slot atas', () => {
    const withTop = renderToStaticMarkup(<AdShellTop site={siteFor('clean-blue', allOn())} />);
    expect(withTop).toContain('data-ad-slot="leaderboard"');
    expect(renderToStaticMarkup(<AdShellTop site={siteFor('glassy-blue')} />)).toBe('');
  });
});

describe('AdShellBottom', () => {
  it('merender spanduk footer di semua template', () => {
    expect(renderToStaticMarkup(<AdShellBottom site={siteFor('warm-editorial', allOn())} />)).toContain(
      'data-ad-slot="footer-banner"',
    );
  });
});

describe('MobileAnchorSlot', () => {
  it('tidak merender bilah jangkar saat slot default nonaktif', () => {
    expect(renderToStaticMarkup(<MobileAnchorSlot site={siteFor('clean-blue')} />)).toBe('');
  });

  it('tidak merender bilah jangkar saat aktif tanpa kreatif', () => {
    const html = renderToStaticMarkup(
      <MobileAnchorSlot site={siteFor('clean-blue', { 'mobile-banner': { enabled: true } })} />,
    );
    expect(html).toBe('');
  });

  it('tidak merender bilah jangkar saat penyedia tanpa clientId', () => {
    const html = renderToStaticMarkup(
      <MobileAnchorSlot
        site={siteFor('clean-blue', {
          'mobile-banner': { enabled: true, creative: { kind: 'provider', provider: 'adsense' } },
        })}
      />,
    );
    expect(html).toBe('');
  });

  it('merender bilah beserta tombol tutup saat slot terisi', () => {
    const html = renderToStaticMarkup(
      <MobileAnchorSlot
        site={siteFor('clean-blue', {
          'mobile-banner': { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/m.png' } },
        })}
      />,
    );
    expect(html).toContain('data-ad-slot="mobile-banner"');
    expect(html).toContain('Tutup iklan');
  });
});
