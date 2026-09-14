import type { NetworkArticle, NetworkSiteData } from '@/modules/delivery/models';
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
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';
import { CleanBlueListing } from '@/modules/site/components/network/templates/clean-blue/index';
import { CleanBlueArticle } from '@/modules/site/components/network/templates/clean-blue/article';

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
  NetworkTemplate,
  CleanBlueListing,
  CleanBlueArticle,
};
export { TEMPLATE_IDS, type ListingProps, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';
export type { CardVariant };

export function ListingPage({
  site,
  title,
  description,
  path = '/',
  indexable = true,
  page = 1,
  basePath,
}: ListingProps) {
  const shared = { site, title, description, path, indexable, page, basePath: basePath ?? path } as const;
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
