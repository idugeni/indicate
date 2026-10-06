import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticlePickCard, type PickCardSkin } from '@/modules/site/components/network/cards/article-pick-card';
import { ORANGE_MODERN, badgeStyle } from '@/modules/site/components/network/templates/orange-modern/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/orange-modern/ui/article-meta';

const skin: PickCardSkin = {
  cardClass: 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60',
  imageWrapperClass: 'relative px-3 pt-3',
  badgePlacement: 'overlay',
  badgeClass: 'absolute left-6 top-6 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md',
  badgeStyle,
  headerClass: 'flex-1 px-5 pt-4',
  titleClass: 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900',
  titleLinkClass: 'hover:text-[var(--tpl-primary,#ea580c)]',
  descriptionClass: 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-600',
  publisherClass: 'm-0 truncate font-sans text-xs font-bold text-slate-800',
  footerClass: 'mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5',
  arrowClass: 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary-soft,#ffedd5)] text-[var(--tpl-primary,#ea580c)] transition-colors hover:bg-[var(--tpl-primary,#ea580c)] hover:text-white',
  avatarSkin: ORANGE_MODERN.authorAvatar,
  Meta: ArticleMeta,
};

/**
 * Kartu pilihan Orange Modern.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge.
 * @param sizes - Atribut `sizes` gambar responsif.
 * @returns Kartu pilihan vertikal Orange Modern.
 */
export function OrangeModernPickCard({
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
