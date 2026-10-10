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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  hasAnalyticsSignal,
  labelFlows,
  labelOutcomes,
  withLabels,
  NO_PUBLICATION_TITLE,
  NO_PUBLICATION_DESCRIPTION,
} from '@/modules/dashboard/components/analytics/chart-helpers';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import type { AnalyticsProjection } from '@/modules/dashboard/models';

/**
 * Render the Statistics & Charts visual gallery from a single projection.
 *
 * @param data - Per-organization analytics projection from the workspace endpoint.
 * @returns Stack of 15 core visuals: trends, KPIs, comparisons, heat, flows, and distributions.
 */
export function TelemetryGallery({ data }: { readonly data: AnalyticsProjection }) {
  const series = data.penyaluranHarian ?? data.tugasHarian ?? [];
  const labeledOutcomes = labelOutcomes(data.outcomesBySiteAndState, data.siteLabels);
  const labeledFlows = labelFlows(data.arusPenerbit, data.publisherLabels, data.siteLabels);
  const labeledProjection: AnalyticsProjection = {
    ...data,
    articlesByRegion: withLabels(data.articlesByRegion, data.regionLabels),
    articlesByCategory: withLabels(data.articlesByCategory, data.categoryLabels),
    articlesByPublisher: withLabels(data.articlesByPublisher, data.publisherLabels),
    outcomesBySiteAndState: labeledOutcomes,
    arusPenerbit: labeledFlows,
  };
  if (!hasAnalyticsSignal(data)) {
    return <EmptyState title={NO_PUBLICATION_TITLE} description={NO_PUBLICATION_DESCRIPTION} />;
  }
  return (
    <Tabs defaultValue="ringkasan" className="w-full">
      <TabsList aria-label="Bagian analitik" className="grid h-auto w-full max-w-full grid-cols-2 gap-1 overflow-visible sm:flex sm:flex-wrap">
        <TabsTrigger value="ringkasan" className="flex-1">Ringkasan</TabsTrigger>
        <TabsTrigger value="tren" className="flex-1">Tren</TabsTrigger>
        <TabsTrigger value="distribusi" className="flex-1">Distribusi</TabsTrigger>
        <TabsTrigger value="aktivitas" className="flex-1">Aktivitas</TabsTrigger>
      </TabsList>
      <TabsContent keepMounted value="ringkasan">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-12">
          <div className="min-w-0 sm:col-span-2 lg:col-span-12">
            <KpiSparkline series={series} />
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-12">
            <PublicationTrend series={series} />
          </div>
        </div>
      </TabsContent>
      <TabsContent keepMounted value="tren">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <MetricComparison series={series} />
          <StackedTasks series={series} />
        </div>
      </TabsContent>
      <TabsContent keepMounted value="distribusi">
        <div className="space-y-6">
          <SankeyFlow flows={labeledFlows} />
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <TreeMap title="Pohon penerbit" rows={labeledProjection.articlesByPublisher} emptyText="Belum ada data penerbit." />
            <SiteBubbles results={labeledOutcomes} />
          </div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-12">
            <div className="min-w-0 sm:col-span-1 lg:col-span-7">
              <StatusMatrix results={labeledOutcomes} />
            </div>
            <div className="min-w-0 sm:col-span-1 lg:col-span-5">
              <Timeline events={data.aktivitasTerbaru ?? []} />
            </div>
          </div>
          <TelemetryCharts data={labeledProjection} />
        </div>
      </TabsContent>
      <TabsContent keepMounted value="aktivitas">
        <div className="space-y-6">
          <ActivityHeatmap cells={data.aktivitasPerJam ?? []} />
          <ActivityCalendar series={series} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
