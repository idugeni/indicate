import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { Progress } from '@/components/ui/progress';
import { ChartTip } from '@/modules/dashboard/components/shared/chart-tip';
import type { AnalyticsPoint } from '@/modules/dashboard/models';

const ROW_LIMIT = 5;

function percent(value: number, base: number): string {
  if (base <= 0) return '—';
  return `${Math.round((value / base) * 100)}%`;
}

/**
 * Render an editorial conversion funnel from articles to successful outcomes.
 *
 * @param active - Active articles ready for delivery.
 * @param tasks - Queued publishing tasks.
 * @param succeeded - Successful site outcomes.
 * @param className - Parent-grid bento span.
 * @returns Three ordered stages with inter-stage conversion rates.
 */
export function ConversionFunnel({
  active,
  tasks,
  succeeded,
  className,
}: {
  readonly active: number;
  readonly tasks: number;
  readonly succeeded: number;
  readonly className?: string;
}) {
  const stages = [
    { label: 'Artikel aktif', value: active, note: 'Naskah siap salur' },
    { label: 'Tugas antrean', value: tasks, note: `${percent(tasks, active)} dari artikel` },
    { label: 'Hasil sukses', value: succeeded, note: `${percent(succeeded, tasks)} dari tugas` },
  ];
  const max = Math.max(active, tasks, succeeded, 1);
  return (
    <section
      aria-label="Corong konversi"
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6${className === undefined ? '' : ` ${className}`}`}
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Corong konversi
      </h2>
      <ol className="m-0 mt-4 list-none space-y-4 p-0">
        {stages.map((item) => (
          <li key={item.label} className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] sm:gap-3">
            <div className="min-w-0">
              <p className="m-0 truncate font-sans text-[13px] font-medium text-paper">{item.label}</p>
              <p className="m-0 truncate font-sans text-xs text-paper-faint">{item.note}</p>
            </div>
            <Progress value={(item.value / max) * 100} aria-label={`${item.label} ${item.value.toLocaleString('id-ID')}`} className="min-w-0" />
            <span className="flex-none font-mono text-sm font-bold tabular-nums text-paper">
              {item.value.toLocaleString('id-ID')}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Render a top-five ranking for one analytics dimension.
 *
 * @param title - Ranking card title.
 * @param rows - Unsorted analytics points (`key` + `count`).
 * @param className - Parent-grid bento span.
 * @returns Ranked list with proportional bars; empty text when blank.
 */
export function TopRanked({
  title,
  rows,
  className,
}: {
  readonly title: string;
  readonly rows: readonly AnalyticsPoint[];
  readonly className?: string;
}) {
  const topRows = [...rows].sort((a, b) => b.count - a.count).slice(0, ROW_LIMIT);
  const max = Math.max(...topRows.map((point) => point.count), 1);
  return (
    <section
      aria-label={title}
      className={`flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5${className === undefined ? '' : ` ${className}`}`}
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        {title}
      </h2>
      {topRows.length === 0 ? (
        <EmptyState title="Belum ada data." description="Data akan tampil di sini setelah tersedia." className="mt-3" />
      ) : (
        <ol className="m-0 mt-3 list-none space-y-2.5 p-0">
          {topRows.map((point, rank) => (
            <li key={point.key} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
              <span className="w-5 flex-none font-mono text-[11px] tabular-nums text-paper-faint">
                {rank + 1}
              </span>
              <div className="min-w-0">
                <ChartTip tip={point.key}>
                  <p className="m-0 truncate font-sans text-[13px] text-paper">
                    {point.key}
                  </p>
                </ChartTip>
                <Progress value={(point.count / max) * 100} aria-label={`${point.key} ${point.count.toLocaleString('id-ID')}`} className="mt-1 min-w-0" />
              </div>
              <span className="flex-none font-mono text-xs font-bold tabular-nums text-paper">
                {point.count.toLocaleString('id-ID')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
