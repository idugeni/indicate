import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticlePickCard, type PickCardSkin } from '@/modules/site/components/network/cards/article-pick-card';
import { DARK_NAVY, badgeStyle } from '@/modules/site/components/network/templates/dark-navy/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/dark-navy/ui/article-meta';

const skin: PickCardSkin = {
  cardClass: 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-[#0e1a33] text-[#eaf0fb] shadow-sm ring-1 ring-[#1b2c4f]/60',
  imageWrapperClass: 'relative px-3 pt-3',
  badgePlacement: 'overlay',
  badgeClass: 'absolute left-6 top-6 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md',
  badgeStyle,
  headerClass: 'flex-1 px-5 pt-4',
  titleClass: 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-[#eaf0fb]',
  titleLinkClass: 'hover:text-[#2f7bff]',
  descriptionClass: 'line-clamp-3 font-sans text-sm leading-relaxed text-[#9aa9c4]',
  publisherClass: 'm-0 truncate font-sans text-xs font-bold text-[#eaf0fb]',
  footerClass: 'mt-auto flex items-center justify-between gap-3 border-t border-[#1b2c4f] bg-[#0e1a33] px-5 py-3.5',
  arrowClass: 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#14294f] text-[#2f7bff] transition-colors hover:bg-[#2f7bff] hover:text-white',
  avatarSkin: DARK_NAVY.authorAvatar,
  Meta: ArticleMeta,
};

/**
 * Kartu pilihan Dark Navy.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge.
 * @param sizes - Atribut `sizes` gambar responsif.
 * @returns Kartu pilihan vertikal Dark Navy.
 */
export function DarkNavyPickCard({
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
