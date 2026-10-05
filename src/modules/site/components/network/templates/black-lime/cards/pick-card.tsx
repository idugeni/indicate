import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticlePickCard, type PickCardSkin } from '@/modules/site/components/network/cards/article-pick-card';
import { BLACK_LIME, badgeStyle } from '@/modules/site/components/network/templates/black-lime/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/black-lime/ui/article-meta';

const skin: PickCardSkin = {
  cardClass: 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-[#131711] text-slate-100 shadow-sm ring-1 ring-[#242b1f]',
  imageWrapperClass: 'relative px-3 pt-3',
  badgePlacement: 'overlay',
  badgeClass: 'absolute left-6 top-6 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md',
  badgeStyle,
  headerClass: 'flex-1 px-5 pt-4',
  titleClass: 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-100',
  titleLinkClass: 'hover:text-[#c5f82a]',
  descriptionClass: 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-400',
  publisherClass: 'm-0 truncate font-sans text-xs font-bold text-slate-200',
  footerClass: 'mt-auto flex items-center justify-between gap-3 border-t border-[#242b1f] bg-[#131711] px-5 py-3.5',
  arrowClass: 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#c5f82a] text-[#0a0c07] transition-colors hover:bg-[#9ecb14]',
  avatarSkin: BLACK_LIME.authorAvatar,
  Meta: ArticleMeta,
};

/**
 * Kartu pilihan Black Lime.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge.
 * @param sizes - Atribut `sizes` gambar responsif.
 * @returns Kartu pilihan vertikal Black Lime.
 */
export function BlackLimePickCard({
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
