import type { ArticleListItem, NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
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
import { CleanBlueChannel, type CleanBlueChannelProps } from '@/modules/site/components/network/templates/clean-blue/pages/channel-page';
import { BlackLimeListing } from '@/modules/site/components/network/templates/black-lime/pages/listing-page';
import { BlackLimeArticle } from '@/modules/site/components/network/templates/black-lime/pages/article-page';
import { BlackLimeLegal } from '@/modules/site/components/network/templates/black-lime/pages/legal-page';
import { BlackLimeAbout } from '@/modules/site/components/network/templates/black-lime/pages/about-page';
import { BlackLimeContact } from '@/modules/site/components/network/templates/black-lime/pages/contact-page';
import { BlackLimeSearch } from '@/modules/site/components/network/templates/black-lime/pages/search-page';
import { BlackLimeReport } from '@/modules/site/components/network/templates/black-lime/pages/report-page';
import { BlackLimeNotFound } from '@/modules/site/components/network/templates/black-lime/pages/not-found-page';
import { BlackLimeChannel } from '@/modules/site/components/network/templates/black-lime/pages/channel-page';
import { DarkNavyListing } from '@/modules/site/components/network/templates/dark-navy/pages/listing-page';
import { DarkNavyArticle } from '@/modules/site/components/network/templates/dark-navy/pages/article-page';
import { DarkNavyLegal } from '@/modules/site/components/network/templates/dark-navy/pages/legal-page';
import { DarkNavyAbout } from '@/modules/site/components/network/templates/dark-navy/pages/about-page';
import { DarkNavyContact } from '@/modules/site/components/network/templates/dark-navy/pages/contact-page';
import { DarkNavySearch } from '@/modules/site/components/network/templates/dark-navy/pages/search-page';
import { DarkNavyReport } from '@/modules/site/components/network/templates/dark-navy/pages/report-page';
import { DarkNavyNotFound } from '@/modules/site/components/network/templates/dark-navy/pages/not-found-page';
import { DarkNavyChannel } from '@/modules/site/components/network/templates/dark-navy/pages/channel-page';
import { GlassyBlueListing } from '@/modules/site/components/network/templates/glassy-blue/pages/listing-page';
import { GlassyBlueArticle } from '@/modules/site/components/network/templates/glassy-blue/pages/article-page';
import { GlassyBlueLegal } from '@/modules/site/components/network/templates/glassy-blue/pages/legal-page';
import { GlassyBlueAbout } from '@/modules/site/components/network/templates/glassy-blue/pages/about-page';
import { GlassyBlueContact } from '@/modules/site/components/network/templates/glassy-blue/pages/contact-page';
import { GlassyBlueSearch } from '@/modules/site/components/network/templates/glassy-blue/pages/search-page';
import { GlassyBlueReport } from '@/modules/site/components/network/templates/glassy-blue/pages/report-page';
import { GlassyBlueNotFound } from '@/modules/site/components/network/templates/glassy-blue/pages/not-found-page';
import { GlassyBlueChannel } from '@/modules/site/components/network/templates/glassy-blue/pages/channel-page';
import { GreenMinimalListing } from '@/modules/site/components/network/templates/green-minimal/pages/listing-page';
import { GreenMinimalArticle } from '@/modules/site/components/network/templates/green-minimal/pages/article-page';
import { GreenMinimalLegal } from '@/modules/site/components/network/templates/green-minimal/pages/legal-page';
import { GreenMinimalAbout } from '@/modules/site/components/network/templates/green-minimal/pages/about-page';
import { GreenMinimalContact } from '@/modules/site/components/network/templates/green-minimal/pages/contact-page';
import { GreenMinimalSearch } from '@/modules/site/components/network/templates/green-minimal/pages/search-page';
import { GreenMinimalReport } from '@/modules/site/components/network/templates/green-minimal/pages/report-page';
import { GreenMinimalNotFound } from '@/modules/site/components/network/templates/green-minimal/pages/not-found-page';
import { GreenMinimalChannel } from '@/modules/site/components/network/templates/green-minimal/pages/channel-page';
import { OrangeModernListing } from '@/modules/site/components/network/templates/orange-modern/pages/listing-page';
import { OrangeModernArticle } from '@/modules/site/components/network/templates/orange-modern/pages/article-page';
import { OrangeModernLegal } from '@/modules/site/components/network/templates/orange-modern/pages/legal-page';
import { OrangeModernAbout } from '@/modules/site/components/network/templates/orange-modern/pages/about-page';
import { OrangeModernContact } from '@/modules/site/components/network/templates/orange-modern/pages/contact-page';
import { OrangeModernSearch } from '@/modules/site/components/network/templates/orange-modern/pages/search-page';
import { OrangeModernReport } from '@/modules/site/components/network/templates/orange-modern/pages/report-page';
import { OrangeModernNotFound } from '@/modules/site/components/network/templates/orange-modern/pages/not-found-page';
import { OrangeModernChannel } from '@/modules/site/components/network/templates/orange-modern/pages/channel-page';
import { PurpleEditorialListing } from '@/modules/site/components/network/templates/purple-editorial/pages/listing-page';
import { PurpleEditorialArticle } from '@/modules/site/components/network/templates/purple-editorial/pages/article-page';
import { PurpleEditorialLegal } from '@/modules/site/components/network/templates/purple-editorial/pages/legal-page';
import { PurpleEditorialAbout } from '@/modules/site/components/network/templates/purple-editorial/pages/about-page';
import { PurpleEditorialContact } from '@/modules/site/components/network/templates/purple-editorial/pages/contact-page';
import { PurpleEditorialSearch } from '@/modules/site/components/network/templates/purple-editorial/pages/search-page';
import { PurpleEditorialReport } from '@/modules/site/components/network/templates/purple-editorial/pages/report-page';
import { PurpleEditorialNotFound } from '@/modules/site/components/network/templates/purple-editorial/pages/not-found-page';
import { PurpleEditorialChannel } from '@/modules/site/components/network/templates/purple-editorial/pages/channel-page';
import { RedEditorialListing } from '@/modules/site/components/network/templates/red-editorial/pages/listing-page';
import { RedEditorialArticle } from '@/modules/site/components/network/templates/red-editorial/pages/article-page';
import { RedEditorialLegal } from '@/modules/site/components/network/templates/red-editorial/pages/legal-page';
import { RedEditorialAbout } from '@/modules/site/components/network/templates/red-editorial/pages/about-page';
import { RedEditorialContact } from '@/modules/site/components/network/templates/red-editorial/pages/contact-page';
import { RedEditorialSearch } from '@/modules/site/components/network/templates/red-editorial/pages/search-page';
import { RedEditorialReport } from '@/modules/site/components/network/templates/red-editorial/pages/report-page';
import { RedEditorialNotFound } from '@/modules/site/components/network/templates/red-editorial/pages/not-found-page';
import { RedEditorialChannel } from '@/modules/site/components/network/templates/red-editorial/pages/channel-page';
import { SoftBlueListing } from '@/modules/site/components/network/templates/soft-blue/pages/listing-page';
import { SoftBlueArticle } from '@/modules/site/components/network/templates/soft-blue/pages/article-page';
import { SoftBlueLegal } from '@/modules/site/components/network/templates/soft-blue/pages/legal-page';
import { SoftBlueAbout } from '@/modules/site/components/network/templates/soft-blue/pages/about-page';
import { SoftBlueContact } from '@/modules/site/components/network/templates/soft-blue/pages/contact-page';
import { SoftBlueSearch } from '@/modules/site/components/network/templates/soft-blue/pages/search-page';
import { SoftBlueReport } from '@/modules/site/components/network/templates/soft-blue/pages/report-page';
import { SoftBlueNotFound } from '@/modules/site/components/network/templates/soft-blue/pages/not-found-page';
import { SoftBlueChannel } from '@/modules/site/components/network/templates/soft-blue/pages/channel-page';
import { WarmEditorialListing } from '@/modules/site/components/network/templates/warm-editorial/pages/listing-page';
import { WarmEditorialArticle } from '@/modules/site/components/network/templates/warm-editorial/pages/article-page';
import { WarmEditorialLegal } from '@/modules/site/components/network/templates/warm-editorial/pages/legal-page';
import { WarmEditorialAbout } from '@/modules/site/components/network/templates/warm-editorial/pages/about-page';
import { WarmEditorialContact } from '@/modules/site/components/network/templates/warm-editorial/pages/contact-page';
import { WarmEditorialSearch } from '@/modules/site/components/network/templates/warm-editorial/pages/search-page';
import { WarmEditorialReport } from '@/modules/site/components/network/templates/warm-editorial/pages/report-page';
import { WarmEditorialNotFound } from '@/modules/site/components/network/templates/warm-editorial/pages/not-found-page';
import { WarmEditorialChannel } from '@/modules/site/components/network/templates/warm-editorial/pages/channel-page';
import { CleanBlueLoader } from '@/modules/site/components/network/templates/clean-blue/ui/loader';
import { BlackLimeLoader } from '@/modules/site/components/network/templates/black-lime/ui/loader';
import { DarkNavyLoader } from '@/modules/site/components/network/templates/dark-navy/ui/loader';
import { GlassyBlueLoader } from '@/modules/site/components/network/templates/glassy-blue/ui/loader';
import { GreenMinimalLoader } from '@/modules/site/components/network/templates/green-minimal/ui/loader';
import { OrangeModernLoader } from '@/modules/site/components/network/templates/orange-modern/ui/loader';
import { PurpleEditorialLoader } from '@/modules/site/components/network/templates/purple-editorial/ui/loader';
import { RedEditorialLoader } from '@/modules/site/components/network/templates/red-editorial/ui/loader';
import { SoftBlueLoader } from '@/modules/site/components/network/templates/soft-blue/ui/loader';
import { WarmEditorialLoader } from '@/modules/site/components/network/templates/warm-editorial/ui/loader';

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
  CleanBlueChannel,
  BlackLimeListing,
  BlackLimeArticle,
  BlackLimeLegal,
  BlackLimeAbout,
  BlackLimeContact,
  BlackLimeSearch,
  BlackLimeReport,
  BlackLimeNotFound,
  BlackLimeChannel,
  DarkNavyListing,
  DarkNavyArticle,
  DarkNavyLegal,
  DarkNavyAbout,
  DarkNavyContact,
  DarkNavySearch,
  DarkNavyReport,
  DarkNavyNotFound,
  DarkNavyChannel,
  GlassyBlueListing,
  GlassyBlueArticle,
  GlassyBlueLegal,
  GlassyBlueAbout,
  GlassyBlueContact,
  GlassyBlueSearch,
  GlassyBlueReport,
  GlassyBlueNotFound,
  GlassyBlueChannel,
  GreenMinimalListing,
  GreenMinimalArticle,
  GreenMinimalLegal,
  GreenMinimalAbout,
  GreenMinimalContact,
  GreenMinimalSearch,
  GreenMinimalReport,
  GreenMinimalNotFound,
  GreenMinimalChannel,
  OrangeModernListing,
  OrangeModernArticle,
  OrangeModernLegal,
  OrangeModernAbout,
  OrangeModernContact,
  OrangeModernSearch,
  OrangeModernReport,
  OrangeModernNotFound,
  OrangeModernChannel,
  PurpleEditorialListing,
  PurpleEditorialArticle,
  PurpleEditorialLegal,
  PurpleEditorialAbout,
  PurpleEditorialContact,
  PurpleEditorialSearch,
  PurpleEditorialReport,
  PurpleEditorialNotFound,
  PurpleEditorialChannel,
  RedEditorialListing,
  RedEditorialArticle,
  RedEditorialLegal,
  RedEditorialAbout,
  RedEditorialContact,
  RedEditorialSearch,
  RedEditorialReport,
  RedEditorialNotFound,
  RedEditorialChannel,
  SoftBlueListing,
  SoftBlueArticle,
  SoftBlueLegal,
  SoftBlueAbout,
  SoftBlueContact,
  SoftBlueSearch,
  SoftBlueReport,
  SoftBlueNotFound,
  SoftBlueChannel,
  WarmEditorialListing,
  WarmEditorialArticle,
  WarmEditorialLegal,
  WarmEditorialAbout,
  WarmEditorialContact,
  WarmEditorialSearch,
  WarmEditorialReport,
  WarmEditorialNotFound,
  WarmEditorialChannel,
};
export type { CleanBlueChannelProps };

/**
 * Dispatcher listing tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function ListingPage({ site, title, description, path = '/', indexable = true }: ListingProps) {
  switch (normalizeTemplateId(site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'dark-navy':
      return <DarkNavyListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'glassy-blue':
      return <GlassyBlueListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'green-minimal':
      return <GreenMinimalListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'orange-modern':
      return <OrangeModernListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'purple-editorial':
      return <PurpleEditorialListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'red-editorial':
      return <RedEditorialListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'soft-blue':
      return <SoftBlueListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'warm-editorial':
      return <WarmEditorialListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    case 'clean-blue':
      return <CleanBlueListing site={site} title={title} description={description} path={path} indexable={indexable} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
}

/**
 * Dispatcher loader tenant antar-template: titik yang sudah memegang template aktif merender cincin warnanya sendiri.
 */
export function TemplateLoader({ templateId }: { readonly templateId: unknown }) {
  switch (normalizeTemplateId(templateId)) {
    case 'black-lime':
      return <BlackLimeLoader />;
    case 'dark-navy':
      return <DarkNavyLoader />;
    case 'glassy-blue':
      return <GlassyBlueLoader />;
    case 'green-minimal':
      return <GreenMinimalLoader />;
    case 'orange-modern':
      return <OrangeModernLoader />;
    case 'purple-editorial':
      return <PurpleEditorialLoader />;
    case 'red-editorial':
      return <RedEditorialLoader />;
    case 'soft-blue':
      return <SoftBlueLoader />;
    case 'warm-editorial':
      return <WarmEditorialLoader />;
    case 'clean-blue':
      return <CleanBlueLoader />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
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
  readonly related?: readonly ArticleListItem[];
  readonly newer?: ArticleListItem | null;
  readonly older?: ArticleListItem | null;
}) {
  switch (normalizeTemplateId(site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'dark-navy':
      return <DarkNavyArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'glassy-blue':
      return <GlassyBlueArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'green-minimal':
      return <GreenMinimalArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'orange-modern':
      return <OrangeModernArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'purple-editorial':
      return <PurpleEditorialArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'red-editorial':
      return <RedEditorialArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'soft-blue':
      return <SoftBlueArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'warm-editorial':
      return <WarmEditorialArticle site={site} article={article} related={related} newer={newer} older={older} />;
    case 'clean-blue':
      return <CleanBlueArticle site={site} article={article} related={related} newer={newer} older={older} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
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
  switch (normalizeTemplateId(props.site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeLegal {...props} />;
    case 'dark-navy':
      return <DarkNavyLegal {...props} />;
    case 'glassy-blue':
      return <GlassyBlueLegal {...props} />;
    case 'green-minimal':
      return <GreenMinimalLegal {...props} />;
    case 'orange-modern':
      return <OrangeModernLegal {...props} />;
    case 'purple-editorial':
      return <PurpleEditorialLegal {...props} />;
    case 'red-editorial':
      return <RedEditorialLegal {...props} />;
    case 'soft-blue':
      return <SoftBlueLegal {...props} />;
    case 'warm-editorial':
      return <WarmEditorialLegal {...props} />;
    case 'clean-blue':
      return <CleanBlueLegal {...props} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
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
  switch (normalizeTemplateId(props.site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeAbout {...props} />;
    case 'dark-navy':
      return <DarkNavyAbout {...props} />;
    case 'glassy-blue':
      return <GlassyBlueAbout {...props} />;
    case 'green-minimal':
      return <GreenMinimalAbout {...props} />;
    case 'orange-modern':
      return <OrangeModernAbout {...props} />;
    case 'purple-editorial':
      return <PurpleEditorialAbout {...props} />;
    case 'red-editorial':
      return <RedEditorialAbout {...props} />;
    case 'soft-blue':
      return <SoftBlueAbout {...props} />;
    case 'warm-editorial':
      return <WarmEditorialAbout {...props} />;
    case 'clean-blue':
      return <CleanBlueAbout {...props} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
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
  switch (normalizeTemplateId(props.site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeContact {...props} />;
    case 'dark-navy':
      return <DarkNavyContact {...props} />;
    case 'glassy-blue':
      return <GlassyBlueContact {...props} />;
    case 'green-minimal':
      return <GreenMinimalContact {...props} />;
    case 'orange-modern':
      return <OrangeModernContact {...props} />;
    case 'purple-editorial':
      return <PurpleEditorialContact {...props} />;
    case 'red-editorial':
      return <RedEditorialContact {...props} />;
    case 'soft-blue':
      return <SoftBlueContact {...props} />;
    case 'warm-editorial':
      return <WarmEditorialContact {...props} />;
    case 'clean-blue':
      return <CleanBlueContact {...props} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
}

export interface SearchPageProps {
  readonly site: NetworkSiteData;
  readonly query: string;
}

/**
 * Dispatcher pencarian tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function SearchPage(props: SearchPageProps) {
  switch (normalizeTemplateId(props.site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeSearch {...props} />;
    case 'dark-navy':
      return <DarkNavySearch {...props} />;
    case 'glassy-blue':
      return <GlassyBlueSearch {...props} />;
    case 'green-minimal':
      return <GreenMinimalSearch {...props} />;
    case 'orange-modern':
      return <OrangeModernSearch {...props} />;
    case 'purple-editorial':
      return <PurpleEditorialSearch {...props} />;
    case 'red-editorial':
      return <RedEditorialSearch {...props} />;
    case 'soft-blue':
      return <SoftBlueSearch {...props} />;
    case 'warm-editorial':
      return <WarmEditorialSearch {...props} />;
    case 'clean-blue':
      return <CleanBlueSearch {...props} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
}

export interface ReportPageProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
}

/**
 * Dispatcher formulir laporan antar-template: route tetap, cabang render bertambah via registry.
 */
export function ReportPage(props: ReportPageProps) {
  switch (normalizeTemplateId(props.site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeReport {...props} />;
    case 'dark-navy':
      return <DarkNavyReport {...props} />;
    case 'glassy-blue':
      return <GlassyBlueReport {...props} />;
    case 'green-minimal':
      return <GreenMinimalReport {...props} />;
    case 'orange-modern':
      return <OrangeModernReport {...props} />;
    case 'purple-editorial':
      return <PurpleEditorialReport {...props} />;
    case 'red-editorial':
      return <RedEditorialReport {...props} />;
    case 'soft-blue':
      return <SoftBlueReport {...props} />;
    case 'warm-editorial':
      return <WarmEditorialReport {...props} />;
    case 'clean-blue':
      return <CleanBlueReport {...props} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
}

/**
 * Dispatcher 404 tenant antar-template: route tetap, cabang render bertambah via registry.
 */
export function NotFoundPage({ site }: { readonly site: NetworkSiteData }) {
  switch (normalizeTemplateId(site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeNotFound site={site} />;
    case 'dark-navy':
      return <DarkNavyNotFound site={site} />;
    case 'glassy-blue':
      return <GlassyBlueNotFound site={site} />;
    case 'green-minimal':
      return <GreenMinimalNotFound site={site} />;
    case 'orange-modern':
      return <OrangeModernNotFound site={site} />;
    case 'purple-editorial':
      return <PurpleEditorialNotFound site={site} />;
    case 'red-editorial':
      return <RedEditorialNotFound site={site} />;
    case 'soft-blue':
      return <SoftBlueNotFound site={site} />;
    case 'warm-editorial':
      return <WarmEditorialNotFound site={site} />;
    case 'clean-blue':
      return <CleanBlueNotFound site={site} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
}

export interface ChannelPageProps {
  readonly site: NetworkSiteData;
  readonly kicker: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
  readonly indexable?: boolean | undefined;
}

/**
 * Dispatcher halaman kanal (kategori/tag) antar-template: pita identitas +
 * grid kartu, tanpa hero/ticker beranda.
 */
export function ChannelPage(props: ChannelPageProps) {
  switch (normalizeTemplateId(props.site.settings.colors.templateId)) {
    case 'black-lime':
      return <BlackLimeChannel {...props} />;
    case 'dark-navy':
      return <DarkNavyChannel {...props} />;
    case 'glassy-blue':
      return <GlassyBlueChannel {...props} />;
    case 'green-minimal':
      return <GreenMinimalChannel {...props} />;
    case 'orange-modern':
      return <OrangeModernChannel {...props} />;
    case 'purple-editorial':
      return <PurpleEditorialChannel {...props} />;
    case 'red-editorial':
      return <RedEditorialChannel {...props} />;
    case 'soft-blue':
      return <SoftBlueChannel {...props} />;
    case 'warm-editorial':
      return <WarmEditorialChannel {...props} />;
    case 'clean-blue':
      return <CleanBlueChannel {...props} />;
    default:
      throw new Error('Template site tidak dikenal.');
  }
}
