'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { TugasHarian } from '@/modules/dashboard/models';
import { COLOR_QUEUED, COLOR_FAILED, COLOR_PUBLISHED } from '@/modules/dashboard/components/analytics/chart-helpers';

function deltaPercent(current: number, previous: number): string {
  if (previous <= 0) return current > 0 ? 'baru' : '—';
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? '+' : ''}${percent}%`;
}

/**
 * Render one 7-day KPI with a sparkline and prior-period delta.
 *
 * @param label - Visible metric name.
 * @param current - Rolling 7-day series.
 * @param previous - Prior 7-day series.
 * @param color - Sparkline stroke and area color.
 * @param pick - Value selector from one daily bucket.
 * @returns Compact KPI card.
 */
function SparkCard({
  label,
  current,
  previous,
  color,
  pick,
}: {
  readonly label: string;
  readonly current: readonly TugasHarian[];
  readonly previous: readonly TugasHarian[];
  readonly color: string;
  readonly pick: (point: TugasHarian) => number;
}) {
  const currentTotal = current.reduce((count, point) => count + pick(point), 0);
  const previousTotal = previous.reduce((count, point) => count + pick(point), 0);
  const delta = currentTotal - previousTotal;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const data = current.map((point, index) => ({ index, value: pick(point) }));
  return (
    <div className="h-full min-w-0 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5">
      <p className="m-0 font-sans text-xs font-medium text-paper-dim">{label}</p>
      <p className="m-0 mt-1 truncate font-mono text-2xl font-bold tabular-nums tracking-tight text-paper">
        {currentTotal.toLocaleString('id-ID')}
      </p>
      <p className="m-0 mt-1 flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-paper-faint">
        <Icon className="h-3 w-3 text-brass" aria-hidden="true" />
        {deltaPercent(currentTotal, previousTotal)} vs 7 hari lalu
      </p>
      <ChartContainer config={{ value: { label, color } }} className="mt-3 h-12 w-full">
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value) =>
                  typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                }
              />
            }
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={color} fillOpacity={0.22} dot={false} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

/**
 * Render three trailing-7-day KPIs with sparklines.
 *
 * @param series - Daily buckets from the analytics projection.
 * @returns KPI grid for success, tasks, and failures.
 */
export function KpiSparkline({ series }: { readonly series: readonly TugasHarian[] }) {
  const current = series.slice(-7);
  const previous = series.slice(-14, -7);
  return (
    <div className="grid h-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
      <SparkCard label="Sukses 7 hari" current={current} previous={previous} color={COLOR_PUBLISHED} pick={(point) => point.diterbitkan} />
      <SparkCard
        label="Tugas 7 hari"
        current={current}
        previous={previous}
        color={COLOR_QUEUED}
        pick={(point) => point.diterbitkan + point.gagal + point.antre}
      />
      <SparkCard label="Gagal 7 hari" current={current} previous={previous} color={COLOR_FAILED} pick={(point) => point.gagal} />
    </div>
  );
}
