'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSearch,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import type { AuditRecord, RetentionRunRecord } from '@/modules/dashboard/models';

type AuditFocus = 'timeline' | 'risk' | 'retention';

function isAuditRecord(value: unknown): value is AuditRecord {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.action === 'string' &&
    typeof row.targetType === 'string' &&
    (row.outcome === 'succeeded' || row.outcome === 'denied' || row.outcome === 'failed') &&
    typeof row.occurredAt === 'string'
  );
}

function isRetentionRun(value: unknown): value is RetentionRunRecord {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.name === 'string' &&
    typeof row.status === 'string' &&
    typeof row.finishedAt === 'string'
  );
}

const outcomeLabel = (outcome: AuditRecord['outcome']) =>
  outcome === 'succeeded' ? 'Succeeded' : outcome === 'denied' ? 'Denied' : 'Failed';

export function AuditSecurityV2({
  data,
  auditNextCursor,
  onLoadMoreAudit,
}: {
  readonly data: unknown;
  readonly auditNextCursor?: string | null | undefined;
  readonly onLoadMoreAudit?: (() => void) | undefined;
}) {
  const [focus, setFocus] = useState<AuditFocus>('timeline');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const { logs, retentionRuns } = useMemo(() => {
    if (typeof data !== 'object' || data === null)
      return { logs: [] as AuditRecord[], retentionRuns: [] as RetentionRunRecord[] };
    const source = data as Record<string, unknown>;
    return {
      logs: Array.isArray(source.auditLogs) ? source.auditLogs.filter(isAuditRecord) : [],
      retentionRuns: Array.isArray(source.retentionRuns)
        ? source.retentionRuns.filter(isRetentionRun)
        : [],
    };
  }, [data]);

  const denied = logs.filter((row) => row.outcome === 'denied');
  const failed = logs.filter((row) => row.outcome === 'failed');
  const succeeded = logs.filter((row) => row.outcome === 'succeeded');
  const recentRisks = [...denied, ...failed]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, 8);
  const latest = logs[0]?.occurredAt ?? null;
  const latestAge =
    latest === null ? null : Math.max(0, Math.round((nowMs - Date.parse(latest)) / 60000));
  const selected = selectedId === null ? null : (logs.find((row) => row.id === selectedId) ?? null);
  const clusters = (() => {
    const counts = new Map<string, number>();
    for (const row of [...denied, ...failed])
      counts.set(row.action, (counts.get(row.action) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  })();

  const nav = [
    ['timeline', 'Investigation Timeline', 'Event + evidence metadata', FileSearch],
    ['risk', 'Risk Signals', 'Denied, failed, clusters', ShieldAlert],
    ['retention', 'Retention Evidence', 'Lifecycle and sweep proof', Clock3],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Security Operations
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Audit & Security
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-dim">
            Ruang investigasi untuk risk signal, jejak aksi, dan evidence tanpa mengekspos payload
            audit mentah.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ['Events', String(logs.length), 'Loaded'],
            ['Denied', String(denied.length), 'Access blocks'],
            ['Failed', String(failed.length), 'Operation failures'],
            ['Healthy', String(succeeded.length), 'Successful'],
            ['Latest', latestAge === null ? '—' : String(latestAge) + 'm', 'Event age'],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-lg border border-hairline bg-bg-raised px-3 py-2.5">
              <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                {label}
              </p>
              <p className="m-0 mt-1 font-mono text-lg font-semibold tabular-nums text-paper">
                {value}
              </p>
              <p className="m-0 mt-0.5 truncate font-sans text-[10px] text-paper-faint">{note}</p>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Area Audit & Security"
          className="space-y-1 rounded-xl border border-hairline bg-bg-raised p-2"
        >
          {nav.map(([id, label, description, Icon]) => {
            const active = focus === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setFocus(id)}
                className={
                  active
                    ? 'flex w-full items-start gap-3 rounded-lg bg-bg-raised-2 px-3 py-3 text-left text-paper ring-1 ring-brass/30'
                    : 'flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
                }
              >
                <Icon
                  className={
                    active
                      ? 'mt-0.5 h-4 w-4 flex-none text-brass'
                      : 'mt-0.5 h-4 w-4 flex-none text-paper-faint'
                  }
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-sans text-xs font-semibold">{label}</span>
                  <span className="mt-0.5 block font-sans text-[10px] leading-4 text-paper-faint">
                    {description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {focus === 'timeline' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <SectionCard
                icon={FileSearch}
                title="Investigation Timeline"
                eyebrow="Append-only evidence"
              >
                {logs.length === 0 ? (
                  <p className="m-0 py-6 text-center text-xs text-paper-faint">
                    Belum ada event audit pada scope ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {logs.slice(0, 50).map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className={
                          selectedId === row.id
                            ? 'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-brass/30 bg-bg-raised-2 p-3 text-left'
                            : 'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-hairline bg-bg p-3 text-left hover:bg-bg-raised-2'
                        }
                      >
                        {row.outcome === 'succeeded' ? (
                          <CheckCircle2 className="h-4 w-4 text-signal" aria-hidden="true" />
                        ) : row.outcome === 'denied' ? (
                          <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4 text-danger" aria-hidden="true" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-xs font-semibold text-paper">
                            {row.action}
                          </span>
                          <span className="mt-0.5 block truncate font-sans text-[10px] text-paper-faint">
                            {row.targetType}
                            {row.targetId ? ' · ' + row.targetId : ''} · {row.actorType} ·{' '}
                            {row.entryPoint}
                          </span>
                        </span>
                        <span className="text-right">
                          <Badge variant="outline" className="font-mono text-[9px] uppercase">
                            {outcomeLabel(row.outcome)}
                          </Badge>
                          <span className="mt-1 block font-mono text-[9px] text-paper-faint">
                            {formatMoment(row.occurredAt) ?? 'Unknown'}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard icon={Fingerprint} title="Evidence Inspector" eyebrow="Metadata only">
                {selected === null ? (
                  <p className="m-0 py-6 text-center text-xs leading-5 text-paper-faint">
                    Pilih event untuk membuka konteks investigasi. Nilai before/after tidak
                    ditampilkan mentah.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                        Request
                      </p>
                      <p className="m-0 mt-1 break-all font-mono text-[10px] text-paper">
                        {selected.requestId}
                      </p>
                    </div>
                    <div>
                      <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                        Actor
                      </p>
                      <p className="m-0 mt-1 font-mono text-[10px] text-paper">
                        {selected.actorType} · {selected.actorId}
                      </p>
                    </div>
                    <div>
                      <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
                        Changed fields
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selected.changedFields.length === 0 ? (
                          <span className="text-[10px] text-paper-faint">Tidak ada.</span>
                        ) : (
                          selected.changedFields.map((field) => (
                            <span
                              key={field}
                              className="rounded border border-hairline px-1.5 py-1 font-mono text-[9px] text-paper-dim"
                            >
                              {field}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <p className="m-0 border-t border-hairline pt-3 text-[10px] leading-4 text-paper-faint">
                      Evidence payload sengaja tidak dirender untuk mengurangi risiko kebocoran
                      nilai sensitif.
                    </p>
                  </div>
                )}
                {auditNextCursor !== null &&
                auditNextCursor !== undefined &&
                onLoadMoreAudit !== undefined ? (
                  <div className="mt-3 flex justify-center">
                    <button
                      type="button"
                      onClick={onLoadMoreAudit}
                      className="rounded-md border border-hairline px-3 py-2 font-sans text-xs text-paper-dim hover:border-hairline-strong hover:text-paper"
                    >
                      Muat riwayat lebih lama
                    </button>
                  </div>
                ) : null}
              </SectionCard>
            </div>
          ) : null}

          {focus === 'risk' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard icon={AlertTriangle} title="Risk Signals" eyebrow="Denied + failed">
                {recentRisks.length === 0 ? (
                  <p className="m-0 flex items-center gap-2 py-5 text-xs text-signal">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Tidak ada denied atau
                    failed event.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentRisks.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(row.id);
                          setFocus('timeline');
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-warning/20 bg-warning/[0.04] px-3 py-2.5 text-left hover:bg-warning/[0.08]"
                      >
                        <span className="min-w-0 truncate font-mono text-xs text-paper">
                          {row.action}
                        </span>
                        <span className="font-mono text-[9px] text-warning">
                          {outcomeLabel(row.outcome)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard
                icon={ShieldAlert}
                title="Failure Clusters"
                eyebrow="Most frequent signals"
              >
                {clusters.length === 0 ? (
                  <p className="m-0 py-5 text-xs text-paper-faint">Belum ada cluster risiko.</p>
                ) : (
                  <div className="space-y-2">
                    {clusters.map(([action, count]) => (
                      <div
                        key={action}
                        className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-bg p-3"
                      >
                        <span className="min-w-0 truncate font-mono text-xs text-paper">
                          {action}
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-warning">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          ) : null}

          {focus === 'retention' ? (
            <SectionCard icon={Clock3} title="Retention Evidence" eyebrow="Audit lifecycle">
              {retentionRuns.length === 0 ? (
                <p className="m-0 py-5 text-xs text-paper-faint">Belum ada retention evidence.</p>
              ) : (
                <div className="space-y-2">
                  {retentionRuns.map((run) => (
                    <div
                      key={run.id}
                      className="grid gap-2 rounded-lg border border-hairline bg-bg p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <p className="m-0 text-xs font-semibold text-paper">{run.name}</p>
                        <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">
                          {run.category} · {run.purgedCount} purged ·{' '}
                          {formatMoment(run.finishedAt) ?? 'Unknown'}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="w-fit font-mono text-[9px] uppercase text-signal"
                      >
                        {run.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}
        </div>
      </div>

      <p className="m-0 font-mono text-[9px] uppercase tracking-wider text-paper-faint">
        Security boundary: audit evidence is read-only; mutation actions remain in their owning
        domain workflow.
      </p>
    </div>
  );
}
