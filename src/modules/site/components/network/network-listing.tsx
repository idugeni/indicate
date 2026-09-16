import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import type { DocSectionItem } from '@/modules/site/components/layout/content';
import {
  ArticleCard,
  CategoryMeta,
  ChannelAside,
  EmptyListing,
  PopularAside,
  StatusLine,
  formatCompactViews,
  formatDate,
  formatTime,
  getReadingTime,
  isLocalImageSrc,
  normalizeTemplateId,
  type CardVariant,
  type ListingProps,
} from '@/modules/site/components/network/templates/listing-shared';
import { CleanBlueListing } from '@/modules/site/components/network/templates/clean-blue/index';
import { CleanBlueArticle } from '@/modules/site/components/network/templates/clean-blue/article';
import { CleanBlueLegal } from '@/modules/site/components/network/templates/clean-blue/legal';
import { CleanBlueAbout } from '@/modules/site/components/network/templates/clean-blue/about';
import { CleanBlueContact } from '@/modules/site/components/network/templates/clean-blue/contact';
import { CleanBlueSearch } from '@/modules/site/components/network/templates/clean-blue/search-page';
import { CleanBlueReport } from '@/modules/site/components/network/templates/clean-blue/report-page';
import { CleanBlueNotFound } from '@/modules/site/components/network/templates/clean-blue/not-found';

// Sinkronisasi single-template: seluruh domain memakai Clean Blue Editorial.
// Berkas ini tetap menjadi API publik halaman; cabang template lama dihapus.
export {
  ArticleCard,
  CategoryMeta,
  ChannelAside,
  EmptyListing,
  PopularAside,
  StatusLine,
  formatCompactViews,
  formatDate,
  formatTime,
  getReadingTime,
  isLocalImageSrc,
  normalizeTemplateId,
  CleanBlueListing,
  CleanBlueArticle,
  CleanBlueLegal,
  CleanBlueAbout,
  CleanBlueContact,
  CleanBlueSearch,
  CleanBlueReport,
  CleanBlueNotFound,
};
export { TEMPLATE_IDS, type ListingProps, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';
export type { CardVariant };

export function ListingPage({
  site,
  title,
  description,
  path = '/',
  indexable = true,
}: ListingProps) {
  const shared = { site, title, description, path, indexable } as const;
  return <CleanBlueListing {...shared} />;
}

export function ArticlePage({
  site,
  article,
  related = [],
  newer = null,
  older = null,
}: {
  readonly site: NetworkSiteData;
  readonly article: NetworkArticle;
  readonly related?: readonly NetworkArticle[];
  readonly newer?: NetworkArticle | null;
  readonly older?: NetworkArticle | null;
}) {
  return <CleanBlueArticle site={site} article={article} related={related} newer={newer} older={older} />;
}

export interface LegalPageProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly sections: readonly DocSectionItem[];
}

/**
 * Dispatcher dokumen legal antar-template: route tetap, cabang render
 * bertambah di sini saat template kedua lahir.
 */
export function LegalPage(props: LegalPageProps) {
  const templateId = normalizeTemplateId(props.site.settings.colors.templateId);
  switch (templateId) {
    case 'clean-blue':
    default:
      return <CleanBlueLegal {...props} />;
  }
}

export interface AboutPageProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Dispatcher profil portal antar-template: route tetap, cabang render
 * bertambah di sini saat template kedua lahir.
 */
export function AboutPage(props: AboutPageProps) {
  const templateId = normalizeTemplateId(props.site.settings.colors.templateId);
  switch (templateId) {
    case 'clean-blue':
    default:
      return <CleanBlueAbout {...props} />;
  }
}

export interface ContactPageProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Dispatcher kontak tenant antar-template: route tetap, cabang render
 * bertambah di sini saat template kedua lahir.
 */
export function ContactPage(props: ContactPageProps) {
  const templateId = normalizeTemplateId(props.site.settings.colors.templateId);
  switch (templateId) {
    case 'clean-blue':
    default:
      return <CleanBlueContact {...props} />;
  }
}

export interface SearchPageProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Dispatcher pencarian tenant antar-template: route tetap, cabang render
 * bertambah di sini saat template kedua lahir.
 */
export function SearchPage(props: SearchPageProps) {
  const templateId = normalizeTemplateId(props.site.settings.colors.templateId);
  switch (templateId) {
    case 'clean-blue':
    default:
      return <CleanBlueSearch {...props} />;
  }
}

export interface ReportPageProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
}

/**
 * Dispatcher formulir laporan antar-template: route tetap, cabang render
 * bertambah di sini saat template kedua lahir.
 */
export function ReportPage(props: ReportPageProps) {
  const templateId = normalizeTemplateId(props.site.settings.colors.templateId);
  switch (templateId) {
    case 'clean-blue':
    default:
      return <CleanBlueReport {...props} />;
  }
}

/**
 * Dispatcher 404 tenant antar-template: route tetap, cabang render
 * bertambah di sini saat template kedua lahir.
 */
export function NotFoundPage({ site }: { readonly site: NetworkSiteData }) {
  const templateId = normalizeTemplateId(site.settings.colors.templateId);
  switch (templateId) {
    case 'clean-blue':
    default:
      return <CleanBlueNotFound site={site} />;
  }
}
