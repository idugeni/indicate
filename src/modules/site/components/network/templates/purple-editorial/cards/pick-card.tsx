import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticlePickCard, type PickCardSkin } from '@/modules/site/components/network/cards/article-pick-card';
import { PURPLE_EDITORIAL, badgeStyle } from '@/modules/site/components/network/templates/purple-editorial/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/purple-editorial/ui/article-meta';

const skin: PickCardSkin = {
  cardClass: 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60',
  imageWrapperClass: 'relative px-3 pt-3',
  badgePlacement: 'overlay',
  badgeClass: 'absolute bottom-0 left-6 inline-block translate-y-1/3 rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md',
  badgeStyle,
  headerClass: 'flex-1 px-5 pt-6',
  titleClass: 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900',
  titleLinkClass: 'hover:text-[#7c3aed]',
  descriptionClass: 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-600',
  publisherClass: 'm-0 truncate font-sans text-xs font-bold text-slate-800',
  footerClass: 'mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5',
  arrowClass: 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#ede9fe] text-[#7c3aed] transition-colors hover:bg-[#7c3aed] hover:text-white',
  avatarSkin: PURPLE_EDITORIAL.authorAvatar,
  Meta: ArticleMeta,
};

/**
 * Kartu pilihan Purple Editorial.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge.
 * @param sizes - Atribut `sizes` gambar responsif.
 * @returns Kartu pilihan vertikal Purple Editorial.
 */
export function PurpleEditorialPickCard({
  article,
  index,
  sizes,
}: {
  readonly article: ArticleListItem;
  readonly index: number;
  readonly sizes?: string | undefined;
}) {
  return <ArticlePickCard article={article} index={index} skin={skin} sizes={sizes} />;
}
