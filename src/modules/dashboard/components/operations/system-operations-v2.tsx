'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  Boxes,
  CircleAlert,
  Clock3,
  Layers3,
  Radio,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';
import type { OperationsProjection } from '@/modules/dashboard/models';

type OpsFocus = 'tower' | 'queues' | 'delivery';

function asOperations(data: unknown): OperationsProjection {
  if (typeof data !== 'object' || data === null) {
    return {
      invalidationTasks: [],
      objectCleanupTasks: [],
      mediaKeyReservations: [],
      cacheBypasses: [],
      transitionReceipts: [],
      webhookReplayClaims: [],
    };
  }
  const source = data as Partial<OperationsProjection>;
  return {
    invalidationTasks: Array.isArray(source.invalidationTasks) ? source.invalidationTasks : [],
    objectCleanupTasks: Array.isArray(source.objectCleanupTasks) ? source.objectCleanupTasks : [],
    mediaKeyReservations: Array.isArray(source.mediaKeyReservations)
      ? source.mediaKeyReservations
      : [],
    cacheBypasses: Array.isArray(source.cacheBypasses) ? source.cacheBypasses : [],
    transitionReceipts: Array.isArray(source.transitionReceipts) ? source.transitionReceipts : [],
    webhookReplayClaims: Array.isArray(source.webhookReplayClaims)
      ? source.webhookReplayClaims
      : [],
  };
}

function attention(status: string): boolean {
  return !['completed', 'succeeded', 'consumed', 'expired', 'released', 'deleted'].includes(
    status.toLowerCase(),
  );
}

export function SystemOperationsV2({ data }: { readonly data: unknown }) {
  const [focus, setFocus] = useState<OpsFocus>('tower');
  const ops = useMemo(() => asOperations(data), [data]);

  const queues = [
    {
      id: 'invalidation',
      label: 'Cache invalidation',
      icon: RefreshCw,
      rows: ops.invalidationTasks,
    },
    { id: 'cleanup', label: 'Object cleanup', icon: Archive, rows: ops.objectCleanupTasks },
    {
      id: 'reservations',
      label: 'Media reservations',
      icon: Boxes,
      rows: ops.mediaKeyReservations,
    },
    { id: 'bypasses', label: 'Cache bypasses', icon: Layers3, rows: ops.cacheBypasses },
    { id: 'receipts', label: 'Transition receipts', icon: Activity, rows: ops.transitionReceipts },
    { id: 'webhooks', label: 'Webhook replay', icon: Radio, rows: ops.webhookReplayClaims },
  ] as const;
  const total = queues.reduce((sum, queue) => sum + queue.rows.length, 0);
  const attentionCount = queues.reduce(
    (sum, queue) =>
      sum +
      queue.rows.filter((row) => typeof row.status === 'string' && attention(row.status)).length,
    0,
  );
  const replayAttempts = ops.webhookReplayClaims.reduce((sum, row) => sum + row.attemptCount, 0);

  return (
    <div className="space-y-5">
      <header className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Runtime Control
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            System Operations
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-6 text-paper-dim">
            Control tower untuk workload background, delivery state, cleanup, cache, dan retry
            pressure tanpa polling tambahan.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Workloads', String(total), 'Loaded queues'],
            ['Attention', String(attentionCount), 'Non-terminal'],
            ['Webhooks', String(ops.webhookReplayClaims.length), 'Replay claims'],
            ['Attempts', String(replayAttempts), 'Replay attempts'],
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
          aria-label="Area System Operations"
          className="space-y-1 rounded-xl border border-hairline bg-bg-raised p-2"
        >
          {[
            {
              id: 'tower' as const,
              label: 'Control Tower',
              description: 'Posture dan incident queue',
              icon: ServerCog,
            },
            {
              id: 'queues' as const,
              label: 'Queue Health',
              description: 'State tiap workload',
              icon: Activity,
            },
            {
              id: 'delivery' as const,
              label: 'Webhook & Delivery',
              description: 'Replay pressure dan expiry',
              icon: Radio,
            },
          ].map(({ id, label, description, icon: Icon }) => {
            const active = focus === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setFocus(id as OpsFocus)}
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
          {focus === 'tower' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard icon={ServerCog} title="Runtime Posture" eyebrow="Current workload">
                <div className="space-y-2">
                  {queues.map((queue) => {
                    const pending = queue.rows.filter(
                      (row) => typeof row.status === 'string' && attention(row.status),
                    ).length;
                    const Icon = queue.icon;
                    return (
                      <button
                        key={queue.id}
                        type="button"
                        onClick={() => setFocus('queues')}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-hairline bg-bg p-3 text-left hover:bg-bg-raised-2"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className="h-4 w-4 flex-none text-paper-faint" aria-hidden="true" />
                          <span className="truncate font-sans text-xs text-paper">
                            {queue.label}
                          </span>
                        </span>
                        <span
                          className={
                            pending > 0
                              ? 'font-mono text-xs font-semibold text-warning'
                              : 'font-mono text-xs text-signal'
                          }
                        >
                          {pending > 0 ? String(pending) + ' attention' : 'healthy'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
              <SectionCard icon={CircleAlert} title="Incident Queue" eyebrow="Non-terminal work">
                {attentionCount === 0 ? (
                  <p className="m-0 flex items-center gap-2 py-5 text-xs text-signal">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Tidak ada workload
                    non-terminal pada snapshot ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {queues.flatMap((queue) =>
                      queue.rows
                        .filter((row) => typeof row.status === 'string' && attention(row.status))
                        .slice(0, 2)
                        .map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-warning/20 bg-warning/[0.04] p-3"
                          >
                            <span className="min-w-0 truncate font-mono text-xs text-paper">
                              {row.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] uppercase text-warning"
                            >
                              {row.status}
                            </Badge>
                          </div>
                        )),
                    )}
                  </div>
                )}
              </SectionCard>
            </div>
          ) : null}

          {focus === 'queues' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {queues.map((queue) => {
                const Icon = queue.icon;
                return (
                  <SectionCard
                    key={queue.id}
                    icon={Icon}
                    title={queue.label}
                    eyebrow={String(queue.rows.length) + ' records'}
                  >
                    {queue.rows.length === 0 ? (
                      <p className="m-0 py-4 text-xs text-paper-faint">Queue kosong.</p>
                    ) : (
                      <div className="space-y-2">
                        {queue.rows.slice(0, 8).map((row) => (
                          <div
                            key={row.id}
                            className="grid gap-2 rounded-lg border border-hairline bg-bg p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                          >
                            <div>
                              <p className="m-0 truncate font-sans text-xs font-semibold text-paper">
                                {row.name}
                              </p>
                              <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">
                                {'updatedAt' in row && typeof row.updatedAt === 'string'
                                  ? (formatMoment(row.updatedAt) ?? 'Unknown')
                                  : 'State snapshot'}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                attention(row.status)
                                  ? 'font-mono text-[9px] uppercase text-warning'
                                  : 'font-mono text-[9px] uppercase text-signal'
                              }
                            >
                              {row.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>
                );
              })}
            </div>
          ) : null}

          {focus === 'delivery' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard icon={Radio} title="Webhook Replay" eyebrow="Delivery pressure">
                {ops.webhookReplayClaims.length === 0 ? (
                  <p className="m-0 py-5 text-xs text-paper-faint">Tidak ada replay claim.</p>
                ) : (
                  <div className="space-y-2">
                    {ops.webhookReplayClaims.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-bg p-3"
                      >
                        <div className="min-w-0">
                          <p className="m-0 truncate font-mono text-xs text-paper">{row.name}</p>
                          <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">
                            {row.attemptCount} attempts · expires{' '}
                            {formatMoment(row.expiresAt) ?? 'Unknown'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            attention(row.status)
                              ? 'font-mono text-[9px] uppercase text-warning'
                              : 'font-mono text-[9px] uppercase text-signal'
                          }
                        >
                          {row.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard icon={Clock3} title="Delivery Boundary" eyebrow="Read-only control">
                <p className="m-0 text-xs leading-5 text-paper-dim">
                  Snapshot ini tidak menambahkan retry otomatis atau polling. Operasi mutasi tetap
                  berjalan melalui worker/domain owner, sedangkan dashboard hanya menunjukkan state
                  dan pressure.
                </p>
              </SectionCard>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
