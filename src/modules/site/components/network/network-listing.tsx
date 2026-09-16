import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
import type { DocSectionItem } from '@/modules/site/components/layout/content';
import { normalizeTemplateId } from '@/modules/site/components/network/templates/listing-shared';
import { CleanBlueListing, type ListingProps } from '@/modules/site/components/network/templates/clean-blue/pages/listing-page';
import { CleanBlueArticle } from '@/modules/site/components/network/templates/clean-blue/pages/article-page';
import { CleanBlueLegal } from '@/modules/site/components/network/templates/clean-blue/pages/legal-page';
import { CleanBlueAbout } from '@/modules/site/components/network/templates/clean-blue/pages/about-page';
import { CleanBlueContact } from '@/modules/site/components/network/templates/clean-blue/pages/contact-page';
import { CleanBlueSearch } from '@/modules/site/components/network/templates/clean-blue/pages/search-page';
import { CleanBlueReport } from '@/modules/site/components/network/templates/clean-blue/pages/report-page';
import { CleanBlueNotFound } from '@/modules/site/components/network/templates/clean-blue/pages/not-found-page';

export { TEMPLATE_IDS, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';
export type { ListingProps } from '@/modules/site/components/network/templates/clean-blue/pages/listing-page';
export {
  CleanBlueListing,
  CleanBlueArticle,
  CleanBlueLegal,
  CleanBlueAbout,
  CleanBlueContact,
  CleanBlueSearch,
  CleanBlueReport,
  CleanBlueNotFound,
};

const CLEAN_BLUE_PAGES = {
  Listing: CleanBlueListing,
  Article: CleanBlueArticle,
  Legal: CleanBlueLegal,
  About: CleanBlueAbout,
  Contact: CleanBlueContact,
  Search: CleanBlueSearch,
  Report: CleanBlueReport,
  NotFound: CleanBlueNotFound,
} as const;

function resolvePages(templateId: unknown): typeof CLEAN_BLUE_PAGES {
  switch (normalizeTemplateId(templateId)) {
    case 'clean-blue':
    default:
      return CLEAN_BLUE_PAGES;
  }
}

/**
 * Dispatcher listing tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function ListingPage({ site, title, description, path = '/', indexable = true }: ListingProps) {
  const Pages = resolvePages(site.settings.colors.templateId);
  return <Pages.Listing site={site} title={title} description={description} path={path} indexable={indexable} />;
}

/**
 * Dispatcher artikel tenant antar-template.
 */
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
  const Pages = resolvePages(site.settings.colors.templateId);
  return <Pages.Article site={site} article={article} related={related} newer={newer} older={older} />;
}

export interface LegalPageProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly sections: readonly DocSectionItem[];
}

/**
 * Dispatcher dokumen legal antar-template: route tetap, cabang render bertambah via registry.
 */
export function LegalPage(props: LegalPageProps) {
  const Pages = resolvePages(props.site.settings.colors.templateId);
  return <Pages.Legal {...props} />;
}

export interface AboutPageProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Dispatcher profil portal antar-template: route tetap, cabang render bertambah via registry.
 */
export function AboutPage(props: AboutPageProps) {
  const Pages = resolvePages(props.site.settings.colors.templateId);
  return <Pages.About {...props} />;
}

export interface ContactPageProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Dispatcher kontak tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function ContactPage(props: ContactPageProps) {
  const Pages = resolvePages(props.site.settings.colors.templateId);
  return <Pages.Contact {...props} />;
}

export interface SearchPageProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Dispatcher pencarian tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function SearchPage(props: SearchPageProps) {
  const Pages = resolvePages(props.site.settings.colors.templateId);
  return <Pages.Search {...props} />;
}

export interface ReportPageProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
}

/**
 * Dispatcher formulir laporan antar-template: route tetap, cabang render bertambah via registry.
 */
export function ReportPage(props: ReportPageProps) {
  const Pages = resolvePages(props.site.settings.colors.templateId);
  return <Pages.Report {...props} />;
}

/**
 * Dispatcher 404 tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function NotFoundPage({ site }: { readonly site: NetworkSiteData }) {
  const Pages = resolvePages(site.settings.colors.templateId);
  return <Pages.NotFound site={site} />;
}
