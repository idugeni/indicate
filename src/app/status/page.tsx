import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';

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

import { getControlHosts } from '@/core/config/edge-hosts';

const DESCRIPTION = 'Kondisi langsung seluruh layanan Indicate: database, cache, penyimpanan, autentikasi, penerbitan, AI, dan API — beserta riwayat insiden.';

export function generateMetadata(): Metadata {
  const canonical = `https://${getControlHosts().status}/`;
  const base = siteMetadata('Status Layanan', DESCRIPTION, '/status');
  return {
    ...base,
    alternates: { canonical, languages: { 'id-ID': canonical } },
    openGraph: { ...base.openGraph, url: canonical },
  };
}

const OVERALL_DOT: Readonly<Record<ComponentHealth, string>> = {
  ok: 'bg-signal',
  degraded: 'bg-brass',
  down: 'bg-error',
};

const OVERALL_COPY: Readonly<Record<ComponentHealth, { readonly title: string; readonly text: string }>> = {
  ok: {
    title: 'Semua sistem operasional',
    text: 'Seluruh komponen menjawab pemeriksaan otomatis terakhir.',
  },
  degraded: {
    title: 'Sebagian sistem menurun',
    text: 'Satu atau lebih komponen melambat. Insiden dibuka otomatis di bawah.',
  },
  down: {
    title: 'Gangguan berlangsung',
    text: 'Satu atau lebih komponen tidak merespons. Insiden dibuka otomatis di bawah.',
  },
};

function barTone(uptimePct: number | null): string {
  if (uptimePct === null) return 'bg-paper-faint/30';
  if (uptimePct >= 99.9) return 'bg-signal';
  if (uptimePct >= 99) return 'bg-signal/60';
  if (uptimePct >= 95) return 'bg-brass';
  return 'bg-error';
}

function healthWord(health: ComponentHealth | 'unknown'): string {
  if (health === 'ok') return 'Operasional';
  if (health === 'degraded') return 'Menurun';
  if (health === 'down') return 'Gangguan';
  return 'Belum ada data';
}

function formatMoment(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface ComponentView {
  readonly component: StatusComponent;
  readonly health: ComponentHealth | 'unknown';
  readonly latencyMs: number | null;
  readonly checkedAt: string | null;
  readonly uptime90: number | null;
  readonly days: readonly { readonly day: string; readonly uptimePct: number | null }[];
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
  readonly overall: ComponentHealth;
  readonly components: readonly ComponentView[];
  readonly incidents: readonly IncidentView[];
  readonly generatedAt: string;
}

async function loadSnapshot(): Promise<StatusSnapshot> {
  const context = await getServerRuntimeContext();
  const repository = new DrizzleStatusRepository(getSharedRuntimeDatabase(context.bootstrap).db);
  const [latest, incidents, daily] = await Promise.all([
    repository.lastTwoPerComponent(),
    repository.recentIncidents(20),
    repository.dailySince(new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)),
  ]);
  const newest = new Map<string, { readonly health: string; readonly latencyMs: number | null; readonly checkedAt: string }>();
  for (const row of latest) {
    const at = row.checkedAt instanceof Date ? row.checkedAt.toISOString() : String(row.checkedAt);
    const current = newest.get(row.component);
    if (current === undefined || current.checkedAt < at) {
      newest.set(row.component, { health: row.health, latencyMs: row.latencyMs, checkedAt: at });
    }
  }
  const days: string[] = [];
  const base = new Date();
  const baseDay = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  for (let back = 89; back >= 0; back -= 1) {
    days.push(new Date(baseDay.getTime() - back * 86_400_000).toISOString().slice(0, 10));
  }
  const components = STATUS_COMPONENTS.map((component) => {
    const current = newest.get(component);
    const health = (current?.health ?? 'unknown') as ComponentHealth | 'unknown';
    const byDay = new Map(daily.filter((row) => row.component === component).map((row) => [row.day, row.uptimePct] as const));
    const cells = days.map((day) => ({ day, uptimePct: byDay.get(day) ?? null }));
    const known = cells.filter((cell) => cell.uptimePct !== null);
    return {
      component,
      health,
      latencyMs: current?.latencyMs ?? null,
      checkedAt: current?.checkedAt ?? null,
      uptime90: known.length === 0 ? null : known.reduce((sum, cell) => sum + (cell.uptimePct ?? 0), 0) / known.length,
      days: cells,
    };
  });
  const knownHealth = components.filter((item) => item.health !== 'unknown');
  return {
    overall: overallHealth(knownHealth.map((item) => ({
      component: item.component,
      health: item.health as ComponentHealth,
      latencyMs: item.latencyMs,
      detail: null,
      checkedAt: item.checkedAt ?? new Date(0).toISOString(),
    }))),
    components,
    incidents: incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      status: incident.status,
      startedAt: incident.startedAt instanceof Date ? incident.startedAt.toISOString() : String(incident.startedAt),
      resolvedAt: incident.resolvedAt === null ? null : incident.resolvedAt instanceof Date ? incident.resolvedAt.toISOString() : String(incident.resolvedAt),
      updates: incident.updates,
    })),
    generatedAt: new Date().toISOString(),
  };
}

const loadCachedSnapshot = unstable_cache(loadSnapshot, ['status-snapshot'], { revalidate: 60, tags: ['status'] });

function StatusBanner({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  const overall = OVERALL_COPY[snapshot.overall];
  return (
    <div className="rounded-xl border border-hairline bg-bg-raised p-5 sm:p-6">
      <p className="m-0 flex items-center gap-2.5 font-sans text-lg font-semibold text-paper sm:text-xl">
        <span aria-hidden="true" className={`inline-block size-3 rounded-full ${OVERALL_DOT[snapshot.overall]}`} />
        {overall.title}
      </p>
      <p className="m-0 mt-1.5 font-sans text-sm text-paper-dim">{overall.text}</p>
      <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">Diperbarui {formatMoment(snapshot.generatedAt)}</p>
    </div>
  );
}

function ComponentList({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  return (
    <ul className="m-0 list-none space-y-2.5 p-0">
      {snapshot.components.map((item) => (
        <li key={item.component} className="rounded-xl border border-hairline bg-bg-raised p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="m-0 font-sans text-sm font-semibold text-paper">{COMPONENT_LABELS[item.component]}</p>
            <p className="m-0 font-mono text-[11px] tabular-nums text-paper-dim">
              {healthWord(item.health)}
              {item.latencyMs === null ? '' : ` · ${item.latencyMs} ms`}
              {item.uptime90 === null ? '' : ` · ${item.uptime90.toFixed(2)}%`}
            </p>
          </div>
          <div className="mt-2.5 flex gap-[3px]" aria-label={`Uptime 90 hari ${COMPONENT_LABELS[item.component]}`}>
            {item.days.map((cell) => (
              <span key={cell.day} aria-hidden="true" className={`h-8 min-w-0 flex-1 rounded-[3px] ${barTone(cell.uptimePct)}`} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function IncidentList({ snapshot }: { readonly snapshot: StatusSnapshot }) {
  const open = snapshot.incidents.filter((incident) => incident.status === 'open');
  const resolved = snapshot.incidents.filter((incident) => incident.status !== 'open');
  return (
    <div>
      {open.length > 0 ? (
        <ul className="m-0 list-none space-y-2.5 p-0">
          {open.map((incident) => (
            <li key={incident.id} className="rounded-xl border border-error/40 bg-error/[0.06] p-4 sm:p-5">
              <p className="m-0 font-sans text-sm font-semibold text-paper">{incident.title}</p>
              <p className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">Sejak {formatMoment(incident.startedAt)}</p>
              <IncidentUpdates updates={incident.updates} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-xl border border-hairline bg-bg-raised p-4 font-sans text-sm text-paper-dim sm:p-5">
          Tidak ada insiden terbuka dalam 90 hari terakhir.
        </p>
      )}
      {resolved.length > 0 ? (
        <ul className="m-0 mt-2.5 list-none space-y-2.5 p-0">
          {resolved.map((incident) => (
            <li key={incident.id} className="rounded-xl border border-hairline bg-bg-raised p-4 sm:p-5">
              <p className="m-0 font-sans text-sm font-semibold text-paper">{incident.title}</p>
              <p className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">
                {formatMoment(incident.startedAt)}{incident.resolvedAt === null ? '' : ` → ${formatMoment(incident.resolvedAt)}`}
              </p>
              <IncidentUpdates updates={incident.updates} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default async function StatusPage() {
  const snapshot = await loadCachedSnapshot();
  return (
    <div className="min-h-screen bg-bg font-sans text-paper">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <p className="m-0 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-faint">
            <span aria-hidden="true" className={`inline-block size-2 rounded-full ${OVERALL_DOT[snapshot.overall]}`} />
            Indicate · Status
          </p>
          <h1 className="m-0 mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Status layanan</h1>
          <p className="m-0 mt-2 max-w-xl text-sm leading-relaxed text-paper-dim">
            Kondisi langsung seluruh layanan beserta riwayat insiden 90 hari. Diperbarui otomatis setiap 15 menit.
          </p>
        </header>
        <main className="space-y-8">
          <section aria-label="Kondisi saat ini">
            <StatusBanner snapshot={snapshot} />
          </section>
          <section aria-label="Komponen">
            <h2 className="m-0 mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-faint">Komponen</h2>
            <ComponentList snapshot={snapshot} />
            <p className="m-0 mt-3 font-mono text-[11px] text-paper-faint">Hijau 99.9%+, hijau pudar 99%+, kuning 95%+, merah di bawahnya, abu-abu tanpa data.</p>
          </section>
          <section aria-label="Insiden">
            <h2 className="m-0 mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-faint">Insiden</h2>
            <IncidentList snapshot={snapshot} />
          </section>
        </main>
        <footer className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline pt-4 font-mono text-[11px] text-paper-faint">
          <Link className="hover:text-paper" href="/">indicate.website</Link>
          <Link className="hover:text-paper" href="/api/status">JSON</Link>
          <span className="ml-auto tabular-nums">Diperbarui {formatMoment(snapshot.generatedAt)}</span>
        </footer>
      </div>
    </div>
  );
}

function IncidentUpdates({ updates }: { readonly updates: readonly { readonly at: string; readonly text: string }[] }) {
  if (updates.length === 0) return null;
  return (
    <ul className="m-0 mt-2.5 list-none space-y-1.5 border-t border-hairline pt-2.5 p-0">
      {updates.map((update, index) => (
        <li key={`${update.at}-${index}`} className="text-xs leading-relaxed text-paper-dim">
          <span className="font-mono text-[11px] text-paper-faint">{formatMoment(update.at)} — </span>
          {update.text}
        </li>
      ))}
    </ul>
  );
}
