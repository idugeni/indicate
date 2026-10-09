'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import type { DashboardCommand } from '@/modules/dashboard/command';

type AiStats = {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly activeKeys: number;
  readonly cooldownKeys: number;
  readonly avgLatencyMs: number;
};

type AiChainHealth = {
  readonly providerId: string;
  readonly modelName: string;
  readonly role: string;
  readonly hasCredential: boolean;
  readonly tripped: boolean;
  readonly failCount: number;
};

type AiLog = {
  readonly id: string;
  readonly channel: string;
  readonly modelName: string;
  readonly status: string;
  readonly latencyMs: number;
  readonly totalTokens: number;
  readonly createdAt: string;
};

type AiSnapshot = {
  readonly policy: {
    readonly primaryProviderId: string | null;
    readonly defaultModel: string;
    readonly fallbackProviderId: string | null;
    readonly fallbackModel: string;
    readonly costMode: string;
    readonly chainStrategy: string;
  } | null;
  readonly chainHealth: readonly AiChainHealth[];
  readonly recentLogs: readonly AiLog[];
  readonly models: readonly {
    readonly id: string;
    readonly modelName: string;
    readonly isActive: boolean;
  }[];
  readonly stats: AiStats;
};

const AiManagementPanel = dynamic(
  () =>
    import('@/modules/dashboard/components/settings/ai-management-panel').then((module) => ({
      default: module.AiManagementPanel,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    ),
  },
);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown, fallback = '—'): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseSnapshot(value: unknown): AiSnapshot | null {
  const body = record(value);
  const stats = record(body?.stats);
  if (body === null || stats === null || !Array.isArray(body.credentials)) return null;
  const chainHealth: AiChainHealth[] = Array.isArray(body.chainHealth)
    ? body.chainHealth.flatMap((entry): AiChainHealth[] => {
        const row = record(entry);
        if (row === null || typeof row.providerId !== 'string' || typeof row.modelName !== 'string')
          return [];
        return [
          {
            providerId: row.providerId,
            modelName: row.modelName,
            role: stringValue(row.role),
            hasCredential: row.hasCredential === true,
            tripped: row.tripped === true,
            failCount: numberValue(row.failCount),
          },
        ];
      })
    : [];
  const recentLogs: AiLog[] = Array.isArray(body.recentLogs)
    ? body.recentLogs.flatMap((entry): AiLog[] => {
        const row = record(entry);
        if (row === null || typeof row.id !== 'string') return [];
        return [
          {
            id: row.id,
            channel: stringValue(row.channel),
            modelName: stringValue(row.modelName),
            status: stringValue(row.status, 'unknown'),
            latencyMs: numberValue(row.latencyMs),
            totalTokens: numberValue(row.totalTokens),
            createdAt: stringValue(row.createdAt, ''),
          },
        ];
      })
    : [];
  const models = Array.isArray(body.models)
    ? body.models.flatMap((entry): AiSnapshot['models'][number][] => {
        const row = record(entry);
        if (row === null || typeof row.modelName !== 'string') return [];
        return [
          {
            id: stringValue(row.id, row.modelName),
            modelName: row.modelName,
            isActive: row.isActive !== false,
          },
        ];
      })
    : [];
  const policyRecord = record(body.policy);
  const policy =
    policyRecord === null
      ? null
      : {
          primaryProviderId:
            typeof policyRecord.primaryProviderId === 'string'
              ? policyRecord.primaryProviderId
              : null,
          defaultModel: stringValue(policyRecord.defaultModel, ''),
          fallbackProviderId:
            typeof policyRecord.fallbackProviderId === 'string'
              ? policyRecord.fallbackProviderId
              : null,
          fallbackModel: stringValue(policyRecord.fallbackModel, ''),
          costMode: stringValue(policyRecord.costMode, 'throughput'),
          chainStrategy: stringValue(policyRecord.chainStrategy, 'fallback'),
        };
  return {
    policy,
    chainHealth,
    recentLogs,
    models,
    stats: {
      totalRequests: numberValue(stats.totalRequests),
      successfulRequests: numberValue(stats.successfulRequests),
      failedRequests: numberValue(stats.failedRequests),
      activeKeys: numberValue(stats.activeKeys),
      cooldownKeys: numberValue(stats.cooldownKeys),
      avgLatencyMs: numberValue(stats.avgLatencyMs),
    },
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

function formatMoment(value: string): string {
  const date = new Date(value);
  return value === '' || Number.isNaN(date.getTime())
    ? 'Waktu tidak tersedia'
    : date.toLocaleString('id-ID');
}

function isHealthy(entry: AiChainHealth): boolean {
  return entry.hasCredential && !entry.tripped && entry.failCount === 0;
}

export function AiControlCenterV2({
  organizationId,
  command,
}: {
  readonly organizationId: string;
  readonly command: DashboardCommand;
}) {
  const [snapshot, setSnapshot] = useState<AiSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const requestController = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setBusy(true);
    setError(null);
    try {
      const url =
        '/api/dashboard/integrations?organizationId=' +
        encodeURIComponent(organizationId) +
        '&view=ai';
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const parsed = parseSnapshot(await response.json());
      if (parsed === null) throw new Error('Invalid AI overview payload');
      if (!controller.signal.aborted) setSnapshot(parsed);
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return;
      if (!controller.signal.aborted)
        setError(
          'Data AI belum dapat dimuat. Coba muat ulang; konfigurasi yang tersimpan tidak diubah.',
        );
    } finally {
      if (requestController.current === controller) {
        requestController.current = null;
        setBusy(false);
      }
    }
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => load());
    return () => {
      requestController.current?.abort();
      requestController.current = null;
    };
  }, [load]);

  const successRate = useMemo(() => {
    const total = snapshot?.stats.totalRequests ?? 0;
    return total === 0
      ? null
      : Math.round(((snapshot?.stats.successfulRequests ?? 0) / total) * 100);
  }, [snapshot]);
  const attention = useMemo(
    () => (snapshot?.chainHealth ?? []).filter((entry) => !isHealthy(entry)),
    [snapshot],
  );
  const activeModels = snapshot?.models.filter((model) => model.isActive).length ?? 0;

  if (showAdvanced) {
    return (
      <div className="space-y-5">
        <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
              Intelligence Layer · AI Control Plane
            </p>
            <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
              AI Control Center
            </h1>
            <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-paper-dim">
              Kelola kredensial, routing, kebijakan biaya, dan fallback tanpa meninggalkan workspace V2.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-1 rounded-lg border border-hairline bg-bg-raised p-1" aria-label="Workspace AI">
            <Button type="button" size="sm" variant="ghost" aria-pressed={!showAdvanced} onClick={() => setShowAdvanced(false)}>
              Ringkasan
            </Button>
            <Button type="button" size="sm" aria-pressed={showAdvanced} onClick={() => setShowAdvanced(true)}>
              Kelola AI
            </Button>
          </div>
        </header>
        <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
          <CardHeader className="border-b border-hairline pb-3">
            <CardTitle className="text-sm">Workflow CRUD dan kebijakan AI</CardTitle>
            <CardDescription>Operasi kredensial dan rotasi secret tetap memakai konfirmasi eksplisit serta endpoint organisasi yang ada.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <AiManagementPanel organizationId={organizationId} command={command} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="grid gap-4 border-b border-hairline pb-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="m-0 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brass">
            Intelligence Layer · AI Control Plane
          </p>
          <h1 className="m-0 mt-1 font-serif text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            AI Control Center
          </h1>
          <p className="m-0 mt-2 max-w-2xl text-sm leading-6 text-paper-dim">
            Pantau kesiapan routing, kesehatan provider, dan kualitas request. Buka konfigurasi
            lanjutan hanya saat perlu mengubah kebijakan atau kredensial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            Muat ulang
          </Button>
          <div className="inline-flex items-center gap-1 rounded-lg border border-hairline bg-bg-raised p-1" aria-label="Workspace AI">
            <Button type="button" size="sm" aria-pressed={!showAdvanced} onClick={() => setShowAdvanced(false)}>
              Ringkasan
            </Button>
            <Button type="button" size="sm" variant="ghost" aria-pressed={showAdvanced} onClick={() => setShowAdvanced(true)}>
              Kelola AI
            </Button>
          </div>
        </div>
      </header>

      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {busy && snapshot === null ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64 sm:col-span-2 xl:col-span-4" />
        </div>
      ) : snapshot === null ? (
        <EmptyState
          title="Ringkasan AI belum tersedia"
          description="Periksa akses AI Control dan koneksi dashboard, lalu coba lagi."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Activity}
              label="Total request tercatat"
              value={formatNumber(snapshot.stats.totalRequests)}
              detail="Counter pada pool kredensial"
            />
            <MetricCard
              icon={CheckCircle2}
              label="Success rate"
              value={successRate === null ? '—' : `${successRate}%`}
              detail={`${formatNumber(snapshot.stats.failedRequests)} request gagal`}
            />
            <MetricCard
              icon={KeyRound}
              label="Kredensial aktif"
              value={`${snapshot.stats.activeKeys}`}
              detail={`${snapshot.stats.cooldownKeys} dalam cooldown`}
            />
            <MetricCard
              icon={Zap}
              label="Rata-rata latency"
              value={
                snapshot.stats.avgLatencyMs > 0
                  ? `${formatNumber(snapshot.stats.avgLatencyMs)} ms`
                  : '—'
              }
              detail={`${activeModels} model aktif`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
              <CardHeader className="border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-brass" />
                  <CardTitle className="text-sm">Routing posture</CardTitle>
                </div>
                <CardDescription>
                  Konfigurasi efektif yang dibaca dari control plane.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {snapshot.policy === null ? (
                  <EmptyState
                    title="Routing belum dikonfigurasi"
                    description="Tetapkan provider dan model primer sebelum mengandalkan routing otomatis."
                  />
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoValue
                        label="Provider primer"
                        value={snapshot.policy.primaryProviderId ?? 'Belum ditetapkan'}
                      />
                      <InfoValue
                        label="Model default"
                        value={snapshot.policy.defaultModel || 'Belum ditetapkan'}
                      />
                      <InfoValue
                        label="Provider fallback"
                        value={snapshot.policy.fallbackProviderId ?? 'Tidak dikonfigurasi'}
                      />
                      <InfoValue
                        label="Model fallback"
                        value={snapshot.policy.fallbackModel || 'Tidak dikonfigurasi'}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Mode biaya: {snapshot.policy.costMode}</Badge>
                      <Badge variant="outline">Strategi: {snapshot.policy.chainStrategy}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
              <CardHeader className="border-b border-hairline pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brass" />
                  <CardTitle className="text-sm">Provider health & attention</CardTitle>
                </div>
                <CardDescription>
                  Indikator dari health chain yang tersedia; bukan probe live baru.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {snapshot.chainHealth.length === 0 ? (
                  <EmptyState
                    title="Belum ada health chain"
                    description="Health akan tampil setelah routing memiliki provider/model yang dapat dievaluasi."
                  />
                ) : (
                  <>
                    {attention.length > 0 ? (
                      <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/[0.06] p-3 text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <div>
                          <p className="m-0 font-medium text-paper">
                            {attention.length} jalur perlu diperiksa
                          </p>
                          <p className="m-0 mt-1 text-paper-dim">
                            Periksa kredensial, cooldown, dan kegagalan provider sebelum mengubah
                            routing.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md border border-signal/40 bg-signal/[0.05] p-3 text-sm text-paper">
                        <CheckCircle2 className="h-4 w-4 text-signal" />
                        Semua jalur yang dilaporkan terlihat siap.
                      </div>
                    )}
                    <ul className="m-0 space-y-2 p-0">
                      {snapshot.chainHealth.map((entry) => (
                        <li
                          key={`${entry.role}:${entry.providerId}:${entry.modelName}`}
                          className="flex flex-col gap-2 rounded-md border border-hairline p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="m-0 break-words text-sm font-medium text-paper">
                              {entry.providerId}{' '}
                              <span className="font-normal text-paper-dim">
                                · {entry.modelName}
                              </span>
                            </p>
                            <p className="m-0 mt-1 text-xs text-paper-dim">
                              {entry.role} · {entry.failCount} kegagalan tercatat
                            </p>
                          </div>
                          <Badge variant={isHealthy(entry) ? 'secondary' : 'destructive'}>
                            {!entry.hasCredential
                              ? 'No credential'
                              : entry.tripped
                                ? 'Circuit open'
                                : entry.failCount > 0
                                  ? 'Failures'
                                  : 'Ready'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
            <CardHeader className="border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-brass" />
                <CardTitle className="text-sm">Request activity terbaru</CardTitle>
              </div>
              <CardDescription>
                Aktivitas terakhir yang tersedia dari API overview; tidak melakukan polling.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {snapshot.recentLogs.length === 0 ? (
                <EmptyState
                  title="Belum ada request tercatat"
                  description="Log akan muncul setelah ada aktivitas AI yang tercatat."
                />
              ) : (
                <div className="space-y-2">
                  {snapshot.recentLogs.slice(0, 8).map((entry) => (
                    <div
                      key={entry.id}
                      className="grid gap-2 rounded-md border border-hairline p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="m-0 break-words text-sm font-medium text-paper">
                          {entry.modelName}
                        </p>
                        <p className="m-0 mt-1 text-xs text-paper-dim">
                          {entry.channel} · {formatMoment(entry.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            entry.status.toLowerCase() === 'success' ||
                            entry.status.toLowerCase() === 'succeeded'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {entry.status}
                        </Badge>
                        <span className="font-mono text-xs text-paper-dim">
                          {formatNumber(entry.latencyMs)} ms · {formatNumber(entry.totalTokens)}{' '}
                          token
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-bg-raised p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
              <div>
                <p className="m-0 text-sm font-semibold text-paper">Butuh perubahan konfigurasi?</p>
                <p className="m-0 mt-1 text-sm text-paper-dim">
                  Kelola key, model, retry policy, cooldown, concurrency, insight, dan master secret
                  melalui kontrol lanjutan.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowAdvanced(true)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Buka kontrol lanjutan
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  readonly icon: typeof Activity;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <Card className="rounded-lg border-hairline bg-bg-raised shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="m-0 text-xs text-paper-dim">{label}</p>
          <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
        </div>
        <p className="m-0 mt-3 font-mono text-2xl font-semibold tracking-tight text-paper">
          {value}
        </p>
        <p className="m-0 mt-1 text-xs text-paper-dim">{detail}</p>
      </CardContent>
    </Card>
  );
}

function InfoValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-hairline p-3">
      <p className="m-0 text-[11px] uppercase tracking-wider text-paper-faint">{label}</p>
      <p className="m-0 mt-1 break-words text-sm font-medium text-paper">{value}</p>
    </div>
  );
}
