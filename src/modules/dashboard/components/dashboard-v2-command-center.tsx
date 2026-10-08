'use client';

import {
  Activity,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  Layers3,
  RefreshCw,
  Send,
  Server,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import type { AnalyticsProjection, DashboardProjection, TaskDay } from '@/modules/dashboard/models';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { PublicationTrend } from '@/modules/dashboard/components/analytics/trend';
import { SiteStack } from '@/modules/dashboard/components/analytics/primary-bento';
import { Timeline } from '@/modules/dashboard/components/analytics/timeline';
import { TopRanked } from '@/modules/dashboard/components/analytics/summary-insights';
import { SiteViewsBar } from '@/modules/dashboard/components/analytics/primary-bento';

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number): string {
  return value.toLocaleString('id-ID');
}

function Surface({
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
      className={`min-w-0 rounded-2xl border border-white/[0.07] bg-[#0b1020]/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.16)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly detail?: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9da7bd]">{eyebrow}</p>
        <h2 className="m-0 mt-1.5 font-sans text-lg font-semibold tracking-tight text-white">{title}</h2>
        {detail ? <p className="m-0 mt-1 max-w-2xl font-sans text-xs leading-relaxed text-[#8e99b0]">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  readonly label: string;
  readonly tone: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const classes = {
    good: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    warn: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    bad: 'border-red-400/20 bg-red-400/10 text-red-300',
    neutral: 'border-white/10 bg-white/[0.04] text-[#b5bfd2]',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly icon: typeof Globe2;
  readonly tone?: 'good' | 'warn' | 'bad' | 'neutral';
}) {
  const iconTone = {
    good: 'text-emerald-300 bg-emerald-400/10',
    warn: 'text-amber-300 bg-amber-400/10',
    bad: 'text-red-300 bg-red-400/10',
    neutral: 'text-[#b9c4ff] bg-[#6470ff]/10',
  }[tone];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconTone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#657089]">Live</span>
      </div>
      <p className="m-0 mt-4 font-sans text-xs text-[#8e99b0]">{label}</p>
      <p className="m-0 mt-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
      <p className="m-0 mt-1 font-sans text-[11px] text-[#66718a]">{detail}</p>
    </div>
  );
}

function AttentionItem({
  label,
  value,
  description,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly description: string;
  readonly tone: 'good' | 'warn' | 'bad';
}) {
  const Icon = tone === 'bad' ? TriangleAlert : tone === 'warn' ? Clock3 : CheckCircle2;
  const color = tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-amber-300' : 'text-emerald-300';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/[0.04] ${color}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="font-sans text-xs font-medium text-[#c9d1df]">{label}</span>
          <span className={`font-mono text-sm font-semibold tabular-nums ${color}`}>{formatNumber(value)}</span>
        </div>
        <p className="m-0 mt-0.5 truncate font-sans text-[11px] text-[#68738a]">{description}</p>
      </div>
    </div>
  );
}

export function DashboardV2CommandCenter({
  displayName,
  dashboard,
  analytics,
  onSelectView,
}: {
  readonly displayName: string;
  readonly dashboard: Pick<
    DashboardProjection,
    'activeDomains' | 'activeSubdomains' | 'activeSites' | 'activeArticles' | 'archivedArticles' | 'jobsByState' | 'successfulSiteOutcomes' | 'failedSiteOutcomes'
  >;
  readonly analytics: AnalyticsProjection | null;
  readonly onSelectView: (view: View) => void;
}) {
  const jobs = dashboard.jobsByState;
  const queued = safeNumber(jobs.queued);
  const processing = safeNumber(jobs.processing);
  const published = safeNumber(jobs.published);
  const retrying = safeNumber(jobs.retrying);
  const failed = safeNumber(jobs.failed);
  const deliveryTotal = dashboard.successfulSiteOutcomes + dashboard.failedSiteOutcomes;
  const deliveryRate = deliveryTotal > 0 ? Math.round((dashboard.successfulSiteOutcomes / deliveryTotal) * 1000) / 10 : 0;
  const trend: readonly TaskDay[] = analytics?.penyaluranHarian ?? analytics?.tugasHarian ?? [];
  const views = safeNumber(analytics?.totalViews);
  const activeWork = queued + processing;
  const attention = failed + retrying;
  const siteName = (id: string): string => analytics?.siteLabels?.[id] ?? id.slice(0, 8);
  const topSites = analytics?.articlesBySite ?? [];
  const topPublishers = analytics?.articlesByPublisher ?? [];
  const topRegions = analytics?.articlesByRegion ?? [];
  const latest = analytics?.aktivitasTerbaru ?? [];
  const posture = failed > 0 ? 'Needs attention' : retrying > 0 ? 'Degraded' : 'Operational';
  const postureTone = failed > 0 ? 'bad' : retrying > 0 ? 'warn' : 'good';

  return (
    <div className="min-w-0 space-y-5">
      <header className="relative overflow-visible rounded-3xl border border-white/[0.08] bg-[radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.18),transparent_38%),radial-gradient(circle_at_20%_100%,rgba(45,212,191,0.08),transparent_35%),#080d1a] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusPill label={posture} tone={postureTone} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#68738a]">INDICATE / COMMAND CENTER</span>
            </div>
            <h1 className="m-0 mt-4 max-w-3xl font-sans text-3xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
              Good morning, {displayName}.
            </h1>
            <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-6 text-[#8f9ab0]">
              Satu ruang untuk membaca kesehatan jaringan, memantau distribusi, dan menentukan tindakan berikutnya.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onSelectView('publishing')} className="border-white/10 bg-white/[0.03] text-[#cbd3e2] hover:bg-white/[0.07]">
              <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Publishing
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onSelectView('analytics')} className="border-white/10 bg-white/[0.03] text-[#cbd3e2] hover:bg-white/[0.07]">
              <Activity className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Analytics
            </Button>
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Active sites" value={formatNumber(dashboard.activeSites)} detail={`${formatNumber(dashboard.activeSubdomains)} active subdomains`} icon={Globe2} />
          <Metric label="Active articles" value={formatNumber(dashboard.activeArticles)} detail={`${formatNumber(dashboard.archivedArticles)} archived`} icon={FileText} />
          <Metric label="Delivery success" value={`${deliveryRate.toLocaleString('id-ID')}%`} detail={`${formatNumber(dashboard.successfulSiteOutcomes)} successful outcomes`} icon={CheckCircle2} tone={deliveryRate >= 95 ? 'good' : deliveryRate > 0 ? 'warn' : 'neutral'} />
          <Metric label="Total views" value={formatNumber(views)} detail={analytics ? 'Current telemetry projection' : 'Waiting for telemetry'} icon={Activity} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-12">
        <Surface className="xl:col-span-8" label="Operational pulse">
          <SectionHeading
            eyebrow="01 / Operational pulse"
            title="What needs your attention?"
            detail="Status queue dan delivery dibuat sebagai sinyal tindakan, bukan sekadar angka."
            action={<StatusPill label={attention > 0 ? `${formatNumber(attention)} attention` : 'No active incidents'} tone={attention > 0 ? 'warn' : 'good'} />}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <AttentionItem label="Failed deliveries" value={failed} description="Outcome delivery yang gagal dan perlu diperiksa." tone={failed > 0 ? 'bad' : 'good'} />
            <AttentionItem label="Retry backlog" value={retrying} description="Target yang sedang menunggu percobaan ulang." tone={retrying > 0 ? 'warn' : 'good'} />
            <AttentionItem label="Active workload" value={activeWork} description="Queue dan processing yang sedang berjalan." tone={activeWork > 0 ? 'warn' : 'good'} />
            <AttentionItem label="Published" value={published} description="Artikel yang sudah berada pada status published." tone="good" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
            <Button type="button" size="sm" onClick={() => onSelectView('publishing')} className="bg-white text-[#080d1a] hover:bg-white/90">
              Open publishing queue
            </Button>
            {failed > 0 ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onSelectView('publishing')} className="border-red-400/20 text-red-200 hover:bg-red-400/10">
                Review failures
              </Button>
            ) : null}
          </div>
        </Surface>

        <Surface className="xl:col-span-4" label="Network posture">
          <SectionHeading eyebrow="02 / Network posture" title="System at a glance" />
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-xs text-[#8e99b0]">Domains</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-white">{formatNumber(dashboard.activeDomains)}</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-indigo-400" style={{ width: dashboard.activeDomains > 0 ? '100%' : '0%' }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-xs text-[#8e99b0]">Delivery health</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-white">{deliveryRate.toLocaleString('id-ID')}%</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
                <div className={`h-full rounded-full ${deliveryRate >= 95 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, deliveryRate)}%` }} />
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-sans text-xs text-[#8e99b0]">Network sites</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-white">{formatNumber(dashboard.activeSites)}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#68738a]">
                <Server className="h-3.5 w-3.5" aria-hidden="true" />
                Active tenant surfaces
              </div>
            </div>
          </div>
        </Surface>

        {analytics ? (
          <>
            <Surface className="xl:col-span-8" label="Publication velocity">
              <SectionHeading eyebrow="03 / Distribution" title="Publication velocity" detail="Volume distribusi harian dari projection analytics yang sama dengan sistem produksi." />
              <div className="mt-5">
                <PublicationTrend series={trend} />
              </div>
            </Surface>

            <Surface className="xl:col-span-4" label="Recent activity">
              <SectionHeading eyebrow="04 / Activity" title="Latest activity" />
              <div className="mt-5">
                <Timeline events={latest} />
              </div>
            </Surface>

            <Surface className="xl:col-span-7" label="Delivery by site">
              <SectionHeading eyebrow="05 / Delivery" title="Where distribution stands" detail="Komposisi outcome per situs, sehingga masalah jaringan terlihat sebagai exception." />
              <div className="mt-5">
                <SiteStack results={analytics.outcomesBySiteAndState} label={siteName} />
              </div>
            </Surface>

            <Surface className="xl:col-span-5" label="Site performance">
              <SectionHeading eyebrow="06 / Performance" title="Site performance" />
              <div className="mt-5">
                <SiteViewsBar rows={analytics.viewsBySite ?? []} label={siteName} />
              </div>
            </Surface>

            <Surface className="xl:col-span-12" label="Network intelligence">
              <SectionHeading eyebrow="07 / Network intelligence" title="Who is driving the network?" detail="Ranking berdasarkan projection yang sudah tersedia; tidak ada data sintetis." />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <TopRanked title="Top sites" rows={topSites.map((row) => ({ ...row, key: analytics.siteLabels?.[row.key] ?? row.key }))} />
                <TopRanked title="Top publishers" rows={topPublishers.map((row) => ({ ...row, key: analytics.publisherLabels?.[row.key] ?? row.key }))} />
                <TopRanked title="Top regions" rows={topRegions.map((row) => ({ ...row, key: analytics.regionLabels?.[row.key] ?? row.key }))} />
              </div>
            </Surface>
          </>
        ) : (
          <Surface className="xl:col-span-12" label="Analytics pending">
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <RefreshCw className="h-5 w-5 animate-spin text-indigo-300" aria-hidden="true" />
              <p className="m-0 mt-3 font-sans text-sm font-medium text-white">Loading operational telemetry</p>
              <p className="m-0 mt-1 max-w-md font-sans text-xs leading-relaxed text-[#68738a]">
                Core dashboard metrics sudah tersedia. Analytics akan muncul setelah projection telemetry selesai.
              </p>
            </div>
          </Surface>
        )}
      </div>

      <Surface label="Quick actions">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9da7bd]">08 / Quick actions</p>
            <h2 className="m-0 mt-1.5 font-sans text-lg font-semibold text-white">Move without hunting through menus</h2>
          </div>
          <Sparkles className="h-4 w-4 text-indigo-300" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['Write article', 'editorial', FileText],
            ['Publishing queue', 'publishing', Send],
            ['Analytics', 'analytics', Activity],
            ['Network configuration', 'configuration', Layers3],
          ] as const).map(([label, target, Icon]) => (
            <button
              key={String(target)}
              type="button"
              onClick={() => onSelectView(target as View)}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-left transition-colors hover:border-indigo-400/20 hover:bg-indigo-400/[0.05]"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-400/10 text-indigo-300">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block font-sans text-xs font-semibold text-white">{String(label)}</span>
                <span className="mt-0.5 block font-sans text-[11px] text-[#68738a]">Open workspace</span>
              </span>
            </button>
          ))}
        </div>
      </Surface>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-1 pt-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#59657c]">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Production data only
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#59657c]">
          <span>{formatNumber(dashboard.activeSites)} sites</span>
          <span>{formatNumber(dashboard.activeArticles)} articles</span>
          <span>{formatNumber(views)} views</span>
        </div>
      </div>
    </div>
  );
}
