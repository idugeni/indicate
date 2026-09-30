import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';

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
import { HeaderSecondaryCta, Section } from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION = 'Kondisi langsung seluruh layanan Indicate: database, cache, penyimpanan, autentikasi, penerbitan, AI, dan API — beserta riwayat insiden.';

export function generateMetadata(): Metadata {
  return siteMetadata('Status Layanan', DESCRIPTION, '/status');
}

const loadCachedStatus = unstable_cache(loadStatus, ['status-snapshot'], { revalidate: 60, tags: ['status'] });

const OVERALL_COPY: Readonly<Record<ComponentHealth, { readonly title: string; readonly tone: string; readonly text: string }>> = {
  ok: {
    title: 'Semua sistem operasional',
    tone: 'border-signal/40 bg-signal/10 text-signal',
    text: 'Seluruh komponen menjawab pemeriksaan otomatis terakhir.',
  },
  degraded: {
    title: 'Sebagian sistem menurun',
    text: 'Satu atau lebih komponen melambat. Insiden dibuka otomatis di bawah.',
    tone: 'border-brass/40 bg-brass/10 text-brass',
  },
  down: {
    title: 'Gangguan berlangsung',
    text: 'Satu atau lebih komponen tidak merespons. Insiden dibuka otomatis di bawah.',
    tone: 'border-error/40 bg-error/10 text-error',
  },
};

function barTone(uptimePct: number | null): string {
  if (uptimePct === null) return 'bg-paper-faint/30';
  if (uptimePct >= 99.9) return 'bg-signal';
  if (uptimePct >= 99) return 'bg-signal/60';
  if (uptimePct >= 95) return 'bg-brass';
  return 'bg-error';
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

async function loadStatus(): Promise<{ readonly overall: ComponentHealth; readonly components: readonly ComponentView[]; readonly incidents: readonly IncidentView[]; readonly generatedAt: string }> {
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

interface IncidentView {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly startedAt: string;
  readonly resolvedAt: string | null;
  readonly updates: readonly { readonly at: string; readonly text: string }[];
}

export default async function StatusPage() {
  const snapshot = await loadCachedStatus();
  const overall = OVERALL_COPY[snapshot.overall];
  const open = snapshot.incidents.filter((incident) => incident.status === 'open');
  const resolved = snapshot.incidents.filter((incident) => incident.status !== 'open');
  return (
    <PublicPage
      eyebrow="Status"
      title="Status layanan Indicate"
      description={DESCRIPTION}
      meta={[overall.title, `Diperbarui ${formatMoment(snapshot.generatedAt)}`]}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={<HeaderSecondaryCta href="/contact">Laporkan Gangguan</HeaderSecondaryCta>}
    >
      <Section title="Kondisi saat ini" description="Pemeriksaan otomatis setiap lima menit ke seluruh komponen." eyebrow="Live">
        <div className={`rounded-lg border p-4 sm:p-5 ${overall.tone}`}>
          <p className="m-0 font-sans text-base font-semibold sm:text-lg">{overall.title}</p>
          <p className="m-0 mt-1 font-sans text-sm opacity-90">{overall.text}</p>
        </div>
        <ul className="m-0 mt-4 list-none space-y-3 p-0">
          {snapshot.components.map((item) => (
            <li key={item.component} className="rounded-lg border border-hairline bg-bg-raised p-3.5 sm:p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="m-0 font-sans text-sm font-semibold text-paper">{COMPONENT_LABELS[item.component]}</p>
                <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
                  {item.health === 'unknown' ? 'belum ada data' : `${item.health === 'ok' ? 'operasional' : item.health === 'degraded' ? 'menurun' : 'mati'}${item.latencyMs === null ? '' : ` · ${item.latencyMs} ms`}`}
                  {item.uptime90 === null ? '' : ` · ${item.uptime90.toFixed(2)}% / 90 hari`}
                </p>
              </div>
              <div className="mt-2 flex gap-[2px]" aria-label={`Uptime 90 hari ${COMPONENT_LABELS[item.component]}`}>
                {item.days.map((cell) => (
                  <span key={cell.day} aria-hidden="true" className={`h-6 min-w-0 flex-1 rounded-[2px] ${barTone(cell.uptimePct)}`} />
                ))}
              </div>
            </li>
          ))}
        </ul>
        <p className="m-0 mt-3 font-mono text-[11px] text-paper-faint">Hijau 99.9%+, hijau pudar 99%+, kuning 95%+, merah di bawahnya, abu-abu tanpa data.</p>
      </Section>
      <Section title="Insiden" description="Dibuka dan ditutup otomatis oleh evaluasi probe; tanpa penulisan manual." eyebrow="Riwayat">
        {open.length > 0 ? (
          <ul className="m-0 list-none space-y-3 p-0">
            {open.map((incident) => (
              <li key={incident.id} className="rounded-lg border border-error/40 bg-error/[0.06] p-3.5 sm:p-4">
                <p className="m-0 font-sans text-sm font-semibold text-paper">{incident.title}</p>
                <p className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">Sejak {formatMoment(incident.startedAt)}</p>
                <IncidentUpdates updates={incident.updates} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 font-sans text-sm text-paper-dim">Tidak ada insiden terbuka.</p>
        )}
        {resolved.length > 0 ? (
          <ul className="m-0 mt-4 list-none space-y-3 p-0">
            {resolved.map((incident) => (
              <li key={incident.id} className="rounded-lg border border-hairline bg-bg-raised p-3.5 sm:p-4">
                <p className="m-0 font-sans text-sm font-semibold text-paper">{incident.title}</p>
                <p className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">
                  {formatMoment(incident.startedAt)}{incident.resolvedAt === null ? '' : ` → ${formatMoment(incident.resolvedAt)}`}
                </p>
                <IncidentUpdates updates={incident.updates} />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
    </PublicPage>
  );
}

function IncidentUpdates({ updates }: { readonly updates: readonly { readonly at: string; readonly text: string }[] }) {
  if (updates.length === 0) return null;
  return (
    <ul className="m-0 mt-2 list-none space-y-1.5 border-t border-hairline pt-2 p-0">
      {updates.map((update, index) => (
        <li key={`${update.at}-${index}`} className="font-sans text-xs leading-relaxed text-paper-dim">
          <span className="font-mono text-[11px] text-paper-faint">{formatMoment(update.at)} — </span>
          {update.text}
        </li>
      ))}
    </ul>
  );
}
