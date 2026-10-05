// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ArticleListItem, NetworkArticle } from '@/modules/delivery/models';
import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { AD_SLOT_IDS } from '@/modules/ads/slots';
import { MobileAnchorSlot } from '@/modules/ads/ad-slot';
import {
  TEMPLATE_IDS,
  type TemplateId,
  ArticlePage,
  ChannelPage,
  ListingPage,
  SearchPage,
} from '@/modules/site/components/network/network-listing';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// Cangkang memuat header async Server Component yang tidak bisa dirender di
// jsdom; yang diuji adalah isi halaman plus jangkar ponsel secara terpisah.
vi.mock('@/modules/site/components/network/templates/black-lime/chrome/shell', () => ({
  BlackLimeShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/clean-blue/chrome/shell', () => ({
  CleanBlueShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/dark-navy/chrome/shell', () => ({
  DarkNavyShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/glassy-blue/chrome/shell', () => ({
  GlassyBlueShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/green-minimal/chrome/shell', () => ({
  GreenMinimalShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/orange-modern/chrome/shell', () => ({
  OrangeModernShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/purple-editorial/chrome/shell', () => ({
  PurpleEditorialShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/red-editorial/chrome/shell', () => ({
  RedEditorialShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/soft-blue/chrome/shell', () => ({
  SoftBlueShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/modules/site/components/network/templates/warm-editorial/chrome/shell', () => ({
  WarmEditorialShell: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
  cleanup();
});

// `useTickerRotation` di ticker beranda membaca ini lewat useSyncExternalStore.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    configurable: true,
    writable: true,
  });
});

function allOn(): Record<string, unknown> {
  return Object.fromEntries(
    AD_SLOT_IDS.map((slot) => [slot, { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/x.png' } }]),
  );
}

function articles(n: number): NetworkArticle[] {
  return Array.from({ length: n }, (_, i) =>
    makeNetworkArticle({
      id: `a-${i}`,
      slug: `berita-${i}`,
      title: `Berita utama nomor ${i}`,
      attribution: 'Redaksi',
      imageUrl: null,
      tags: ['politik'],
      categorySlug: 'politik',
      categoryName: 'Politik',
    }),
  );
}

function siteFor(templateId: TemplateId, items: readonly ArticleListItem[]) {
  const site = makeNetworkSite(items);
  return {
    ...site,
    settings: { ...site.settings, colors: { templateId }, ads: allOn() },
  };
}

const countSlot = (html: string, slot: string) => html.match(new RegExp(`data-ad-slot="${slot}"`, 'gu'))?.length ?? 0;

describe('spanduk ponsel tampil tepat satu kali per halaman', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId}: isi halaman tanpa mobile-banner di alir (artikel/kanal/cari)`, () => {
      const items = articles(5);
      const site = siteFor(templateId, items);
      const article = renderToStaticMarkup(<ArticlePage site={site} article={items[0]!} />);
      const channel = renderToStaticMarkup(
        <ChannelPage site={site} kicker="Kanal" title="Politik" description="Arsip kanal" path="/categories/politik" />,
      );
      const search = renderToStaticMarkup(<SearchPage site={site} query="politik" />);
      expect(countSlot(article, 'mobile-banner')).toBe(0);
      expect(countSlot(channel, 'mobile-banner')).toBe(0);
      expect(countSlot(search, 'mobile-banner')).toBe(0);
    });

    it(`${templateId}: beranda tanpa mobile-banner di alir`, () => {
      const { container } = render(<ListingPage site={siteFor(templateId, articles(5))} title="Beranda" description="Portal" />);
      expect(countSlot(container.innerHTML, 'mobile-banner')).toBe(0);
    });
  }

  it('jangkar cangkang merender tepat satu mobile-banner saat aktif', () => {
    const html = renderToStaticMarkup(<MobileAnchorSlot site={siteFor('clean-blue', articles(1))} />);
    expect(countSlot(html, 'mobile-banner')).toBe(1);
  });

  it('tanpa opt-in tidak ada mobile-banner di mana pun', () => {
    const bare = makeNetworkSite(articles(3));
    const site = { ...bare, settings: { ...bare.settings, colors: { templateId: 'clean-blue' as TemplateId } } };
    expect(renderToStaticMarkup(<MobileAnchorSlot site={site} />)).toBe('');
  });
});

describe('inventaris pencarian memakai in-feed di semua template', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId}: satu in-feed antara formulir dan hasil saat ada hasil`, () => {
      const html = renderToStaticMarkup(<SearchPage site={siteFor(templateId, articles(3))} query="politik" />);
      expect(countSlot(html, 'in-feed')).toBe(1);
    });

    it(`${templateId}: tanpa in-feed saat tidak ada hasil`, () => {
      const html = renderToStaticMarkup(<SearchPage site={siteFor(templateId, [])} query="politik" />);
      expect(countSlot(html, 'in-feed')).toBe(0);
    });
  }
});
