'use client';

import {
  Activity,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  FileText,
  Globe2,
  LayoutGrid,
  RefreshCw,
  Send,
  Server,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { AnalyticsProjection, DashboardProjection, TaskDay } from '@/modules/dashboard/models';
import type { ReactNode } from 'react';
import { KpiSparkline } from '@/modules/dashboard/components/analytics/kpi-spark';
import { PublicationTrend } from '@/modules/dashboard/components/analytics/trend';
import { SiteStack, SiteViewsBar } from '@/modules/dashboard/components/analytics/primary-bento';
import { SuccessRate } from '@/modules/dashboard/components/analytics/summary-charts';
import { Timeline } from '@/modules/dashboard/components/analytics/timeline';
import { TopRanked } from '@/modules/dashboard/components/analytics/summary-insights';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { EmptyState } from '@/modules/dashboard/components/empty-state';

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function Card({
  children,
  className = '',
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`min-w-0 rounded-xl border border-hairline bg-bg-raised p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  detail,
  tone = 'default',
}: {
  readonly label: string;
  readonly value: number;
  readonly icon: typeof Globe2;
  readonly detail: string;
  readonly tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-signal'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'danger'
          ? 'text-error'
          : 'text-brass';

  return (
    <Card className="group transition-colors duration-150 hover:border-hairline-strong">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-bg-raised-2 ${toneClass}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-faint">Live</span>
      </div>
      <p className="m-0 mt-4 font-sans text-xs font-medium text-paper-dim">{label}</p>
      <p className="m-0 mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight text-paper">
        {value.toLocaleString('id-ID')}
      </p>
      <p className="m-0 mt-1 font-sans text-[11px] text-paper-faint">{detail}</p>
    </Card>
  );
}

function EmptyTelemetry() {
  return (
    <Card label="Analitik sedang dimuat">
      <div className="flex min-h-40 items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-brass" aria-hidden="true" />
          <p className="m-0 mt-3 font-sans text-sm font-medium text-paper">Menyiapkan telemetry</p>
          <p className="m-0 mt-1 max-w-sm font-sans text-xs leading-relaxed text-paper-faint">
            Metrik inti sudah tersedia. Grafik operasional akan muncul setelah proyeksi analytics selesai dimuat.
          </p>
        </div>
      </div>
    </Card>
  );
}

function AttentionPanel({
  queued,
  processing,
  retrying,
  failed,
  onSelectView,
}: {
  readonly queued: number;
  readonly processing: number;
  readonly retrying: number;
  readonly failed: number;
  readonly onSelectView?: ((view: View) => void) | undefined;
}) {
  const attention = failed + retrying;
  const activeQueue = queued + processing;

  return (
    <Card label="Perhatian operasional" className="lg:col-span-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">Perlu perhatian</p>
          <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Status pipeline saat ini</p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${attention > 0 ? 'bg-error/10 text-error' : 'bg-signal/10 text-signal'}`}
        >
          {attention > 0 ? (
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CircleCheck className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs text-paper-dim">Gagal</span>
          <span className="font-mono text-sm font-bold tabular-nums text-error">{failed.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs text-paper-dim">Retry</span>
          <span className="font-mono text-sm font-bold tabular-nums text-warning">{retrying.toLocaleString('id-ID')}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs text-paper-dim">Sedang berjalan</span>
          <span className="font-mono text-sm font-bold tabular-nums text-paper">{activeQueue.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div className="mt-5 border-t border-hairline pt-4">
        <p className="m-0 font-sans text-xs leading-relaxed text-paper-faint">
          {attention > 0
            ? `${attention.toLocaleString('id-ID')} target membutuhkan pemeriksaan atau retry.`
            : 'Tidak ada kegagalan atau retry yang perlu ditangani saat ini.'}
        </p>
        {onSelectView ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectView('publishing')}
            className="mt-3 px-0 font-medium text-brass hover:bg-transparent hover:text-brass-soft"
          >
            Buka publishing
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function QuickActions({ onSelectView }: { readonly onSelectView?: (view: View) => void }) {
  const actions: readonly { view: View; label: string; description: string; icon: typeof FileText }[] = [
    { view: 'editorial', label: 'Tulis berita', description: 'Buat artikel baru', icon: FileText },
    { view: 'publishing', label: 'Publishing', description: 'Pantau pengiriman', icon: Send },
    { view: 'analytics', label: 'Analytics', description: 'Buka telemetry lengkap', icon: Activity },
    { view: 'configuration', label: 'Network', description: 'Domain & situs', icon: Globe2 },
  ];

  return (
    <Card label="Aksi cepat" className="col-span-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">Aksi cepat</p>
          <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Langsung menuju ruang kerja yang relevan.</p>
        </div>
        <Sparkles className="h-4 w-4 text-brass" aria-hidden="true" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(({ view, label, description, icon: Icon }) => (
          <Button
            key={view}
            type="button"
            variant="ghost"
            disabled={onSelectView === undefined}
            onClick={() => onSelectView?.(view)}
            className="group h-auto min-w-0 justify-start rounded-lg border border-hairline bg-bg-raised-2 p-4 text-left transition-colors hover:border-hairline-strong hover:bg-bg-raised-3"
          >
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-bg-raised text-brass">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-sans text-[13px] font-medium text-paper">{label}</span>
              <span className="mt-0.5 block truncate font-sans text-xs text-paper-faint">{description}</span>
            </span>
            <ArrowRight className="h-4 w-4 flex-none text-paper-faint transition-transform group-hover:translate-x-0.5 group-hover:text-paper" aria-hidden="true" />
          </Button>
        ))}
      </div>
    </Card>
  );
}

export function DashboardV2Overview({
  dashboard,
  analytics,
  onSelectView,
}: {
  readonly dashboard: Pick<DashboardProjection, 'activeDomains' | 'activeSubdomains' | 'activeSites' | 'activeArticles' | 'archivedArticles' | 'jobsByState' | 'successfulSiteOutcomes' | 'failedSiteOutcomes' | 'activeMedia'>;
  readonly analytics: AnalyticsProjection | null;
  readonly onSelectView?: (view: View) => void;
}) {
  const jobs = dashboard.jobsByState;
  const published = number(jobs.published);
  const failed = number(jobs.failed);
  const retrying = number(jobs.retrying);
  const queued = number(jobs.queued);
  const processing = number(jobs.processing);
  const views = number(analytics?.totalViews);
  const deliveryTotal = dashboard.successfulSiteOutcomes + dashboard.failedSiteOutcomes;
  const deliveryRate = deliveryTotal > 0 ? Math.round((dashboard.successfulSiteOutcomes / deliveryTotal) * 100) : 0;
  const series: readonly TaskDay[] = analytics?.penyaluranHarian ?? analytics?.tugasHarian ?? [];
  const siteName = (id: string): string => analytics?.siteLabels?.[id] ?? id.slice(0, 8);
  const regionRows = analytics?.articlesByRegion ?? [];
  const siteRows = analytics?.articlesBySite ?? [];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="col-span-full">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-signal" aria-hidden="true" />
              <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-paper-faint">
                Command center
              </p>
            </div>
            <h2 className="m-0 mt-2 font-sans text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
              Network overview
            </h2>
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
              Kondisi operasional INDICATE dalam satu pandangan: jaringan, publishing, delivery, dan pembaca.
            </p>
          </div>
          <div className="rounded-full border border-hairline bg-bg-raised px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-faint">
            {analytics?.jendela ? `${analytics.jendela.awal} — ${analytics.jendela.akhir}` : 'Core metrics live'}
          </div>
        </div>
      </div>

      <MetricCard label="Situs aktif" value={dashboard.activeSites} icon={LayoutGrid} detail={`${dashboard.activeSubdomains.toLocaleString('id-ID')} subdomain aktif`} />
      <MetricCard label="Artikel aktif" value={dashboard.activeArticles} icon={FileText} detail={`${dashboard.archivedArticles.toLocaleString('id-ID')} artikel diarsipkan`} />
      <MetricCard label="Delivery success" value={dashboard.successfulSiteOutcomes} icon={Server} detail={`${deliveryRate}% dari outcome tercatat`} tone={deliveryRate >= 95 ? 'success' : deliveryRate > 0 ? 'warning' : 'default'} />
      <MetricCard label="Total tayangan" value={views} icon={Eye} detail={analytics ? 'Telemetry tersedia' : 'Menunggu analytics'} />

      {analytics ? (
        <>
          <div className="col-span-full lg:col-span-8">
            <Card label="Publication trend">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">Publication pulse</p>
                  <p className="m-0 mt-1 font-sans text-xs text-paper-faint">Volume delivery harian dalam rentang analytics.</p>
                </div>
                <Activity className="h-4 w-4 text-brass" aria-hidden="true" />
              </div>
              <div className="mt-4">
                <PublicationTrend series={series} />
              </div>
            </Card>
          </div>
          <AttentionPanel
            queued={queued}
            processing={processing}
            retrying={retrying}
            failed={failed}
            onSelectView={onSelectView}
          />

          <div className="col-span-full">
            <KpiSparkline series={series} />
          </div>

          <div className="col-span-full lg:col-span-4">
            <SuccessRate succeeded={dashboard.successfulSiteOutcomes} failed={dashboard.failedSiteOutcomes} />
          </div>
          <div className="col-span-full lg:col-span-8">
            <SiteStack results={analytics.outcomesBySiteAndState} label={siteName} />
          </div>

          <div className="col-span-full lg:col-span-7">
            <SiteViewsBar rows={analytics.viewsBySite ?? []} label={siteName} />
          </div>
          <div className="col-span-full lg:col-span-5">
            <Timeline events={analytics.aktivitasTerbaru ?? []} />
          </div>

          <Card label="Top network dimensions" className="col-span-full">
            <div className="grid gap-4 lg:grid-cols-3">
              <TopRanked title="Wilayah teratas" rows={regionRows.map((row) => ({ ...row, key: analytics.regionLabels?.[row.key] ?? row.key }))} />
              <TopRanked title="Situs teratas" rows={siteRows.map((row) => ({ ...row, key: analytics.siteLabels?.[row.key] ?? row.key }))} />
              <TopRanked title="Penerbit teratas" rows={(analytics.articlesByPublisher ?? []).map((row) => ({ ...row, key: analytics.publisherLabels?.[row.key] ?? row.key }))} />
            </div>
          </Card>
        </>
      ) : (
        <div className="col-span-full">
          <EmptyTelemetry />
        </div>
      )}

      <QuickActions onSelectView={onSelectView} />

      <Card label="Pipeline snapshot" className="col-span-full">
        <div className="grid gap-4 sm:grid-cols-5">
          {[
            ['Queued', queued],
            ['Processing', processing],
            ['Published', published],
            ['Retrying', retrying],
            ['Failed', failed],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-hairline bg-bg-raised-2 p-4">
              <p className="m-0 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-faint">{label}</p>
              <p className="m-0 mt-2 font-mono text-xl font-bold tabular-nums text-paper">
                {Number(value).toLocaleString('id-ID')}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
