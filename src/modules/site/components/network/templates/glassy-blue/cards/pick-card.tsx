import type { ArticleListItem } from '@/modules/delivery/models';
import { ArticlePickCard, type PickCardSkin } from '@/modules/site/components/network/cards/article-pick-card';
import { GLASSY_BLUE, badgeStyle } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/glassy-blue/ui/article-meta';

const skin: PickCardSkin = {
  cardClass: 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70 transition-shadow duration-200 hover:shadow-lg hover:shadow-[var(--tpl-primary,#1f7cff)]/10',
  imageWrapperClass: 'px-3 pt-3',
  badgePlacement: 'header',
  badgeClass: 'inline-block rounded-md px-2 py-0.5 font-sans text-[11px] font-bold',
  badgeStyle,
  headerClass: 'flex-1 px-5 pt-4',
  titleClass: 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900',
  titleLinkClass: 'hover:text-[var(--tpl-primary,#1f7cff)]',
  descriptionClass: 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-600',
  publisherClass: 'm-0 truncate font-sans text-xs font-bold text-slate-800',
  footerClass: 'mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5',
  arrowClass: 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary-soft,#e3efff)] text-[var(--tpl-primary,#1f7cff)] transition-colors hover:bg-[var(--tpl-primary,#1f7cff)] hover:text-white',
  avatarSkin: GLASSY_BLUE.authorAvatar,
  Meta: ArticleMeta,
};

/**
 * Kartu Berita Pilihan 3 kolom: gambar rounded, badge pastel, panah lingkaran.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge pastel.
 * @param sizes - Atribut `sizes` gambar responsif.
 * @returns Kartu pilihan kaca terang.
 */
export function GlassyBluePickCard({
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
