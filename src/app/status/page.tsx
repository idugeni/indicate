import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import {
  LuActivity,
  LuCircleCheck,
  LuCircleHelp,
  LuCpu,
  LuDatabase,
  LuExternalLink,
  LuHardDrive,
  LuHistory,
  LuLayers,
  LuOctagonAlert,
  LuRadio,
  LuRefreshCw,
  LuSend,
  LuServer,
  LuShieldCheck,
  LuTerminal,
  LuTriangleAlert,
  LuWebhook,
  LuZap,
} from 'react-icons/lu';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleStatusRepository } from '@/data/repos/status';
import {
  COMPONENT_LABELS,
  STATUS_COMPONENTS,
  overallHealth,
  type ComponentHealth,
  type StatusComponent,
} from '@/modules/status/status-probe';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { AppTooltip } from '@/ui/app-tooltip';
import { CountUp } from '@/app/status/count-up';
import { LatencySparkline } from '@/app/status/latency-sparkline';
import { StatusLiveIndicator } from '@/app/status/live-indicator';
import { getControlHosts } from '@/core/config/edge-hosts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DESCRIPTION =
  'Konsol telemetri langsung seluruh simpul layanan Indicate: database, cache, penyimpanan, autentikasi, AI, penerbitan, dan API publik.';

export function generateMetadata(): Metadata {
  const canonical = `https://${getControlHosts().status}/`;
  const base = siteMetadata('Status Sistem & Telemetri', DESCRIPTION, '/status');
  return {
    ...base,
    alternates: { canonical, languages: { 'id-ID': canonical } },
    openGraph: { ...base.openGraph, url: canonical },
  };
}

const HEALTH_CONFIG: Readonly<
  Record<
    ComponentHealth | 'unknown',
    {
      readonly label: string;
      readonly icon: IconType;
      readonly dotClass: string;
      readonly pingClass: string;
      readonly badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
      readonly badgeCustomClass: string;
      readonly borderClass: string;
      readonly textClass: string;
    }
  >
> = {
  ok: {
    label: 'OPERATIONAL',
    icon: LuCircleCheck,
    dotClass: 'bg-signal',
    pingClass: 'bg-signal/60',
    badgeVariant: 'outline',
    badgeCustomClass: 'border-signal/40 bg-signal/10 text-signal',
    borderClass: 'border-signal/30',
    textClass: 'text-signal',
  },
  degraded: {
    label: 'DEGRADED',
    icon: LuTriangleAlert,
    dotClass: 'bg-brass',
    pingClass: 'bg-brass/60',
    badgeVariant: 'outline',
    badgeCustomClass: 'border-brass/40 bg-brass/10 text-brass',
    borderClass: 'border-brass/30',
    textClass: 'text-brass',
  },
  down: {
    label: 'OUTAGE',
    icon: LuOctagonAlert,
    dotClass: 'bg-error',
    pingClass: 'bg-error/60',
    badgeVariant: 'destructive',
    badgeCustomClass: 'border-error/40 bg-error/15 text-error',
    borderClass: 'border-error/40',
    textClass: 'text-error',
  },
  unknown: {
    label: 'UNTRACKED',
    icon: LuCircleHelp,
    dotClass: 'bg-paper-faint',
    pingClass: 'bg-paper-faint/30',
    badgeVariant: 'outline',
    badgeCustomClass: 'border-hairline bg-paper-faint/10 text-paper-faint',
    borderClass: 'border-hairline',
    textClass: 'text-paper-faint',
  },
};

const OVERALL_SYSTEM_COPY: Readonly<
  Record<ComponentHealth | 'unknown', { readonly headline: string; readonly description: string }>
> = {
  ok: {
    headline: 'Komponen Terpantau Beroperasi Normal',
    description: 'Semua komponen dengan pemeriksaan terbaru yang valid merespons normal. Komponen tanpa bukti pemeriksaan terbaru ditandai terpisah.',
  },
  degraded: {
    headline: 'Sebagian Layanan Mengalami Penurunan Performa',
    description: 'Satu atau lebih komponen merespons di luar ambang latensi yang ditetapkan. Lihat matriks layanan untuk detail yang terukur.',
  },
  down: {
    headline: 'Gangguan Layanan Terdeteksi',
    description: 'Satu atau lebih komponen gagal dalam pemeriksaan terakhir. Lihat detail komponen dan insiden yang tercatat.',
  },
  unknown: {
    headline: 'Status Layanan Belum Dapat Dipastikan',
    description: 'Belum ada hasil pemeriksaan yang cukup untuk menyatakan layanan normal atau terganggu. Data akan ditampilkan setelah pemeriksaan tersedia.',
  },
};

function getComponentIcon(component: StatusComponent): IconType {
  const normalized = component.toLowerCase();
  if (normalized.includes('database') || normalized.includes('db')) return LuDatabase;
  if (normalized.includes('cache') || normalized.includes('redis')) return LuLayers;
  if (normalized.includes('storage') || normalized.includes('bucket')) return LuHardDrive;
  if (normalized.includes('auth') || normalized.includes('session')) return LuShieldCheck;
  if (normalized.includes('ai') || normalized.includes('model')) return LuCpu;
  if (normalized.includes('publish') || normalized.includes('feed')) return LuSend;
  if (normalized.includes('api') || normalized.includes('edge')) return LuWebhook;
  return LuServer;
}

function barTone(uptimePct: number | null): string {
  if (uptimePct === null) return 'bg-paper-faint/20';
  if (uptimePct >= 99.9) return 'bg-signal';
  if (uptimePct >= 99.0) return 'bg-signal/60';
  if (uptimePct >= 95.0) return 'bg-brass';
  return 'bg-error';
}

function rollupDays(
  days: readonly { readonly day: string; readonly uptimePct: number | null }[],
  size: number
): readonly { readonly day: string; readonly endDay: string; readonly uptimePct: number | null }[] {
  const rolled: { day: string; endDay: string; uptimePct: number | null }[] = [];
  for (let i = 0; i < days.length; i += size) {
    const chunk = days.slice(i, i + size);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    if (first === undefined || last === undefined) continue;
    const known = chunk.filter((cell) => cell.uptimePct !== null);
    rolled.push({
      day: first.day,
      endDay: last.day,
      uptimePct:
        known.length === 0 ? null : Math.min(...known.map((cell) => cell.uptimePct ?? 0)),
    });
  }
  return rolled;
}

function formatMoment(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDayLabel(dayString: string): string {
  const time = new Date(dayString).getTime();
  if (Number.isNaN(time)) return dayString;
  return new Date(time).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface ComponentView {
  readonly component: StatusComponent;
  readonly health: ComponentHealth | 'unknown';
  readonly latencyMs: number | null;
  readonly checkedAt: string | null;
  readonly uptime90: number | null;
  readonly days: readonly { readonly day: string; readonly uptimePct: number | null }[];
  readonly latencyTrend: readonly (number | null)[];
}

interface IncidentView {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly startedAt: string;
  readonly resolvedAt: string | null;
  readonly updates: readonly { readonly at: string; readonly text: string }[];
}

interface StatusSnapshot {
  readonly overall: ComponentHealth | 'unknown';
  readonly components: readonly ComponentView[];
  readonly incidents: readonly IncidentView[];
  readonly generatedAt: string;
}

/** Jendela riwayat yang dirender: 90 hari terakhir. */
const STATUS_HISTORY_DAYS = 90;
/** Probe runs every 30 minutes; older observations are not presented as current. */
const STATUS_STALE_AFTER_MS = 60 * 60 * 1000;

async function loadSnapshot(): Promise<StatusSnapshot> {
  const context = await getServerRuntimeContext();
  const repository = new DrizzleStatusRepository(getSharedRuntimeDatabase(context.bootstrap).db);

  const [latest, incidents, daily] = await Promise.all([
    repository.lastTwoPerComponent(),
    repository.recentIncidents(20),
    repository.dailySince(new Date(Date.now() - STATUS_HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10)),
  ]);

  const newest = new Map<
    string,
    { readonly health: string; readonly latencyMs: number | null; readonly checkedAt: string }
  >();

  for (const row of latest) {
    const at = row.checkedAt instanceof Date ? row.checkedAt.toISOString() : String(row.checkedAt);
    const current = newest.get(row.component);
    if (current === undefined || current.checkedAt < at) {
      newest.set(row.component, {
        health: row.health,
        latencyMs: row.latencyMs,
        checkedAt: at,
      });
    }
  }

  const days: string[] = [];
  const base = new Date();
  const baseDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));

  for (let back = STATUS_HISTORY_DAYS - 1; back >= 0; back -= 1) {
    days.push(new Date(baseDay.getTime() - back * 86_400_000).toISOString().slice(0, 10));
  }

  const components = STATUS_COMPONENTS.map((component) => {
    const current = newest.get(component);
    const checkedAt = current?.checkedAt ?? null;
    const checkedAtMs = checkedAt === null ? Number.NaN : Date.parse(checkedAt);
    const isFresh = Number.isFinite(checkedAtMs) && Date.now() - checkedAtMs <= STATUS_STALE_AFTER_MS;
    const health = isFresh ? (current?.health ?? 'unknown') as ComponentHealth | 'unknown' : 'unknown';
    const byDay = new Map(
      daily.filter((row) => row.component === component && component !== 'api' && row.checks > 0).map((row) => [row.day, row.uptimePct] as const)
    );
    const latencyByDay = new Map(
      daily.filter((row) => row.component === component && component !== 'api' && row.checks > 0).map((row) => [row.day, row.avgLatencyMs] as const)
    );
    const cells = days.map((day) => ({ day, uptimePct: byDay.get(day) ?? null }));
    const known = cells.filter((cell) => cell.uptimePct !== null);

    return {
      component,
      health,
      latencyMs: isFresh ? current?.latencyMs ?? null : null,
      checkedAt,
      uptime90:
        known.length === 0
          ? null
          : known.reduce((sum, cell) => sum + (cell.uptimePct ?? 0), 0) / known.length,
      days: cells,
      latencyTrend: days.map((day) => latencyByDay.get(day) ?? null),
    };
  });

  const knownHealth = components.filter((item) => item.health !== 'unknown');

  return {
    overall: overallHealth(
      knownHealth.map((item) => ({
        component: item.component,
        health: item.health as ComponentHealth,
        latencyMs: item.latencyMs,
        detail: null,
        checkedAt: item.checkedAt ?? new Date(0).toISOString(),
      }))
    ),
    components,
    incidents: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      startedAt:
        incident.startedAt instanceof Date
          ? incident.startedAt.toISOString()
          : String(incident.startedAt),
      resolvedAt:
        incident.resolvedAt === null
          ? null
          : incident.resolvedAt instanceof Date
            ? incident.resolvedAt.toISOString()
            : String(incident.resolvedAt),
      updates: incident.updates,
    })),
    generatedAt: new Date().toISOString(),
  };
}

const loadCachedSnapshot = unstable_cache(loadSnapshot, ['status-snapshot'], {
  revalidate: 60,
  tags: ['status'],
});

function ObservabilityHeader({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  const overallConfig = HEALTH_CONFIG[snapshot.overall];
  const overallCopy = OVERALL_SYSTEM_COPY[snapshot.overall];
  const OverallIcon = overallConfig.icon;

  const validLatencies = snapshot.components
    .map((c) => c.latencyMs)
    .filter((l): l is number => l !== null);
  const avgLatency =
    validLatencies.length > 0
      ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
      : null;

  const validUptimes = snapshot.components
    .map((c) => c.uptime90)
    .filter((u): u is number => u !== null);
  const aggregateUptime =
    validUptimes.length > 0
      ? validUptimes.reduce((a, b) => a + b, 0) / validUptimes.length
      : null;

  const activeProbes = snapshot.components.filter((c) => c.health === 'ok').length;

  return (
    <div className="w-full border-b border-hairline bg-bg-raised/60 backdrop-blur-md">
      <div className="w-full px-4 sm:px-8 lg:px-12 py-3 border-b border-hairline">
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-paper-faint">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold tracking-widest text-paper uppercase">
              <LuActivity className="size-3.5 text-signal" />
              INDICATE STATUS
            </span>
            <Separator orientation="vertical" className="h-3 bg-hairline" />
            <span className="tracking-wider">KETERSEDIAAN LAYANAN</span>
          </div>

          <StatusLiveIndicator generatedAt={snapshot.generatedAt} />
        </div>
      </div>

      <div className="w-full px-4 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant={overallConfig.badgeVariant}
                className={`font-mono text-xs tracking-wider uppercase px-3 py-1 flex items-center gap-1.5 ${overallConfig.badgeCustomClass}`}
              >
                <OverallIcon className="size-3.5" />
                {overallConfig.label}
              </Badge>
              <Badge variant="outline" className="border-hairline text-paper-dim font-mono text-xs">
                KOMPONEN TERDAFTAR: {snapshot.components.length}
              </Badge>
            </div>

            <div>
              <h1 className="m-0 font-sans text-2xl sm:text-4xl font-bold tracking-tight text-paper">
                {overallCopy.headline}
              </h1>
              <p className="m-0 mt-2 max-w-2xl font-sans text-sm sm:text-base text-paper-dim leading-relaxed">
                {overallCopy.description}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="border-hairline bg-bg shadow-none rounded-lg">
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-paper-faint flex items-center gap-1.5">
                  <LuShieldCheck className="size-3 text-signal" /> Availability 90 Hari
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-paper">
                  {aggregateUptime !== null ? <CountUp value={aggregateUptime} decimals={2} suffix="%" /> : '---'}
                </div>
                <div className="font-mono text-[10px] text-paper-faint mt-0.5">Komponen dengan data</div>
              </CardContent>
            </Card>

            <Card className="border-hairline bg-bg shadow-none rounded-lg">
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-paper-faint flex items-center gap-1.5">
                  <LuZap className="size-3 text-brass" /> Latensi Rerata
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-paper">
                  {avgLatency !== null ? <CountUp value={avgLatency} suffix=" ms" /> : '---'}
                </div>
                <div className="font-mono text-[10px] text-paper-faint mt-0.5">Round-Trip Time</div>
              </CardContent>
            </Card>

            <Card className="col-span-2 sm:col-span-1 border-hairline bg-bg shadow-none rounded-lg">
              <CardHeader className="p-3.5 pb-1">
                <CardDescription className="font-mono text-[10px] uppercase tracking-wider text-paper-faint flex items-center gap-1.5">
                  <LuRadio className="size-3 text-paper-dim" /> Komponen Normal
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <div className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-paper">
                  <CountUp value={activeProbes} />/{snapshot.components.length}
                </div>
                <div className="font-mono text-[10px] text-paper-faint mt-0.5">Status pemeriksaan terbaru</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarsStrip({
  componentLabel,
  days,
}: {
  readonly componentLabel: string;
  readonly days: readonly {
    readonly day: string;
    readonly endDay: string;
    readonly uptimePct: number | null;
  }[];
}) {
  return (
    <div
      className="grid h-8 items-end gap-[2px] overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      aria-label={`Uptime 90 hari untuk ${componentLabel}`}
    >
      {days.map((cell, dayIndex) => {
        const uptimeText =
          cell.uptimePct !== null ? `${cell.uptimePct.toFixed(1)}%` : 'Tanpa data';
        const range =
          cell.endDay === cell.day
            ? formatDayLabel(cell.day)
            : `${formatDayLabel(cell.day)} – ${formatDayLabel(cell.endDay)}`;
        return (
          <AppTooltip key={cell.day} label={`${range}: ${uptimeText}`}>
            <span
              style={{ animationDelay: `${Math.min(dayIndex, STATUS_HISTORY_DAYS - 1) * 8}ms` }}
              className={`status-bar-rise h-full min-w-0 rounded-sm transition-all hover:brightness-125 ${barTone(cell.uptimePct)}`}
            />
          </AppTooltip>
        );
      })}
    </div>
  );
}

function ComponentTelemetryGrid({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  return (
    <section aria-labelledby="matrix-heading" className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2">
          <LuServer className="size-4 text-paper-dim" />
          <h2
            id="matrix-heading"
            className="m-0 font-mono text-xs uppercase tracking-[0.2em] font-semibold text-paper"
          >
            Status Layanan
          </h2>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-paper-faint">
          <LuActivity className="size-3.5 text-signal" />
          <span>Riwayat 90 Hari</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 grid-flow-dense">
        {snapshot.components.map((item, index) => {
          const config = HEALTH_CONFIG[item.health];
          const CompIcon = getComponentIcon(item.component);
          const NodeIcon = config.icon;
          const nodeIndex = String(index + 1).padStart(2, '0');
          const featured =
            index === 0 ||
            index === snapshot.components.length - 1 ||
            (item.health !== 'ok' && item.health !== 'unknown');

          return (
            <Card
              key={item.component}
              className={`border ${config.borderClass} bg-bg-raised shadow-none transition-all duration-200 hover:border-paper-faint/60 flex flex-col justify-between ${featured ? 'md:col-span-2' : ''}`}
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-hairline bg-bg text-paper">
                      <CompIcon className="size-4" />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                        NODE-{nodeIndex} · {item.component}
                      </div>
                      <CardTitle className="text-base font-semibold text-paper mt-0.5">
                        {COMPONENT_LABELS[item.component]}
                      </CardTitle>
                    </div>
                  </div>

                  <Badge
                    variant={config.badgeVariant}
                    className={`font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 flex items-center gap-1 shrink-0 ${config.badgeCustomClass}`}
                  >
                    <NodeIcon className="size-3" />
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent
                className={
                  featured
                    ? 'p-5 pt-0 flex-1 grid gap-5 md:grid-cols-[170px_1fr] md:items-center'
                    : 'p-5 pt-0 space-y-4'
                }
              >
                <div
                  className={
                    featured
                      ? 'grid grid-cols-2 md:grid-cols-1 gap-3 font-mono text-xs'
                      : 'grid grid-cols-2 gap-2 border-y border-hairline py-2.5 font-mono text-xs'
                  }
                >
                  <div>
                    <span className="block text-[10px] uppercase text-paper-faint">Latensi Node</span>
                    <span className="font-medium tabular-nums text-paper">
                      {item.latencyMs !== null ? <CountUp value={item.latencyMs} suffix=" ms" /> : 'N/A'}
                    </span>
                    <LatencySparkline
                      points={item.latencyTrend}
                      strokeClass={config.textClass}
                      label={`Tren latensi 30 hari ${COMPONENT_LABELS[item.component]}`}
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-paper-faint">Uptime 90H</span>
                    <span className="font-medium tabular-nums text-paper">
                      {item.uptime90 !== null ? <CountUp value={item.uptime90} decimals={2} suffix="%" /> : 'Data Baru'}
                    </span>
                  </div>
                </div>

                <div>
                  <BarsStrip
                    componentLabel={COMPONENT_LABELS[item.component]}
                    days={featured ? item.days.map((cell) => ({ ...cell, endDay: cell.day })) : rollupDays(item.days, 3)}
                  />
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                    <span>-90 HARI</span>
                    <span>SLI AKTIVITAS</span>
                    <span>SEKARANG</span>
                  </div>
                  <p className="mt-2 mb-0 font-sans text-xs text-paper-faint">
                    Pemeriksaan terakhir: {item.checkedAt !== null ? formatMoment(item.checkedAt) : 'Belum tersedia'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 border-hairline bg-bg shadow-none rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-paper-faint">
          <span className="flex items-center gap-1.5 text-paper-dim">
            <LuActivity className="size-3.5 text-signal" /> Skala Ketersediaan:
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-signal" /> &ge; 99.9%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-signal/60" /> &ge; 99.0%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-brass" /> &ge; 95.0%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-error" /> &lt; 95.0%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-paper-faint/20" /> Tidak Tersedia
            </span>
          </div>
        </div>
      </Card>
    </section>
  );
}

function IncidentSection({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  const open = snapshot.incidents.filter((incident) => incident.status === 'open');
  const resolved = snapshot.incidents.filter((incident) => incident.status !== 'open');

  return (
    <section aria-labelledby="incidents-heading" className="w-full">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <LuTerminal className="size-4 text-paper-dim" />
          <h2
            id="incidents-heading"
            className="m-0 font-mono text-xs uppercase tracking-[0.2em] font-semibold text-paper"
          >
            Log Insiden & Pemeliharaan
          </h2>
        </div>
        <span className="font-mono text-[11px] text-paper-faint">ARSIP 90 HARI</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 flex flex-col space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-wider text-paper-faint flex items-center gap-1.5">
            <LuTriangleAlert className="size-3.5 text-error" />
            <span>Insiden Terbuka</span>
          </div>

          {open.length > 0 ? (
            open.map((incident) => (
              <Alert
                key={incident.id}
                variant="destructive"
                className="border-error/40 bg-error/[0.05] p-5 shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <AlertTitle className="text-base font-semibold text-paper">
                      {incident.title}
                    </AlertTitle>
                    <AlertDescription className="font-mono text-xs text-paper-faint mt-1">
                      Dimulai: {formatMoment(incident.startedAt)}
                    </AlertDescription>
                  </div>
                  <Badge variant="destructive" className="font-mono text-[10px] tracking-wider uppercase">
                    OPEN
                  </Badge>
                </div>
                <div className="mt-4 border-t border-error/20 pt-3">
                  <IncidentUpdates updates={incident.updates} />
                </div>
              </Alert>
            ))
          ) : (
            <Card className="border-hairline bg-bg-raised shadow-none flex-1 flex flex-col justify-center">
              <CardHeader className="p-6 pb-2 flex flex-col items-center text-center">
                <div className="mx-auto flex size-9 items-center justify-center rounded-full border border-signal/30 bg-signal/10 text-signal mb-3">
                  <LuCircleCheck className="size-5" />
                </div>
                <CardTitle className="font-sans text-sm font-medium text-paper">Tidak Ada Insiden Terbuka</CardTitle>
                <CardDescription className="font-sans text-xs text-paper-dim">
                  Tidak ada insiden terbuka yang tercatat pada snapshot ini. Status komponen tetap perlu diperiksa secara terpisah.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-wider text-paper-faint flex items-center gap-1.5">
            <LuHistory className="size-3.5 text-paper-dim" />
            <span>Riwayat Pemulihan Selesai</span>
          </div>

          {resolved.length > 0 ? (
            <div className="space-y-3">
              {resolved.map((incident) => (
                <Card
                  key={incident.id}
                  className="border-hairline bg-bg-raised shadow-none transition-colors hover:border-paper-faint/50"
                >
                  <CardHeader className="p-5 pb-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-paper">
                        {incident.title}
                      </CardTitle>
                      <Badge variant="outline" className="border-hairline font-mono text-[10px] text-paper-dim">
                        RESOLVED
                      </Badge>
                    </div>
                    <CardDescription className="font-mono text-xs tabular-nums text-paper-faint mt-1">
                      {formatMoment(incident.startedAt)}
                      {incident.resolvedAt !== null ? ` → ${formatMoment(incident.resolvedAt)}` : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 pt-1">
                    <IncidentUpdates updates={incident.updates} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-hairline bg-bg-raised shadow-none flex-1 flex flex-col justify-center">
              <CardContent className="p-6 text-center">
                <CardDescription className="font-mono text-xs text-paper-faint">
                  Tidak ada catatan gangguan lampau dalam jendela 90 hari terakhir.
                </CardDescription>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}

function IncidentUpdates({
  updates,
}: {
  readonly updates: readonly { readonly at: string; readonly text: string }[];
}) {
  if (updates.length === 0) return null;

  return (
    <div className="space-y-2.5 pt-1">
      {updates.map((update, index) => (
        <div key={`${update.at}-${index}`} className="flex items-start gap-2.5 text-xs leading-relaxed text-paper-dim">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-paper-faint" />
          <div>
            <span className="font-mono text-[11px] tabular-nums text-paper-faint mr-1.5">
              [{formatMoment(update.at)}]
            </span>
            <span>{update.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function StatusPage() {
  const snapshot = await loadCachedSnapshot();

  return (
    <div className="status-scroll min-h-screen w-full bg-bg font-sans text-paper antialiased">
      <ObservabilityHeader snapshot={snapshot} />

      <main className="w-full px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-12">
        <ComponentTelemetryGrid snapshot={snapshot} />
        <IncidentSection snapshot={snapshot} />
      </main>

      <footer className="w-full border-t border-hairline bg-bg px-4 sm:px-8 lg:px-12 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-mono text-xs text-paper-faint">
          <div className="flex items-center gap-4">
            <Link
              className="inline-flex items-center gap-1.5 transition-colors hover:text-paper"
              href="/"
            >
              <span>INDICATE.WEBSITE</span>
              <LuExternalLink className="size-3" />
            </Link>
            <Separator orientation="vertical" className="h-3 bg-hairline" />
            <Link
              className="inline-flex items-center gap-1.5 transition-colors hover:text-paper"
              href="/api/status"
            >
              <LuTerminal className="size-3" />
              <span>RAW JSON</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 tabular-nums">
            <LuRefreshCw className="size-3 text-signal" />
            <span>SINKRONISASI TELEMETRI: {formatMoment(snapshot.generatedAt)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}