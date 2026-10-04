import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { AdShellBottom, AdShellTop, AdSlot } from '@/modules/ads/ad-slot';

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
    const html = renderToStaticMarkup(<AdSlot site={siteFor('clean-blue')} slot="sidebar-top" />);
    expect(html).toBe('');
  });

  it('tidak pernah merusak halaman untuk template tak dikenal', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('template-asing')} slot="leaderboard" />);
    expect(html).toBe('');
  });

  it('merender label, ruang cadangan, dan status kosong untuk slot aktif tanpa kreatif', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('clean-blue')} slot="leaderboard" />);
    expect(html).toContain('data-ad-slot="leaderboard"');
    expect(html).toContain('Iklan');
    expect(html).toContain('data-ad-state="empty"');
    expect(html).toContain('aspect-[');
  });

  it('merender kreatif gambar dengan tautan bersponsor dan lazy loading', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: {
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
          leaderboard: { creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png' } },
        })}
        slot="leaderboard"
        eager
      />,
    );
    expect(html).not.toContain('loading="lazy"');
  });

  it('tidak menyuntikkan skrip untuk kreatif penyedia', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { creative: { kind: 'provider', provider: 'adsense', clientId: 'ca-pub-1' } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('data-ad-provider="adsense"');
    expect(html).not.toContain('<script');
  });

  it('tidak memakai lebar tetap pada wadah luar, hanya batas maksimum', () => {
    const html = renderToStaticMarkup(<AdSlot site={siteFor('red-editorial')} slot="mobile-banner" />);
    expect(html).toContain('md:hidden');
    expect(html).not.toMatch(/(?<!max-)width:\s*\d+px/);
  });

  it('memakai rasio kreatif berdimensi untuk menahan CLS', () => {
    const html = renderToStaticMarkup(
      <AdSlot
        site={siteFor('clean-blue', {
          leaderboard: { creative: { kind: 'image', imageUrl: 'https://cdn.example/a.png', width: 728, height: 90 } },
        })}
        slot="leaderboard"
      />,
    );
    expect(html).toContain('aspect-ratio:728 / 90');
  });
});

describe('AdShellTop', () => {
  it('merender slot atas milik template dan mengosongkan template tanpa slot atas', () => {
    const withTop = renderToStaticMarkup(<AdShellTop site={siteFor('clean-blue')} />);
    expect(withTop).toContain('data-ad-slot="leaderboard"');
    expect(renderToStaticMarkup(<AdShellTop site={siteFor('glassy-blue')} />)).toBe('');
  });
});

describe('AdShellBottom', () => {
  it('merender spanduk footer di semua template', () => {
    expect(renderToStaticMarkup(<AdShellBottom site={siteFor('warm-editorial')} />)).toContain(
      'data-ad-slot="footer-banner"',
    );
  });
});
