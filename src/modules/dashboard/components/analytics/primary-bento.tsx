'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { AnalyticsProjection, ViewsHarian, ViewsPoint } from '@/modules/dashboard/models';
import { weekdayLabel, truncateLabel, categoryColor } from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { ActivityCalendar, ActivityHeatmap } from '@/modules/dashboard/components/analytics/heatmap';
import { KpiSparkline } from '@/modules/dashboard/components/analytics/kpi-spark';
import { Timeline } from '@/modules/dashboard/components/analytics/timeline';
import { StatusMatrix } from '@/modules/dashboard/components/analytics/matrix';
import { TreeMap } from '@/modules/dashboard/components/analytics/treemap';
import { SankeyFlow } from '@/modules/dashboard/components/analytics/sankey';
import { ConversionFunnel, TopRanked } from '@/modules/dashboard/components/analytics/summary-insights';
import { SummaryCharts, SuccessRate } from '@/modules/dashboard/components/analytics/summary-charts';
import { PublicationTrend } from '@/modules/dashboard/components/analytics/trend';

const RANGE = [7, 30, 90] as const;
const SITE_LIMIT = 10;
const BUBBLE_LIMIT = 20;

const STACK_COLORS: Record<string, string> = {
  published: '#5fcbb0',
  failed: '#d9705f',
  queued: '#d8a94e',
  processing: '#6c93c9',
  retrying: '#cc9a44',
  unpublished: '#8b93a7',
};

function buildLineSeries(series: readonly ViewsHarian[], range: number): readonly { hari: string; label: string; views: number }[] {
  return series.slice(-range).map((point) => ({ hari: point.hari, label: weekdayLabel(point.hari), views: point.views }));
}

/**
 * Render daily view trends as a line.
 *
 * @param series - Daily view buckets from the analytics projection (max 90 days).
 * @returns View line card with a 7/30/90-day switch.
 */
export function ViewsLine({ series }: { readonly series: readonly ViewsHarian[] }) {
  const [range, setRange] = useState<number>(30);
  const data = buildLineSeries(series, range);
  const total = series.reduce((count, point) => count + point.views, 0);
  return (
    <section
      aria-label="Tren tayangan"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Tren tayangan
          </h2>
          <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint">
            {total.toLocaleString('id-ID')} tayangan dalam rentang
          </p>
        </div>
        <div role="group" aria-label="Rentang tayangan" className="flex items-center gap-1.5">
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
        <EmptyState title="Belum ada data tayangan." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer
          config={{ views: { label: 'Tayangan', color: '#cc9a44' } }}
          className="mt-4 h-64 w-full"
        >
          <LineChart data={[...data]} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tick={{ fontSize: 11 }} />
            <YAxis width={44} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}rb` : String(value))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0]?.payload as { hari?: string } | undefined;
                    return first?.hari === undefined ? null : weekdayLabel(first.hari);
                  }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            <Line type="monotone" dataKey="views" stroke="#cc9a44" strokeWidth={2} dot={false} />
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render per-site view rankings as horizontal bars.
 *
 * @param rows - Per-site view points from the analytics projection.
 * @param label - Mapper from site ID to display name.
 * @returns Bar card for the top 10 sites.
 */
export function SiteViewsBar({ rows, label }: { readonly rows: readonly ViewsPoint[]; readonly label: (id: string) => string }) {
  const data = [...rows]
    .sort((left, right) => right.views - left.views)
    .slice(0, SITE_LIMIT)
    .map((point) => ({ name: label(point.key), views: point.views, sites: point.count }));
  const total = rows.reduce((count, point) => count + point.views, 0);
  return (
    <section
      aria-label="Tayangan per situs"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
            Tayangan per situs
          </h2>
          <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
            10 situs teratas berdasar view_count
          </p>
        </div>
        <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
          {total.toLocaleString('id-ID')} total
        </p>
      </div>
      {data.length === 0 ? (
        <EmptyState title="Belum ada data tayangan situs." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer config={{ views: { label: 'Tayangan', color: '#6c93c9' } }} className="mt-4 max-h-64 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              width={132}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(value: string) => truncateLabel(value)}
            />
            <XAxis type="number" hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            <Bar dataKey="views" radius={[2, 2, 2, 2]}>
              {data.map((point, rank) => (
                <Cell key={point.name} fill={categoryColor(rank)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render per-site delivery composition as categorical stacked bars.
 *
 * @param results - `site:status` points from the analytics projection.
 * @param label - Mapper from site ID to display name.
 * @returns Bar card for the top 8 sites with dynamic status stacks.
 */
export function SiteStack({ results, label }: { readonly results: readonly { readonly key: string; readonly count: number }[]; readonly label: (id: string) => string }) {
  const matrix = new Map<string, Map<string, number>>();
  for (const point of results) {
    const separatorIndex = point.key.indexOf(':');
    if (separatorIndex < 0) continue;
    const siteId = point.key.slice(0, separatorIndex);
    const status = point.key.slice(separatorIndex + 1);
    const row = matrix.get(siteId) ?? new Map<string, number>();
    row.set(status, (row.get(status) ?? 0) + point.count);
    matrix.set(siteId, row);
  }
  const topSites = [...matrix]
    .map(([name, row]) => ({ name, total: [...row.values()].reduce((a, b) => a + b, 0) }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 8);
  const statusList = [...new Set([...matrix.values()].flatMap((row) => [...row.keys()]))].sort();
  const data = topSites.map(({ name }) => ({
    site: truncateLabel(label(name), 14),
    ...Object.fromEntries(statusList.map((status) => [status, matrix.get(name)?.get(status) ?? 0])),
  }));
  return (
    <section
      aria-label="Komposisi situs"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Komposisi situs
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Penyaluran 8 situs teratas per status
      </p>
      {data.length === 0 ? (
        <EmptyState title="Belum ada hasil situs." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer
          config={Object.fromEntries(statusList.map((status) => [status, { label: status, color: STACK_COLORS[status] ?? '#8b93a7' }]))}
          className="mt-4 h-64 w-full"
        >
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="site" tickLine={false} axisLine={false} minTickGap={12} tick={{ fontSize: 11 }} />
            <YAxis width={36} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            {statusList.map((status, index) => (
              <Bar key={status} dataKey={status} stackId="site" fill={`var(--color-${status})`} radius={index === statusList.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </BarChart>
        </ChartContainer>
      )}
    </section>
  );
}

interface ViewsBubble {
  readonly name: string;
  readonly volume: number;
  readonly average: number;
  readonly total: number;
}

/**
 * Render volume vs average views per site as bubbles.
 *
 * @param rows - Per-site view points from the analytics projection.
 * @param label - Mapper from site ID to display name.
 * @returns Scatter card: x-axis volume, y-axis average views, bubble size total.
 */
export function ViewsBubbles({ rows, label }: { readonly rows: readonly ViewsPoint[]; readonly label: (id: string) => string }) {
  const data: ViewsBubble[] = [...rows]
    .sort((left, right) => right.views - left.views)
    .slice(0, BUBBLE_LIMIT)
    .map((point) => ({
      name: label(point.key),
      volume: point.count,
      average: point.count > 0 ? Math.round(point.views / point.count) : 0,
      total: point.views,
    }));
  return (
    <section
      aria-label="Gelembung tayangan"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Gelembung tayangan
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Volume vs rata-rata tayangan per situs
      </p>
      {data.length === 0 ? (
        <EmptyState title="Belum ada data sebar tayangan." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ChartContainer config={{ total: { label: 'Tayangan', color: '#5fcbb0' } }} className="mt-4 h-64 w-full">
          <ScatterChart margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <XAxis
              type="number"
              dataKey="volume"
              name="Volume"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              label={{ value: 'volume', position: 'insideBottomRight', fontSize: 10, fill: '#8b93a7' }}
            />
            <YAxis
              type="number"
              dataKey="average"
              name="Rata-rata"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              label={{ value: 'rata tayangan', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#8b93a7' }}
            />
            <ZAxis type="number" dataKey="total" range={[24, 220]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const first = payload?.[0]?.payload as ViewsBubble | undefined;
                    return first === undefined ? null : truncateLabel(first.name, 32);
                  }}
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString('id-ID') : String(value ?? '')
                  }
                />
              }
            />
            <Scatter data={data} fill="#5fcbb0" fillOpacity={0.75} />
          </ScatterChart>
        </ChartContainer>
      )}
    </section>
  );
}

/**
 * Render the main dashboard as a 15-visual enterprise bento.
 *
 * @param jobs - Publishing task counts by status for the queue donut.
 * @param succeeded - Successful site outcome count for funnel and radial.
 * @param failed - Failed site outcome count for funnel and radial.
 * @param active - Active article count for article donut and funnel.
 * @param archived - Archived article count for the article donut.
 * @param analytics - Tenant analytics projection; null while the telemetry endpoint is pending.
 * @returns 12-column bento grid: KPIs, donuts, funnel, trends, composition, heat, flows, and distributions.
 */
export function PrimaryBento({
  jobs,
  succeeded,
  failed,
  active,
  archived,
  analytics,
}: {
  readonly jobs: Readonly<Record<string, number>>;
  readonly succeeded: number;
  readonly failed: number;
  readonly active: number;
  readonly archived: number;
  readonly analytics: AnalyticsProjection | null;
}) {
  const series = analytics?.penyaluranHarian ?? analytics?.tugasHarian ?? [];
  const views = analytics?.viewsHarian ?? [];
  const outcomes = analytics?.outcomesBySiteAndState ?? [];
  const siteName = (id: string): string => analytics?.siteLabels?.[id] ?? truncateLabel(id, 18);
  const labeledOutcomes = outcomes.map((point) => {
    const separatorIndex = point.key.indexOf(':');
    if (separatorIndex < 0) return point;
    return { key: `${siteName(point.key.slice(0, separatorIndex))}:${point.key.slice(separatorIndex + 1)}`, count: point.count };
  });
  const withLabels = (rows: readonly { readonly key: string; readonly count: number }[] | undefined, labels: Readonly<Record<string, string>> | undefined) =>
    (rows ?? []).map((point) => ({ key: labels?.[point.key] ?? truncateLabel(point.key, 24), count: point.count }));
  const labeledFlows = (analytics?.arusPenerbit ?? []).map((flow) => ({
    penerbit: analytics?.publisherLabels?.[flow.penerbit] ?? truncateLabel(flow.penerbit, 16),
    situs: siteName(flow.situs),
    hasil: flow.hasil,
    jumlah: flow.jumlah,
  }));
  const articleTree = (analytics?.viewsByArticle ?? []).map((point) => ({
    key: analytics?.articleLabels?.[point.key] ?? truncateLabel(point.key, 28),
    count: point.views,
  }));
  const funnelTasks = analytics?.totalPenyaluran ?? (succeeded + failed);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 min-[420px]:grid-cols-6 lg:grid-cols-12 col-span-full">
      <div className="min-w-0 col-span-full">
        <KpiSparkline series={series} />
      </div>
      <SummaryCharts jobs={jobs} succeeded={succeeded} failed={failed} active={active} archived={archived} />
      <ConversionFunnel active={active} tasks={funnelTasks} succeeded={succeeded} className="min-[420px]:col-span-6 lg:col-span-8" />
      <SuccessRate succeeded={succeeded} failed={failed} className="min-[420px]:col-span-6 lg:col-span-4" />
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-7">
        <PublicationTrend series={series} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-5">
        <ViewsLine series={views} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <SiteStack results={outcomes} label={siteName} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <SiteViewsBar rows={analytics?.viewsBySite ?? []} label={siteName} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-7">
        <ActivityHeatmap cells={analytics?.aktivitasPerJam ?? []} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-5">
        <ActivityCalendar series={series} />
      </div>
      <div className="min-w-0 col-span-full">
        <SankeyFlow flows={labeledFlows} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <TreeMap title="Pohon artikel" rows={articleTree} emptyText="Belum ada tayangan artikel." />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-6">
        <ViewsBubbles rows={analytics?.viewsBySite ?? []} label={siteName} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-7">
        <StatusMatrix results={labeledOutcomes} />
      </div>
      <div className="min-w-0 min-[420px]:col-span-6 lg:col-span-5">
        <Timeline events={analytics?.aktivitasTerbaru ?? []} />
      </div>
      <TopRanked title="Wilayah teratas" rows={withLabels(analytics?.articlesByRegion, analytics?.regionLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
      <TopRanked title="Kategori teratas" rows={withLabels(analytics?.articlesByCategory, analytics?.categoryLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
      <TopRanked title="Situs teratas" rows={withLabels(analytics?.articlesBySite, analytics?.siteLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
      <TopRanked title="Penerbit teratas" rows={withLabels(analytics?.articlesByPublisher, analytics?.publisherLabels)} className="min-[420px]:col-span-3 lg:col-span-3" />
    </div>
  );
}
