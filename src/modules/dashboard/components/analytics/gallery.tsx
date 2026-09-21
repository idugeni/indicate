'use client';

import { SankeyFlow } from '@/modules/dashboard/components/analytics/sankey';
import { SiteBubbles } from '@/modules/dashboard/components/analytics/bubbles';
import { ActivityCalendar, ActivityHeatmap } from '@/modules/dashboard/components/analytics/heatmap';
import { KpiSparkline } from '@/modules/dashboard/components/analytics/kpi-spark';
import { Timeline } from '@/modules/dashboard/components/analytics/timeline';
import { StatusMatrix } from '@/modules/dashboard/components/analytics/matrix';
import { MetricComparison, PublicationTrend } from '@/modules/dashboard/components/analytics/trend';
import { TreeMap } from '@/modules/dashboard/components/analytics/treemap';
import { TelemetryCharts } from '@/modules/dashboard/components/analytics/telemetry-charts';
import { StackedTasks } from '@/modules/dashboard/components/analytics/stack';
import { truncateLabel } from '@/modules/dashboard/components/analytics/chart-helpers';
import type { AnalyticsPoint, AnalyticsProjection, ArusPenerbit } from '@/modules/dashboard/models';

/**
 * Resolve dimension IDs to human-readable labels using the projection label maps.
 *
 * @param rows - Raw dimension points from the analytics projection.
 * @param labels - ID-to-name label map, or undefined when unavailable.
 * @returns Points with labeled keys; foreign IDs truncated to fit charts.
 */
function withLabels(
  rows: readonly AnalyticsPoint[] | undefined,
  labels: Readonly<Record<string, string>> | undefined,
): readonly AnalyticsPoint[] {
  return (rows ?? []).map((point) => ({ key: labels?.[point.key] ?? truncateLabel(point.key, 24), count: point.count }));
}

/**
 * Render the Statistics & Charts visual gallery from a single projection.
 *
 * @param data - Per-organization analytics projection from the workspace endpoint.
 * @returns Stack of 15 core visuals: trends, KPIs, comparisons, heat, flows, and distributions.
 */
export function TelemetryGallery({ data }: { readonly data: AnalyticsProjection }) {
  const series = data.penyaluranHarian ?? data.tugasHarian ?? [];
  const siteName = (id: string): string => data.siteLabels?.[id] ?? truncateLabel(id, 18);
  const labeledOutcomes = (data.outcomesBySiteAndState ?? []).map((point) => {
    const separatorIndex = point.key.indexOf(':');
    if (separatorIndex < 0) return point;
    return { key: `${siteName(point.key.slice(0, separatorIndex))}:${point.key.slice(separatorIndex + 1)}`, count: point.count };
  });
  const labeledFlows: readonly ArusPenerbit[] = (data.arusPenerbit ?? []).map((flow) => ({
    penerbit: data.publisherLabels?.[flow.penerbit] ?? truncateLabel(flow.penerbit, 16),
    situs: siteName(flow.situs),
    hasil: flow.hasil,
    jumlah: flow.jumlah,
  }));
  const labeledProjection: AnalyticsProjection = {
    ...data,
    articlesByRegion: withLabels(data.articlesByRegion, data.regionLabels),
    articlesByCategory: withLabels(data.articlesByCategory, data.categoryLabels),
    articlesByPublisher: withLabels(data.articlesByPublisher, data.publisherLabels),
    outcomesBySiteAndState: labeledOutcomes,
    arusPenerbit: labeledFlows,
  };
  return (
    <div className="space-y-6">
      <PublicationTrend series={series} />
      <KpiSparkline series={series} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <MetricComparison series={series} />
        <StackedTasks series={series} />
      </div>
      <ActivityHeatmap cells={data.aktivitasPerJam ?? []} />
      <ActivityCalendar series={series} />
      <SankeyFlow flows={labeledFlows} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <TreeMap title="Pohon penerbit" rows={labeledProjection.articlesByPublisher} emptyText="Belum ada data penerbit." />
        <SiteBubbles results={labeledOutcomes} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <StatusMatrix results={labeledOutcomes} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <Timeline events={data.aktivitasTerbaru ?? []} />
        </div>
      </div>
      <TelemetryCharts data={labeledProjection} />
    </div>
  );
}
