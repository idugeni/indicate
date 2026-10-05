import type { NetworkSiteData } from '@/modules/delivery/models';
import { AdSlot } from '@/modules/ads/ad-slot';
import type { ContactChannel } from '@/modules/site/company-contact';
import {
  ArticleSidebarBacaJuga,
  ArticleSidebarIkutiKami,
  ArticleSidebarKanal,
  ArticleSidebarNewsletter,
  ArticleSidebarTerbaru,
  ArticleSidebarTerpopuler,
  ArticleSidebarTopik,
} from '@/modules/site/components/network/ui/article-sidebar';
import type { ArticleSidebarData } from '@/modules/site/components/network/ui/article-sidebar-data';
import { RailTabs } from '@/modules/site/components/network/ui/article-rail-tabs';

/** Varian rail artikel: klasik, premium, tab, atau minimal. */
export type ArticleRailVariant = 'classic' | 'premium' | 'tabs' | 'minimal';

interface ArticleRailProps {
  readonly variant: ArticleRailVariant;
  readonly site: NetworkSiteData;
  readonly sidebar: ArticleSidebarData;
  readonly followChannels: readonly ContactChannel[];
}

/**
 * Satu mode rail artikel untuk 10 template.
 *
 * @param variant - Susunan dan pilihan widget rail.
 * @param site - Data situs untuk slot iklan.
 * @param sidebar - Data rail dari pemilih sidebar.
 * @param followChannels - Kanal ikuti-kami situs.
 * @returns Aside rail sticky dengan slot iklan di posisi pendapatan.
 * @remarks Slot `sidebar-top` dan `sidebar-bottom` tidak pindah varian mana pun.
 */
export function ArticleRail({ variant, site, sidebar, followChannels }: ArticleRailProps) {
  return (
    <aside aria-label="Sidebar artikel" className="grid min-w-0 content-start gap-6 print:hidden lg:sticky lg:top-20">
      {variant === 'premium' ? (
        <>
          <ArticleSidebarTerpopuler articles={sidebar.terpopuler} />
          <ArticleSidebarNewsletter />
          <AdSlot site={site} slot="sidebar-top" />
          <ArticleSidebarBacaJuga articles={sidebar.bacaJuga} />
          <ArticleSidebarTerbaru articles={sidebar.terbaru} />
          <ArticleSidebarTopik topics={sidebar.topics} />
          <ArticleSidebarKanal channels={sidebar.channels} />
          <ArticleSidebarIkutiKami channels={followChannels} />
          <AdSlot site={site} slot="sidebar-bottom" />
        </>
      ) : variant === 'tabs' ? (
        <>
          <ArticleSidebarBacaJuga articles={sidebar.bacaJuga} />
          <AdSlot site={site} slot="sidebar-top" />
          <RailTabs
            terbaru={<ArticleSidebarTerbaru articles={sidebar.terbaru} />}
            terpopuler={<ArticleSidebarTerpopuler articles={sidebar.terpopuler} />}
          />
          <ArticleSidebarTopik topics={sidebar.topics} />
          <ArticleSidebarKanal channels={sidebar.channels} />
          <ArticleSidebarNewsletter />
          <ArticleSidebarIkutiKami channels={followChannels} />
          <AdSlot site={site} slot="sidebar-bottom" />
        </>
      ) : variant === 'minimal' ? (
        <>
          <ArticleSidebarBacaJuga articles={sidebar.bacaJuga} />
          <AdSlot site={site} slot="sidebar-top" />
          <ArticleSidebarTerbaru articles={sidebar.terbaru} />
          <ArticleSidebarNewsletter />
          <ArticleSidebarTopik topics={sidebar.topics} />
          <AdSlot site={site} slot="sidebar-bottom" />
        </>
      ) : (
        <>
          <ArticleSidebarBacaJuga articles={sidebar.bacaJuga} />
          <AdSlot site={site} slot="sidebar-top" />
          <ArticleSidebarTerpopuler articles={sidebar.terpopuler} />
          <ArticleSidebarTerbaru articles={sidebar.terbaru} />
          <ArticleSidebarTopik topics={sidebar.topics} />
          <ArticleSidebarKanal channels={sidebar.channels} />
          <ArticleSidebarNewsletter />
          <ArticleSidebarIkutiKami channels={followChannels} />
          <AdSlot site={site} slot="sidebar-bottom" />
        </>
      )}
    </aside>
  );
}
