import { CalendarDays, Clock3, Eye } from 'lucide-react';

import { formatDate, formatFullViews } from '@/modules/site/components/network/templates/dark-navy/lib/format';
import { VIEW_COUNT_FRESHNESS_NOTE } from '@/modules/site/pageview-contract';

/**
 * Baris meta artikel berikon: tanggal, lama baca, angka views penuh.
 *
 * @param publishedAt - Timestamp ISO terbit.
 * @param reading - Estimasi menit baca.
 * @param viewCount - Jumlah view mentah.
 * @returns Baris meta aksesibel.
 */
export function ArticleMeta({
  publishedAt,
  reading,
  viewCount,
}: {
  readonly publishedAt: string;
  readonly reading: number;
  readonly viewCount: number;
}) {
  const item = 'inline-flex items-center gap-1.5';
  const icon = 'h-3.5 w-3.5 text-[#5f6f8c]';
  return (
    <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-sans text-xs tabular-nums text-[#9aa9c4]">
      <span className={item}>
        <CalendarDays className={icon} aria-hidden="true" />
        {formatDate(publishedAt, 'medium')}
      </span>
      <span className={item}>
        <Clock3 className={icon} aria-hidden="true" />
        {reading} mnt baca
      </span>
      <span className={item} title={VIEW_COUNT_FRESHNESS_NOTE}>
        <Eye className={icon} aria-hidden="true" />
        {formatFullViews(viewCount)}
      </span>
    </span>
  );
}
