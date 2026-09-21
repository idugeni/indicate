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
import type { AnalyticsProjection } from '@/modules/dashboard/models';

/**
 * Render galeri visual Statistik & Grafik dari satu proyeksi.
 *
 * @param data - Proyeksi analitik per organisasi dari endpoint workspace.
 * @returns Tumpukan 15 visual inti: tren, KPI, perbandingan, panas, alur, dan distribusi.
 */
export function TelemetryGallery({ data }: { readonly data: AnalyticsProjection }) {
  const deret = data.tugasHarian ?? [];
  return (
    <div className="space-y-6">
      <PublicationTrend series={deret} />
      <KpiSparkline series={deret} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <MetricComparison series={deret} />
        <StackedTasks series={deret} />
      </div>
      <ActivityHeatmap cells={data.aktivitasPerJam ?? []} />
      <ActivityCalendar series={deret} />
      <SankeyFlow flows={data.arusPenerbit ?? []} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <TreeMap title="Pohon penerbit" rows={data.articlesByPublisher ?? []} emptyText="Belum ada data penerbit." />
        <SiteBubbles results={data.outcomesBySiteAndState ?? []} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <StatusMatrix results={data.outcomesBySiteAndState ?? []} />
        </div>
        <div className="min-w-0 lg:col-span-5">
          <Timeline events={data.aktivitasTerbaru ?? []} />
        </div>
      </div>
      <TelemetryCharts data={data} />
    </div>
  );
}
