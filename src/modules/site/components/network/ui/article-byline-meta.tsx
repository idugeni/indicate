import { CalendarDays, Clock3, Eye } from 'lucide-react';

import { formatDate, formatFullViews } from '@/modules/site/components/network/ui/format';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';

/**
 * Baris meta byline berikon: tanggal terbit, lama baca, jumlah pembaca, jumlah komentar.
 *
 * @param publishedAt - Timestamp ISO terbit artikel.
 * @param reading - Estimasi menit baca.
 * @param viewCount - Jumlah view mentah.
 * @param articleId - Identitas artikel untuk thread komentar; tanpa ini jumlah komentar tidak tampil.
 * @param href - Tautan relatif artikel (`/slug`) untuk thread komentar milik portal ini.
 * @param className - Kelas warna teks dari tema template; diwariskan ke ikon via `currentColor`.
 * @returns Baris meta tanpa pemisah titik, dengan jarak proporsional per breakpoint.
 * @remarks Setiap item membawa ikon lucide-nya sendiri (`CalendarDays`,
 * `Clock3`, `Eye`, `MessageSquare`) sehingga tidak ada pemisah `·` yang terkesan seadanya.
 * Jarak antar-item melebar seiring viewport (`gap-x-3` → `sm:gap-x-4` →
 * `md:gap-x-5`) dan ukuran teks naik di `sm`. Jumlah komentar menghilang
 * sendiri (bukan rusak) saat portal mematikan komentar atau menaut ke portal lain.
 */
export function ArticleBylineMeta({
  publishedAt,
  reading,
  viewCount,
  articleId,
  href,
  className = '',
}: {
  readonly publishedAt: string;
  readonly reading: number;
  readonly viewCount: number;
  readonly articleId?: string | undefined;
  readonly href?: string | undefined;
  readonly className?: string | undefined;
}) {
  const item = 'inline-flex items-center gap-1.5';
  const icon = 'h-3.5 w-3.5 shrink-0 opacity-70';
  return (
    <span
      className={`mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tabular-nums sm:mt-1 sm:gap-x-4 sm:text-[13px] md:gap-x-5${className === '' ? '' : ` ${className}`}`}
    >
      <span className={item}>
        <CalendarDays className={icon} aria-hidden="true" />
        <time dateTime={publishedAt}>{formatDate(publishedAt, 'long')}</time>
      </span>
      <span className={item}>
        <Clock3 className={icon} aria-hidden="true" />
        {reading} menit baca
      </span>
      <span className={item}>
        <Eye className={icon} aria-hidden="true" />
        {formatFullViews(viewCount)} pembaca
      </span>
      {articleId === undefined || href === undefined ? null : (
        <CommentCountSlot articleId={articleId} href={href} className={item} iconClassName={icon} />
      )}
    </span>
  );
}
