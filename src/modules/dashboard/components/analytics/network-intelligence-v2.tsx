'use client';

import { Activity, BarChart3, Globe2, Radio, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AnalyticsProjection } from '@/modules/dashboard/models';
import { DashboardV2FilterBar } from '@/modules/dashboard/components/dashboard-v2-filter-bar';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { SankeyFlow } from '@/modules/dashboard/components/analytics/sankey';
import { SiteBubbles } from '@/modules/dashboard/components/analytics/bubbles';
import { ActivityCalendar, ActivityHeatmap } from '@/modules/dashboard/components/analytics/heatmap';
import { KpiSparkline } from '@/modules/dashboard/components/analytics/kpi-spark';
import { Timeline } from '@/modules/dashboard/components/analytics/timeline';
import { StatusMatrix } from '@/modules/dashboard/components/analytics/matrix';
import { MetricComparison, PublicationTrend } from '@/modules/dashboard/components/analytics/trend';
import { TreeMap } from '@/modules/dashboard/components/analytics/treemap';
import { TelemetryCharts } from '@/modules/dashboard/components/analytics/telemetry-charts';
import { hasAnalyticsSignal, labelFlows, labelOutcomes, withLabels } from '@/modules/dashboard/components/analytics/chart-helpers';

function sum(values: readonly number[]): number { return values.reduce((total, value) => total + value, 0); }

export function NetworkIntelligenceV2({ data, onFilterApply }: { readonly data: AnalyticsProjection; readonly onFilterApply?: (query: string) => void }) {
  const publication = data.penyaluranHarian ?? data.tugasHarian ?? [];
  const views = data.viewsHarian ?? [];
  const published = sum(publication.map((point) => point.diterbitkan));
  const failed = sum(publication.map((point) => point.gagal));
  const queued = sum(publication.map((point) => point.antre));
  const totalViews = sum(views.map((point) => point.views ?? 0));
  const labeledOutcomes = labelOutcomes(data.outcomesBySiteAndState, data.siteLabels);
  const labeledFlows = labelFlows(data.arusPenerbit, data.publisherLabels, data.siteLabels);
  const regions = withLabels(data.articlesByRegion, data.regionLabels);
  const publishers = withLabels(data.articlesByPublisher, data.publisherLabels);

  if (!hasAnalyticsSignal(data)) {
    return (
      <section aria-label="Network Intelligence" className="space-y-6">
        <header className="rounded-xl border border-hairline bg-bg-raised/60 p-5 sm:p-6">
          <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">03 / Network Intelligence</p>
          <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight text-paper sm:text-2xl">Network Intelligence</h1>
          <p className="m-0 mt-1 max-w-2xl text-sm leading-relaxed text-paper-faint">Decision support untuk memahami coverage, delivery, audience, dan hubungan publisher–portal.</p>
        </header>
        {onFilterApply ? <DashboardV2FilterBar view="analytics" data={data} onApply={onFilterApply} /> : null}
        <EmptyState title="Belum ada telemetry jaringan." description="Network Intelligence akan terisi dari aktivitas publikasi dan pembaca yang tercatat di server." />
      </section>
    );
  }

  return (
    <section aria-label="Network Intelligence" className="space-y-5">
      <header className="rounded-xl border border-hairline bg-bg-raised/60 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="m-0 font-mono text-[10px] uppercase tracking-[0.18em] text-brass">03 / Network Intelligence</p>
            <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight text-paper sm:text-2xl">Network Intelligence</h1>
            <p className="m-0 mt-1 max-w-2xl text-sm leading-relaxed text-paper-faint">Baca kesehatan distribusi, coverage publisher–portal, dan audience dari telemetry produksi tanpa menggabungkan metrik buatan.</p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase">Window {data.jendela.awal} → {data.jendela.akhir}</Badge>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Radio} label="Published deliveries" value={published} tone="text-signal" />
          <Metric icon={Activity} label="Failed deliveries" value={failed} tone="text-error" />
          <Metric icon={TrendingUp} label="Queued work" value={queued} tone="text-warning" />
          <Metric icon={Globe2} label="Reader views" value={totalViews} tone="text-brass" />
        </div>
      </header>

      {onFilterApply ? <DashboardV2FilterBar view="analytics" data={data} onApply={onFilterApply} /> : null}

      <Tabs defaultValue="network" className="w-full">
        <TabsList aria-label="Network Intelligence sections" className="grid h-auto w-full max-w-full grid-cols-2 gap-1 overflow-visible sm:flex sm:flex-wrap">
          <TabsTrigger value="network" className="flex-1">Network</TabsTrigger>
          <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
        </TabsList>
        <TabsContent keepMounted value="network" className="space-y-5">
          <div className="grid min-w-0 gap-5 xl:grid-cols-2"><SankeyFlow flows={labeledFlows} /><StatusMatrix results={labeledOutcomes} /></div>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            <SiteBubbles results={labeledOutcomes} />
            <section aria-label="Regional coverage" className="rounded-lg border border-hairline bg-bg-raised p-5">
              <div className="flex items-center justify-between gap-3"><div><h2 className="m-0 text-sm font-semibold text-paper">Regional coverage</h2><p className="m-0 mt-0.5 text-xs text-paper-faint">Artikel tercatat per wilayah dalam window aktif.</p></div><BarChart3 className="h-4 w-4 text-brass" aria-hidden="true" /></div>
              <div className="mt-4 space-y-2">{regions.slice().sort((a,b) => b.count - a.count).slice(0, 8).map((row) => <div key={row.key} className="flex items-center gap-3"><span className="min-w-0 flex-1 truncate text-xs text-paper-dim">{row.key}</span><span className="font-mono text-xs tabular-nums text-paper">{row.count.toLocaleString('id-ID')}</span></div>)}{regions.length === 0 ? <p className="m-0 text-xs text-paper-faint">Belum ada data wilayah.</p> : null}</div>
            </section>
          </div>
        </TabsContent>
        <TabsContent keepMounted value="content" className="space-y-5">
          <div className="grid min-w-0 gap-5 xl:grid-cols-2"><TreeMap title="Publisher contribution" rows={publishers} emptyText="Belum ada kontribusi publisher." /><TelemetryCharts data={data} /></div>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2"><KpiSparkline series={publication} /><PublicationTrend series={publication} /></div>
        </TabsContent>
        <TabsContent keepMounted value="activity" className="space-y-5">
          <div className="grid min-w-0 gap-5 xl:grid-cols-2"><MetricComparison series={publication} /><Timeline events={data.aktivitasTerbaru ?? []} /></div>
          <ActivityHeatmap cells={data.aktivitasPerJam ?? []} /><ActivityCalendar series={publication} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Metric({ icon: Icon, label, value, tone }: { readonly icon: typeof Activity; readonly label: string; readonly value: number; readonly tone: string }) {
  return <div className="rounded-lg border border-hairline bg-bg p-3"><div className="flex items-center gap-2 text-paper-faint"><Icon className="h-3.5 w-3.5" aria-hidden="true" /><span className="font-mono text-[10px] uppercase tracking-wider">{label}</span></div><strong className={`mt-2 block font-mono text-lg tabular-nums ${tone}`}>{value.toLocaleString('id-ID')}</strong></div>;
}
