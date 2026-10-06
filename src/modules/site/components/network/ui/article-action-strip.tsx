import type { ArticleListItem } from '@/modules/delivery/models';
import { ShareButtons, type ShareButtonsSkin } from '@/modules/site/components/network/cards/share-buttons';
import { ArticlePrintButton } from '@/modules/site/components/network/ui/article-print-button';

/**
 * Strip aksi artikel: bagikan di kiri, cetak di kanan, tanpa kartu.
 *
 * @param skin - Warna netral tombol bagikan dari tema template.
 * @param article - Artikel yang dibagikan.
 * @param canonical - URL kanonis artikel.
 * @param light - True saat tampil di atas foto gelap; ikon memakai putih.
 * @param tone - Skema template untuk kontras hover.
 * @returns Baris aksi tanpa garis di bawah kartu byline.
 */
export function ArticleActionStrip({
  skin,
  article,
  canonical,
  light = false,
  tone = 'light',
}: {
  readonly skin: ShareButtonsSkin;
  readonly article: ArticleListItem;
  readonly canonical: string;
  readonly light?: boolean;
  readonly tone?: 'light' | 'dark';
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 py-1 print:hidden">
      <ShareButtons skin={skin} article={article} canonical={canonical} light={light} tone={tone} />
      <ArticlePrintButton title={article.title} light={light} />
    </div>
  );
}
