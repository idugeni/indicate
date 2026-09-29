import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { Progress } from '@/components/ui/progress';
import { ChartTip } from '@/modules/dashboard/components/shared/chart-tip';
import type { AnalyticsPoint } from '@/modules/dashboard/models';

const ROW_LIMIT = 5;

function percent(value: number, base: number): string {
  if (base <= 0) return '—';
  return `${Math.round((value / base) * 100)}%`;
}

function fanOut(deliveries: number, articles: number): string {
  if (articles <= 0) return '—';
  return `Rata-rata ${Math.round(deliveries / articles).toLocaleString('id-ID')} portal per artikel`;
}

/**
 * Render an editorial conversion funnel from articles to successful portal deliveries.
 *
 * @param props.active - Active articles ready for delivery.
 * @param props.deliveries - Portal assignments the articles resolved to.
 * @param props.succeeded - Site outcomes that reached `published`.
 * @param props.className - Parent-grid bento span.
 * @returns Three ordered stages: articles, portal targets, live outcomes.
 * @remarks The middle stage is a fan-out, not a conversion rate: one article
 * reaches every portal in the network, so the ratio is read as "N portal per
 * artikel". Rendering it as a percentage produced values like `13400%`, and
 * calling it "Tugas antrean" collided with the queue card, which counts jobs.
 */
export function ConversionFunnel({
  active,
  deliveries,
  succeeded,
  className,
}: {
  readonly active: number;
  readonly deliveries: number;
  readonly succeeded: number;
  readonly className?: string;
}) {
  const stages = [
    { label: 'Artikel aktif', value: active, note: 'Naskah siap salur' },
    { label: 'Portal tujuan', value: deliveries, note: fanOut(deliveries, active) },
    { label: 'Hasil sukses', value: succeeded, note: `${percent(succeeded, deliveries)} dari portal` },
  ];
  const max = Math.max(active, deliveries, succeeded, 1);
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
