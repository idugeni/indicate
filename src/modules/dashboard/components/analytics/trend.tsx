'use client';

import { useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { TaskDay } from '@/modules/dashboard/models';
import { COLOR_PUBLISHED, COLOR_FAILED, COLOR_QUEUED, weekdayLabel } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

const RANGE = [7, 30, 90] as const;

interface SeriesRow {
  readonly hari: string;
  readonly label: string;
  readonly diterbitkan: number;
  readonly gagal: number;
  readonly antre: number;
}

function buildSeries(series: readonly TaskDay[], range: number): SeriesRow[] {
  return series.slice(-range).map((point) => ({
    hari: point.hari,
    label: weekdayLabel(point.hari),
    diterbitkan: point.diterbitkan,
    gagal: point.gagal,
    antre: point.antre,
  }));
}

/**
 * Render publication trends as an interactive stacked area.
 *
 * @param series - Daily buckets from the analytics projection (max 90 days).
 * @returns Area card with a 7/30/90-day switch.
 */
export function PublicationTrend({ series }: { readonly series: readonly TaskDay[] }) {
  const [range, setRange] = useState<number>(30);
  const grad = useId().replace(/:/g, '');
  const data = buildSeries(series, range);
  return (
    <section
      aria-label="Tren publikasi"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Tren publikasi
          </h2>
          <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
            Tugas diterbitkan, gagal, dan antre per hari
          </p>
        </div>
        <div role="group" aria-label="Rentang tren" className="flex items-center gap-1.5">
          {RANGE.map((option) => (
            <Button
              key={option}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={`font-mono text-[11px] tabular-nums ${
                range === option
                  ? 'border-brass/60 bg-bg-raised-2 text-paper'
                  : 'border-hairline text-paper-faint hover:border-hairline-strong hover:text-paper'
              }`}
            >
              {option}h
            </Button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <EmptyState title="Belum ada data deret waktu." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer
          config={{
            diterbitkan: { label: 'Diterbitkan', color: COLOR_PUBLISHED },
            gagal: { label: 'Gagal', color: COLOR_FAILED },
            antre: { label: 'Antre', color: COLOR_QUEUED },
          }}
          className="mt-4 h-64 w-full"
        >
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`${grad}-terbit`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_PUBLISHED} stopOpacity={0.45} />
                <stop offset="100%" stopColor={COLOR_PUBLISHED} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`${grad}-gagal`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_FAILED} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLOR_FAILED} stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`${grad}-antre`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_QUEUED} stopOpacity={0.4} />
                <stop offset="100%" stopColor={COLOR_QUEUED} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0]?.payload as SeriesRow | undefined;
                    return first === undefined ? null : weekdayLabel(first.hari);
                  }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            <Area type="monotone" dataKey="diterbitkan" stackId="tren" stroke={COLOR_PUBLISHED} strokeWidth={2} fill={`url(#${grad}-terbit)`} />
            <Area type="monotone" dataKey="gagal" stackId="tren" stroke={COLOR_FAILED} strokeWidth={2} fill={`url(#${grad}-gagal)`} />
            <Area type="monotone" dataKey="antre" stackId="tren" stroke={COLOR_QUEUED} strokeWidth={2} fill={`url(#${grad}-antre)`} />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render a three-metric daily comparison as lines.
 *
 * @param series - Daily buckets from the analytics projection (max 90 days).
 * @returns Multi-metric line card for the trailing 30 days.
 */
export function MetricComparison({ series }: { readonly series: readonly TaskDay[] }) {
  const data = buildSeries(series, 30);
  return (
    <section
      aria-label="Perbandingan metrik"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Perbandingan metrik
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Tiga metrik harian, 30 hari terakhir
      </p>
      {data.length === 0 ? (
        <EmptyState title="Belum ada data deret waktu." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer
          config={{
            diterbitkan: { label: 'Diterbitkan', color: COLOR_PUBLISHED },
            gagal: { label: 'Gagal', color: COLOR_FAILED },
            antre: { label: 'Antre', color: COLOR_QUEUED },
          }}
          className="mt-4 h-64 w-full"
        >
          <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0]?.payload as SeriesRow | undefined;
                    return first === undefined ? null : weekdayLabel(first.hari);
                  }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            <Line type="monotone" dataKey="diterbitkan" stroke={COLOR_PUBLISHED} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="gagal" stroke={COLOR_FAILED} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="antre" stroke={COLOR_QUEUED} strokeWidth={2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}
