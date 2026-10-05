import type { ComponentType, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ArticleListItem, NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { AD_SLOT_IDS } from '@/modules/ads/slots';
import { TEMPLATE_AD_MAP } from '@/modules/ads/placement-map';
import { isSlotMapped } from '@/modules/ads/config';
import type { AdSlotId } from '@/modules/ads/slots';
import {
  TEMPLATE_IDS,
  type TemplateId,
  BlackLimeArticle,
  CleanBlueArticle,
  DarkNavyArticle,
  GlassyBlueArticle,
  GreenMinimalArticle,
  OrangeModernArticle,
  PurpleEditorialArticle,
  RedEditorialArticle,
  SoftBlueArticle,
  WarmEditorialArticle,
} from '@/modules/site/components/network/network-listing';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
// Cangkang memuat header async Server Component yang tidak bisa dirender statis;
// yang diuji hanya slot iklan di dalam halaman artikel.
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

interface ArticleProps {
  readonly site: NetworkSiteData;
  readonly article: NetworkArticle;
  readonly related?: readonly ArticleListItem[];
  readonly newer?: ArticleListItem | null;
  readonly older?: ArticleListItem | null;
}

const ARTICLE_COMPONENTS: Record<TemplateId, ComponentType<ArticleProps>> = {
  'black-lime': BlackLimeArticle,
  'clean-blue': CleanBlueArticle,
  'dark-navy': DarkNavyArticle,
  'glassy-blue': GlassyBlueArticle,
  'green-minimal': GreenMinimalArticle,
  'orange-modern': OrangeModernArticle,
  'purple-editorial': PurpleEditorialArticle,
  'red-editorial': RedEditorialArticle,
  'soft-blue': SoftBlueArticle,
  'warm-editorial': WarmEditorialArticle,
};

const ARTICLE_SLOTS: readonly AdSlotId[] = ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'];

function siteFor(templateId: TemplateId, article: ArticleListItem): NetworkSiteData {
  const site = makeNetworkSite([article]);
  return {
    ...site,
    settings: {
      ...site.settings,
      colors: { templateId },
      ads: Object.fromEntries(
        AD_SLOT_IDS.map((slot) => [slot, { enabled: true, creative: { kind: 'image', imageUrl: 'https://cdn.example/x.png' } }]),
      ),
    },
  };
}

describe('zona article terpadu', () => {
  it('memetakan slot article yang sama di semua template', () => {
    for (const templateId of TEMPLATE_IDS) {
      expect([...TEMPLATE_AD_MAP[templateId].article].sort()).toEqual([...ARTICLE_SLOTS].sort());
    }
  });

  for (const templateId of TEMPLATE_IDS) {
    it(`halaman artikel ${templateId} hanya me-render slot terpetakan`, () => {
      const article = makeNetworkArticle({
        id: `artikel-${templateId}`,
        slug: `artikel-${templateId}`,
        tags: ['politik'],
        categorySlug: 'politik',
        categoryName: 'Politik',
      });
      const Component = ARTICLE_COMPONENTS[templateId];
      const html = renderToStaticMarkup(<Component site={siteFor(templateId, article)} article={article} />);
      const rendered = [...html.matchAll(/data-ad-slot="([^"]+)"/gu)].map((match) => match[1] ?? '');
      expect(rendered.length).toBeGreaterThan(0);
      for (const slot of rendered) {
        expect(isSlotMapped(templateId, slot as AdSlotId)).toBe(true);
      }
    });
  }
});
