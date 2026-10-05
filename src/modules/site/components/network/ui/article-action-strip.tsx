import type { ArticleListItem } from '@/modules/delivery/models';
import { ShareButtons, type ShareButtonsSkin } from '@/modules/site/components/network/cards/share-buttons';
import { ArticlePrintButton } from '@/modules/site/components/network/ui/article-print-button';

/**
 * Strip aksi artikel: bagikan di kiri, cetak di kanan, tanpa kartu.
 *
 * @param skin - Warna netral tombol bagikan dari tema template.
 * @param article - Artikel yang dibagikan.
 * @param canonical - URL kanonis artikel.
 * @returns Baris aksi ber-hairline di bawah kartu byline.
 */
export function ArticleActionStrip({
  skin,
  article,
  canonical,
}: {
  readonly skin: ShareButtonsSkin;
  readonly article: ArticleListItem;
  readonly canonical: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--tpl-ring,#e2e8f0)] py-3 print:hidden">
      <ShareButtons skin={skin} article={article} canonical={canonical} />
      <ArticlePrintButton title={article.title} />
    </div>
  );
}
