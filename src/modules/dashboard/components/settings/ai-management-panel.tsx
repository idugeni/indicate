'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Activity, CheckCircle2, Clock, KeyRound, Play, Plus, Power, ShieldCheck, SlidersHorizontal, TrendingUp, Trash2, Zap } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { DashboardPager } from '@/modules/dashboard/components/shared/dashboard-pager';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { AppTooltip } from '@/ui/app-tooltip';

interface CredentialRow {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly keyMasked: string;
  readonly status: string;
  readonly priority: number;
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly avgLatencyMs: number;
  readonly lastUsedAt: string | null;
}

interface PolicyState {
  readonly rotationStrategy: string;
  readonly chainStrategy: string;
  readonly primaryProviderId: string | null;
  readonly defaultModel: string;
  readonly fallbackProviderId: string | null;
  readonly fallbackModel: string;
  readonly maxRetries: number;
  readonly perKeyRetryLimit: number;
  readonly cooldownDurationSec: number;
  readonly requestTimeoutMs: number;
  readonly globalConcurrencyLimit: number;
}

interface ModelEntry {
  readonly providerId: string;
  readonly modelName: string;
  readonly displayName: string;
  readonly releaseStage: string | null;
  readonly rpmLimit: number | null;
  readonly tpmLimit: number | null;
  readonly rpdLimit: number | null;
  readonly supportsTools: boolean;
  readonly isDefault: boolean;
}

interface LogRow {
  readonly id: string;
  readonly channel: string;
  readonly modelName: string;
  readonly status: string;
  readonly latencyMs: number;
  readonly totalTokens: number;
  readonly toolsExecuted: readonly string[];
  readonly createdAt: string;
}

interface InsightRow {
  readonly id: string;
  readonly query: string;
  readonly channel: string;
  readonly status: string;
  readonly feedbackReason: string | null;
  readonly createdAt: string;
}

interface MasterState {
  readonly provisioned: boolean;
  readonly version: number | null;
  readonly fingerprint: string | null;
}

interface OrgUsageRow {
  readonly organizationId: string | null;
  readonly requests: number;
  readonly tokens: number;
  readonly blocked: number;
}

interface OverviewState {
  readonly credentials: readonly CredentialRow[];
  readonly policy: PolicyState;
  readonly models: readonly ModelEntry[];
  readonly providers: readonly { readonly id: string; readonly name: string; readonly isActive: boolean; readonly supportsChat: boolean }[];
  readonly recentLogs: readonly LogRow[];
  readonly queryInsights: readonly InsightRow[];
  readonly tokenUsageByOrg: readonly OrgUsageRow[];
  readonly master: MasterState;
  readonly stats: {
    readonly totalRequests: number;
    readonly successfulRequests: number;
    readonly failedRequests: number;
    readonly activeKeys: number;
    readonly cooldownKeys: number;
    readonly avgLatencyMs: number;
  };
}

const CREDENTIAL_PAGE_SIZE = 8;
const INSIGHT_PAGE_SIZE = 8;
const LOG_PAGE_SIZE = 10;

const ROTATION_OPTIONS: Readonly<Record<string, string>> = {
  health_aware: 'Health & Cooldown Aware',
  round_robin: 'Round Robin',
  least_used: 'Least Used',
  lowest_error_rate: 'Lowest Error Rate',
  priority_based: 'Priority Based',
  random: 'Random',
};

const CHAIN_OPTIONS: Readonly<Record<string, string>> = {
  fallback: 'Fallback — tries in order',
  round_robin: 'Round Robin — rotates models',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toCredential(value: unknown): CredentialRow | null {
  const row = asRecord(value);
  if (row === null || typeof row.id !== 'string' || typeof row.label !== 'string') return null;
  return {
    id: row.id,
    providerId: asString(row.providerId, 'gemini'),
    label: row.label,
    keyMasked: asString(row.keyMasked, '••••••••••'),
    status: asString(row.status, 'active'),
    priority: asNumber(row.priority, 1),
    totalRequests: asNumber(row.totalRequests),
    successfulRequests: asNumber(row.successfulRequests),
    failedRequests: asNumber(row.failedRequests),
    avgLatencyMs: asNumber(row.avgLatencyMs),
    lastUsedAt: typeof row.lastUsedAt === 'string' ? row.lastUsedAt : null,
  };
}

function toOverview(value: unknown): OverviewState | null {
  const body = asRecord(value);
  if (body === null || !Array.isArray(body.credentials)) return null;
  const policy = asRecord(body.policy);
  const stats = asRecord(body.stats);
  const credentials = body.credentials.map(toCredential).filter((row): row is CredentialRow => row !== null);
  const models = Array.isArray(body.models)
    ? body.models.flatMap((entry) => {
        const row = asRecord(entry);
        if (row === null || typeof row.modelName !== 'string') return [];
        const model: ModelEntry = {
          providerId: asString(row.providerId, ''),
          modelName: row.modelName,
          displayName: asString(row.displayName, row.modelName),
          releaseStage: typeof row.releaseStage === 'string' ? row.releaseStage : null,
          rpmLimit: toNullableNumber(row.rpmLimit),
          tpmLimit: toNullableNumber(row.tpmLimit),
          rpdLimit: toNullableNumber(row.rpdLimit),
          supportsTools: row.supportsTools === true,
          isDefault: row.isDefault === true,
        };
        return [model];
      })
    : [];
  const recentLogs = Array.isArray(body.recentLogs)
    ? body.recentLogs.flatMap((entry): LogRow[] => {
        const row = asRecord(entry);
        if (row === null || typeof row.id !== 'string') return [];
        return [{
          id: row.id,
          channel: asString(row.channel, '-'),
          modelName: asString(row.modelName, '-'),
          status: asString(row.status, '-'),
          latencyMs: asNumber(row.latencyMs),
          totalTokens: asNumber(row.totalTokens),
          toolsExecuted: Array.isArray(row.toolsExecuted) ? row.toolsExecuted.filter((tool): tool is string => typeof tool === 'string') : [],
          createdAt: asString(row.createdAt),
        }];
      })
    : [];
  const queryInsights = Array.isArray(body.queryInsights)
    ? body.queryInsights.flatMap((entry): InsightRow[] => {
        const row = asRecord(entry);
        if (row === null || typeof row.id !== 'string') return [];
        return [{
          id: row.id,
          query: asString(row.query, '-'),
          channel: asString(row.channel, '-'),
          status: asString(row.status, '-'),
          feedbackReason: typeof row.feedbackReason === 'string' ? row.feedbackReason : null,
          createdAt: asString(row.createdAt),
        }];
      })
    : [];
  const masterRecord = asRecord(body.master);
  const masterVersion = masterRecord === null ? null : asNumber(masterRecord.version, Number.NaN);
  const master: MasterState = {
    provisioned: masterRecord !== null && masterRecord.provisioned === true,
    version: masterVersion === null || Number.isNaN(masterVersion) ? null : masterVersion,
    fingerprint: masterRecord !== null && typeof masterRecord.fingerprint === 'string' ? masterRecord.fingerprint : null,
  };
  const tokenUsageByOrg: readonly OrgUsageRow[] = Array.isArray(body.tokenUsageByOrg)
    ? body.tokenUsageByOrg.flatMap((entry): OrgUsageRow[] => {
        const row = asRecord(entry);
        if (row === null) return [];
        return [{
          organizationId: typeof row.organizationId === 'string' ? row.organizationId : null,
          requests: asNumber(row.requests),
          tokens: asNumber(row.tokens),
          blocked: asNumber(row.blocked),
        }];
      })
    : [];
  const providers: OverviewState['providers'] = Array.isArray(body.providers)
    ? body.providers.flatMap((entry) => {
        const row = asRecord(entry);
        if (row === null || typeof row.id !== 'string') return [];
        return [{
          id: row.id,
          name: asString(row.name, row.id),
          isActive: row.isActive !== false,
          supportsChat: row.supportsChat !== false,
        }];
      })
    : [];
  return {
    credentials,
    policy: {
      rotationStrategy: policy === null ? 'health_aware' : asString(policy.rotationStrategy, 'health_aware'),
      chainStrategy: policy === null ? 'fallback' : asString(policy.chainStrategy, 'fallback'),
      primaryProviderId: policy === null || typeof policy.primaryProviderId !== 'string' ? null : policy.primaryProviderId,
      defaultModel: policy === null ? 'gemini-2.5-flash' : asString(policy.defaultModel, 'gemini-2.5-flash'),
      fallbackProviderId: policy === null || typeof policy.fallbackProviderId !== 'string' ? null : policy.fallbackProviderId,
      fallbackModel: policy === null ? 'gemini-2.5-flash' : asString(policy.fallbackModel, 'gemini-2.5-flash'),
      maxRetries: policy === null ? 3 : asNumber(policy.maxRetries, 3),
      perKeyRetryLimit: policy === null ? 2 : asNumber(policy.perKeyRetryLimit, 2),
      cooldownDurationSec: policy === null ? 300 : asNumber(policy.cooldownDurationSec, 300),
      requestTimeoutMs: policy === null ? 60000 : asNumber(policy.requestTimeoutMs, 60000),
      globalConcurrencyLimit: policy === null ? 100 : asNumber(policy.globalConcurrencyLimit, 100),
    },
    models,
    providers,
    recentLogs,
    queryInsights,
    tokenUsageByOrg,
    master,
    stats: {
      totalRequests: stats === null ? 0 : asNumber(stats.totalRequests),
      successfulRequests: stats === null ? 0 : asNumber(stats.successfulRequests),
      failedRequests: stats === null ? 0 : asNumber(stats.failedRequests),
      activeKeys: stats === null ? 0 : asNumber(stats.activeKeys),
      cooldownKeys: stats === null ? 0 : asNumber(stats.cooldownKeys),
      avgLatencyMs: stats === null ? 0 : asNumber(stats.avgLatencyMs),
    },
  };
}

function statusTone(status: string): string {
  if (status === 'active' || status === 'success' || status === 'resolved') return 'border-signal/50 text-signal';
  if (status === 'cooldown' || status === 'open') return 'border-brass/50 text-brass';
  return 'border-error/50 text-error';
}

function formatTime(value: string | null): string {
  if (value === null || value === '') return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString('id-ID');
}

/**
 * Render the AI control-plane panel: stats, credential form, routing policy form, credential pool, insights, and request logs.
 *
 * @param organizationId - Active organization scope for reads and commands.
 * @param command - Workspace command dispatcher posting to `/api/dashboard/integrations`.
 * @returns Control-plane panel; masked keys only, plain values never render.
 */
export function AiManagementPanel({
  organizationId,
  command,
}: {
  readonly organizationId: string;
  readonly command: DashboardCommand;
}) {
  const [overview, setOverview] = useState<OverviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [priority, setPriority] = useState('1');
  const [providerId, setProviderId] = useState('gemini');

  const [rotationStrategy, setRotationStrategy] = useState('health_aware');
  const [chainStrategy, setChainStrategy] = useState('fallback');
  const [primaryProviderId, setPrimaryProviderId] = useState('');
  const [defaultModel, setDefaultModel] = useState('gemini-2.5-flash');
  const [fallbackProviderId, setFallbackProviderId] = useState('');
  const [fallbackModel, setFallbackModel] = useState('gemini-2.5-flash');
  const [maxRetries, setMaxRetries] = useState('3');
  const [perKeyRetryLimit, setPerKeyRetryLimit] = useState('2');
  const [cooldownDurationSec, setCooldownDurationSec] = useState('300');
  const [timeoutSec, setTimeoutSec] = useState('60');
  const [concurrencyLimit, setConcurrencyLimit] = useState('100');

  const [credQuery, setCredQuery] = useState('');
  const [credPage, setCredPage] = useState(1);
  const [insightQuery, setInsightQuery] = useState('');
  const [insightStatus, setInsightStatus] = useState('all');
  const [insightPage, setInsightPage] = useState(1);
  const [logQuery, setLogQuery] = useState('');
  const [logPage, setLogPage] = useState(1);

  const labelId = useId();
  const apiKeyId = useId();
  const priorityId = useId();
  const providerIdInputId = useId();
  const primaryProviderIdInputId = useId();
  const fallbackProviderIdInputId = useId();
  const fallbackModelId = useId();
  const credSearchId = useId();
  const insightSearchId = useId();
  const logSearchId = useId();
  const maxRetriesId = useId();
  const perKeyRetryLimitId = useId();
  const cooldownId = useId();
  const timeoutSecId = useId();
  const concurrencyLimitId = useId();

  const requestSeq = useRef(0);
  const reload = useCallback(async () => {
    const seq = ++requestSeq.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/dashboard/integrations?organizationId=${encodeURIComponent(organizationId)}&view=ai`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = toOverview(await response.json());
      if (parsed === null) throw new Error('Bad payload');
      if (seq !== requestSeq.current) return;
      setOverview(parsed);
      setRotationStrategy(parsed.policy.rotationStrategy);
      setChainStrategy(parsed.policy.chainStrategy);
      setPrimaryProviderId(parsed.policy.primaryProviderId ?? '');
      setDefaultModel(parsed.policy.defaultModel);
      setFallbackProviderId(parsed.policy.fallbackProviderId ?? '');
      setFallbackModel(parsed.policy.fallbackModel);
      setMaxRetries(String(parsed.policy.maxRetries));
      setPerKeyRetryLimit(String(parsed.policy.perKeyRetryLimit));
      setCooldownDurationSec(String(parsed.policy.cooldownDurationSec));
      setTimeoutSec(String(Math.round(parsed.policy.requestTimeoutMs / 1000)));
      setConcurrencyLimit(String(parsed.policy.globalConcurrencyLimit));
    } catch {
      if (seq !== requestSeq.current) return;
      setError('Gagal memuat kontrol AI.');
    } finally {
      if (seq === requestSeq.current) setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  const runCommand = useCallback(async (action: string, payload: Record<string, unknown>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await command(action, payload);
      setNotice(success);
      await reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Perintah AI gagal dijalankan.');
    } finally {
      setBusy(false);
    }
  }, [command, reload]);

  const handleAddKey = () => {
    if (label.trim() === '' || apiKey.trim() === '') {
      setError('Isi label dan API key dulu.');
      return;
    }
    const parsedPriority = Number.parseInt(priority, 10);
    const provider = providerId.trim().toLowerCase() === '' ? 'gemini' : providerId.trim().toLowerCase();
    void runCommand(
      'ai.credential.create',
      { label: label.trim(), apiKey: apiKey.trim(), priority: Number.isFinite(parsedPriority) ? parsedPriority : 1, providerId: provider },
      'Kredensial tersimpan sebagai hash; hanya masked yang tampil.',
    ).then(() => {
      setLabel('');
      setApiKey('');
      setPriority('1');
    });
  };

  const handleSavePolicy = () => {
    const knownProviders = new Map((overview?.providers ?? []).map((provider) => [provider.id, provider] as const));
    const primary = primaryProviderId.trim() === '' ? null : primaryProviderId.trim().toLowerCase();
    const fallback = fallbackProviderId.trim() === '' ? null : fallbackProviderId.trim().toLowerCase();
    if (primary !== null && knownProviders.size > 0 && !knownProviders.has(primary)) {
      setError(`Provider primer tidak dikenal: ${primary}.`);
      return;
    }
    if (primary !== null && knownProviders.get(primary)?.supportsChat === false) {
      setError(`Provider ${primary} tidak mendukung chat; pilih provider chat dari direktori.`);
      return;
    }
    if (fallback !== null && knownProviders.size > 0 && !knownProviders.has(fallback)) {
      setError(`Provider fallback tidak dikenal: ${fallback}.`);
      return;
    }
    if (fallback !== null && knownProviders.get(fallback)?.supportsChat === false) {
      setError(`Provider ${fallback} tidak mendukung chat; pilih provider chat dari direktori.`);
      return;
    }
    const modelOwner = new Map((overview?.models ?? []).map((model) => [model.modelName, model.providerId] as const));
    const defModel = defaultModel.trim() === '' ? 'gemini-2.5-flash' : defaultModel.trim();
    const fbModel = fallbackModel.trim() === '' ? 'gemini-2.5-flash' : fallbackModel.trim();
    const effectivePrimary = primary ?? overview?.policy.primaryProviderId ?? null;
    const defOwner = modelOwner.get(defModel);
    if (effectivePrimary !== null && defOwner !== undefined && defOwner !== '' && defOwner !== effectivePrimary) {
      setError(`Model default ${defModel} milik ${defOwner}, bukan ${effectivePrimary}.`);
      return;
    }
    const fbOwner = modelOwner.get(fbModel);
    const effectiveFallback = fallback ?? effectivePrimary;
    if (fallback !== null && effectiveFallback !== null && fbOwner !== undefined && fbOwner !== '' && fbOwner !== effectiveFallback) {
      setError(`Model fallback ${fbModel} milik ${fbOwner}, bukan ${effectiveFallback}.`);
      return;
    }
    const parsedPerKey = Number.parseInt(perKeyRetryLimit, 10);
    const parsedTimeoutSec = Number.parseInt(timeoutSec, 10);
    const parsedConcurrency = Number.parseInt(concurrencyLimit, 10);
    if (!Number.isFinite(parsedPerKey) || parsedPerKey < 1 || parsedPerKey > 5) {
      setError('Batas retry per key harus 1–5.');
      return;
    }
    if (!Number.isFinite(parsedTimeoutSec) || parsedTimeoutSec < 1 || parsedTimeoutSec > 300) {
      setError('Timeout request harus 1–300 detik.');
      return;
    }
    if (!Number.isFinite(parsedConcurrency) || parsedConcurrency < 1 || parsedConcurrency > 1000) {
      setError('Batas konkurensi global harus 1–1000.');
      return;
    }
    void runCommand(
      'ai.policy.update',
      {
        rotationStrategy,
        chainStrategy,
        primaryProviderId: primary,
        defaultModel: defModel,
        fallbackProviderId: fallback,
        fallbackModel: fbModel,
        maxRetries: Number.parseInt(maxRetries, 10) || 3,
        perKeyRetryLimit: parsedPerKey,
        cooldownDurationSec: Number.parseInt(cooldownDurationSec, 10) || 300,
        requestTimeoutMs: parsedTimeoutSec * 1000,
        globalConcurrencyLimit: parsedConcurrency,
      },
      'Kebijakan routing tersimpan.',
    );
  };

  const handleProvisionMaster = () => {
    if (!window.confirm('Provision master secret baru? Nilai plain tidak pernah ditampilkan.')) return;
    void runCommand('ai.master.provision', {}, 'Master secret diprovision.');
  };

  const handleRotateMaster = (version: number | null) => {
    if (version === null) return;
    if (!window.confirm(`Rotate master secret dari v${version}? Kunci lama dinonaktifkan.`)) return;
    void runCommand('ai.master.provision', { rotate: true, expectedVersion: version }, 'Master secret dirotate.');
  };

  const handleResolveInsight = (id: string) => {
    void runCommand('ai.insight.resolve', { id }, 'Insight ditandai selesai.');
  };

  const filteredCredentials = useMemo(() => {
    const query = credQuery.trim().toLowerCase();
    const rows = overview?.credentials ?? [];
    const matched = query === '' ? [...rows] : rows.filter((row) => row.label.toLowerCase().includes(query) || row.providerId.toLowerCase().includes(query) || row.keyMasked.toLowerCase().includes(query) || row.status.toLowerCase().includes(query));
    matched.sort((a, b) => a.priority - b.priority);
    return matched;
  }, [overview, credQuery]);
  const credPageCount = Math.max(1, Math.ceil(filteredCredentials.length / CREDENTIAL_PAGE_SIZE));
  const safeCredPage = Math.min(credPage, credPageCount);
  const visibleCredentials = filteredCredentials.slice((safeCredPage - 1) * CREDENTIAL_PAGE_SIZE, safeCredPage * CREDENTIAL_PAGE_SIZE);

  const filteredInsights = useMemo(() => {
    const query = insightQuery.trim().toLowerCase();
    const rows = overview?.queryInsights ?? [];
    const byStatus = insightStatus === 'all' ? rows : rows.filter((row) => row.status === insightStatus);
    return query === '' ? byStatus : byStatus.filter((row) => row.query.toLowerCase().includes(query) || row.channel.toLowerCase().includes(query) || row.status.toLowerCase().includes(query));
  }, [overview, insightQuery, insightStatus]);
  const insightPageCount = Math.max(1, Math.ceil(filteredInsights.length / INSIGHT_PAGE_SIZE));
  const safeInsightPage = Math.min(insightPage, insightPageCount);
  const visibleInsights = filteredInsights.slice((safeInsightPage - 1) * INSIGHT_PAGE_SIZE, safeInsightPage * INSIGHT_PAGE_SIZE);

  const filteredLogs = useMemo(() => {
    const query = logQuery.trim().toLowerCase();
    const rows = overview?.recentLogs ?? [];
    return query === '' ? rows : rows.filter((row) => row.channel.toLowerCase().includes(query) || row.modelName.toLowerCase().includes(query) || row.status.toLowerCase().includes(query));
  }, [overview, logQuery]);
  const logPageCount = Math.max(1, Math.ceil(filteredLogs.length / LOG_PAGE_SIZE));
  const safeLogPage = Math.min(logPage, logPageCount);
  const visibleLogs = filteredLogs.slice((safeLogPage - 1) * LOG_PAGE_SIZE, safeLogPage * LOG_PAGE_SIZE);

  const stats = overview?.stats;
  const successRate = stats !== undefined && stats.totalRequests > 0 ? Math.round((stats.successfulRequests / stats.totalRequests) * 100) : 100;
  const modelOptions = overview !== null && overview.models.length > 0 ? overview.models : [{ providerId: 'gemini', modelName: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }];
  const providerOptions = overview !== null && overview.providers.length > 0
    ? overview.providers
    : [{ id: 'gemini', name: 'Google Gemini', isActive: true, supportsChat: true }, { id: 'openrouter', name: 'OpenRouter', isActive: true, supportsChat: true }, { id: 'vercel-gateway', name: 'Vercel AI Gateway', isActive: true, supportsChat: true }];
  const withCurrentModel = (current: string): readonly { readonly providerId: string; readonly modelName: string; readonly displayName: string }[] =>
    modelOptions.some((model) => model.modelName === current)
      ? modelOptions
      : [...modelOptions, { providerId: '', modelName: current, displayName: `${current} (tidak di katalog)` }];
  const defaultModelOptions = withCurrentModel(defaultModel.trim() === '' ? 'gemini-2.5-flash' : defaultModel.trim());
  const fallbackModelOptions = withCurrentModel(fallbackModel.trim() === '' ? 'gemini-2.5-flash' : fallbackModel.trim());
  const activeCredentialProviders = useMemo(() => {
    const active = new Set<string>();
    for (const row of overview?.credentials ?? []) {
      if (row.status === 'active') active.add(row.providerId);
    }
    return active;
  }, [overview]);
  const chainWarnings = useMemo(() => {
    const warnings: string[] = [];
    const policy = overview?.policy;
    if (policy === undefined) return warnings;
    const primary = primaryProviderId.trim() === '' ? (policy.primaryProviderId ?? 'gemini') : primaryProviderId.trim().toLowerCase();
    const fallback = fallbackProviderId.trim() === '' ? null : fallbackProviderId.trim().toLowerCase();
    if (!activeCredentialProviders.has(primary)) warnings.push(`Tidak ada kredensial aktif untuk provider primer ${primary}.`);
    if (fallback !== null && !activeCredentialProviders.has(fallback)) warnings.push(`Tidak ada kredensial aktif untuk provider fallback ${fallback}.`);
    return warnings;
  }, [overview, primaryProviderId, fallbackProviderId, activeCredentialProviders]);

  return (
    <div className="grid items-start gap-4">
      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {notice ? <FormNotice tone="success">{notice}</FormNotice> : null}

      <section aria-label="Statistik AI" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total request', value: (stats?.totalRequests ?? 0).toLocaleString('id-ID'), icon: Activity },
          { label: 'Kunci aktif', value: String(stats?.activeKeys ?? 0), icon: CheckCircle2 },
          { label: 'Kunci cooldown', value: String(stats?.cooldownKeys ?? 0), icon: Clock },
          { label: 'Success rate', value: `${successRate}%`, icon: TrendingUp },
          { label: 'Rata-rata latency', value: `${stats?.avgLatencyMs ?? 0} ms`, icon: Zap },
        ].map((stat) => (
          <div key={stat.label} className="rounded border border-hairline bg-bg-raised p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-paper-faint">{stat.label}</span>
              <stat.icon className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            </div>
            <p className="m-0 mt-1.5 font-sans text-lg font-semibold tracking-tight text-paper">{busy && overview === null ? '…' : stat.value}</p>
          </div>
        ))}
      </section>

      <SectionCard icon={ShieldCheck} title="Master Secret" eyebrow="Envelope">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div>
            <p className="m-0 font-sans text-xs text-paper">
              {overview?.master.provisioned ? `Sudah v${overview.master.version ?? '?'} · ${overview.master.fingerprint ?? '????????'}` : 'Belum diprovision'}
            </p>
            <p className="m-0 mt-1 font-sans text-[11px] leading-relaxed text-paper-faint">Plain tidak pernah ditampilkan; hanya versi dan fingerprint 8 karakter.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {overview?.master.provisioned ? (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => handleRotateMaster(overview.master.version)}>
                <span>Rotate</span>
              </Button>
            ) : (
              <Button type="button" variant="default" size="sm" disabled={busy} onClick={handleProvisionMaster}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Provision</span>
              </Button>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <SectionCard icon={KeyRound} title="Tambah API Key" eyebrow="Kredensial">
          <div className="space-y-3 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={labelId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Label kredensial</Label>
                <Input id={labelId} value={label} onChange={(event) => setLabel(event.target.value)} disabled={busy} placeholder="cth: OpenRouter Prod 1" className="h-8 font-sans text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={providerIdInputId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Provider</Label>
                <DashboardSelect
                  id={providerIdInputId}
                  value={providerId}
                  disabled={busy}
                  placeholder="Pilih provider"
                  ariaLabel="Provider kredensial"
                  onValueChange={(next) => { if (next !== null) setProviderId(next); }}
                >
                  {providerOptions.map((provider) => (
                    <DashboardSelectItem key={provider.id} value={provider.id}>{provider.name}</DashboardSelectItem>
                  ))}
                </DashboardSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={apiKeyId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">API key</Label>
              <Input id={apiKeyId} type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} disabled={busy} placeholder="sk-or-… / AIza…" autoComplete="off" spellCheck={false} className="h-8 font-mono text-xs" />
              <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">Disimpan sebagai hash satu arah; plain tidak pernah tampil lagi.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={priorityId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Prioritas (1–10)</Label>
              <Input id={priorityId} type="number" min={1} max={10} value={priority} onChange={(event) => setPriority(event.target.value)} disabled={busy} className="h-8 font-mono text-xs" />
            </div>
            <Button type="button" variant="default" size="sm" onClick={handleAddKey} disabled={busy || label.trim() === '' || apiKey.trim() === ''} className="w-full">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Simpan kredensial</span>
            </Button>
          </div>
        </SectionCard>

        <SectionCard icon={SlidersHorizontal} title="Kebijakan Rotasi & Failover" eyebrow="Routing">
          <div className="space-y-3 pt-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ai-rotation" className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Strategi rotasi</Label>
                <DashboardSelect
                  id="ai-rotation"
                  value={rotationStrategy}
                  disabled={busy}
                  placeholder="Pilih strategi"
                  ariaLabel="Strategi rotasi kunci"
                  onValueChange={(next) => { if (next !== null) setRotationStrategy(next); }}
                >
                  {Object.entries(ROTATION_OPTIONS).map(([value, text]) => (
                    <DashboardSelectItem key={value} value={value}>{text}</DashboardSelectItem>
                  ))}
                </DashboardSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={primaryProviderIdInputId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Provider primer</Label>
                <DashboardSelect
                  id={primaryProviderIdInputId}
                  value={primaryProviderId}
                  disabled={busy}
                  placeholder="Pilih provider primer"
                  ariaLabel="Provider primer"
                  onValueChange={(next) => { if (next !== null) setPrimaryProviderId(next); }}
                >
                  <DashboardSelectItem value="">Ikut kebijakan tersimpan</DashboardSelectItem>
                  {providerOptions.map((provider) => (
                    <DashboardSelectItem key={provider.id} value={provider.id}>{provider.name}</DashboardSelectItem>
                  ))}
                </DashboardSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-model" className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Model default</Label>
              <DashboardSelect
                id="ai-model"
                value={defaultModel}
                disabled={busy}
                placeholder="Pilih model"
                ariaLabel="Model default"
                onValueChange={(next) => { if (next !== null) setDefaultModel(next); }}
              >
                {defaultModelOptions.map((model) => (
                  <DashboardSelectItem key={model.modelName} value={model.modelName}>{model.displayName}</DashboardSelectItem>
                ))}
              </DashboardSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ai-chain" className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Strategi rantai model</Label>
              <DashboardSelect
                id="ai-chain"
                value={chainStrategy}
                disabled={busy}
                placeholder="Pilih strategi rantai"
                ariaLabel="Strategi rantai model"
                onValueChange={(next) => { if (next !== null) setChainStrategy(next); }}
              >
                {Object.entries(CHAIN_OPTIONS).map(([value, text]) => (
                  <DashboardSelectItem key={value} value={value}>{text}</DashboardSelectItem>
                ))}
              </DashboardSelect>
              <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">Fallback mencoba sesuai urutan saat gagal; Round Robin memutar model awal tiap request untuk menyebar beban.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={maxRetriesId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Retry/entri (1–10)</Label>
                <Input id={maxRetriesId} type="number" min={1} max={10} value={maxRetries} onChange={(event) => setMaxRetries(event.target.value)} disabled={busy} className="h-8 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={perKeyRetryLimitId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Retry per key (1–5)</Label>
                <Input id={perKeyRetryLimitId} type="number" min={1} max={5} value={perKeyRetryLimit} onChange={(event) => setPerKeyRetryLimit(event.target.value)} disabled={busy} className="h-8 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={cooldownId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Cooldown detik (10–3600)</Label>
                <Input id={cooldownId} type="number" min={10} max={3600} value={cooldownDurationSec} onChange={(event) => setCooldownDurationSec(event.target.value)} disabled={busy} className="h-8 font-mono text-xs" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={timeoutSecId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Timeout detik (1–300)</Label>
                <Input id={timeoutSecId} type="number" min={1} max={300} value={timeoutSec} onChange={(event) => setTimeoutSec(event.target.value)} disabled={busy} className="h-8 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={concurrencyLimitId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Konkurensi global (1–1000)</Label>
                <Input id={concurrencyLimitId} type="number" min={1} max={1000} value={concurrencyLimit} onChange={(event) => setConcurrencyLimit(event.target.value)} disabled={busy} className="h-8 font-mono text-xs" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={fallbackProviderIdInputId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Provider fallback</Label>
                <DashboardSelect
                  id={fallbackProviderIdInputId}
                  value={fallbackProviderId}
                  disabled={busy}
                  placeholder="Tanpa fallback"
                  ariaLabel="Provider fallback"
                  onValueChange={(next) => { if (next !== null) setFallbackProviderId(next); }}
                >
                  <DashboardSelectItem value="">Tanpa fallback (satu provider)</DashboardSelectItem>
                  {providerOptions.map((provider) => (
                    <DashboardSelectItem key={provider.id} value={provider.id}>{provider.name}</DashboardSelectItem>
                  ))}
                </DashboardSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fallbackModelId} className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">Model fallback</Label>
                <DashboardSelect
                  id={fallbackModelId}
                  value={fallbackModel}
                  disabled={busy}
                  placeholder="Pilih model fallback"
                  ariaLabel="Model fallback"
                  onValueChange={(next) => { if (next !== null) setFallbackModel(next); }}
                >
                  {fallbackModelOptions.map((model) => (
                    <DashboardSelectItem key={model.modelName} value={model.modelName}>{model.displayName}</DashboardSelectItem>
                  ))}
                </DashboardSelect>
              </div>
            </div>
            <p className="m-0 font-mono text-[11px] leading-relaxed text-paper-faint">
              Rantai aktif ({overview?.policy.chainStrategy ?? 'fallback'}): {overview?.policy.primaryProviderId ?? 'gemini'}/{overview?.policy.defaultModel ?? defaultModel}
              {overview?.policy.fallbackProviderId ? ` → ${overview.policy.fallbackProviderId}/${overview.policy.fallbackModel}` : ' → (tanpa fallback, satu provider)'}
            </p>
            {chainWarnings.map((warning) => (
              <p key={warning} className="m-0 font-sans text-[11px] leading-relaxed text-brass">{warning}</p>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={handleSavePolicy} disabled={busy} className="w-full">
              <span>Simpan kebijakan</span>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard icon={KeyRound} title={`Pool Kredensial (${filteredCredentials.length})`} eyebrow="Keys">
        <div className="space-y-3 pt-1">
          <Input id={credSearchId} value={credQuery} onChange={(event) => { setCredQuery(event.target.value); setCredPage(1); }} disabled={busy} placeholder="Cari label, provider, status, atau masked key…" aria-label="Cari kredensial AI" className="h-8 font-sans text-xs" />
          {visibleCredentials.length === 0 ? (
            <EmptyState compact title={busy ? 'Memuat kredensial…' : 'Belum ada kredensial yang cocok.'} />
          ) : (
            <Table>
              <caption className="sr-only">Pool kredensial AI, hanya masked</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Label / Masked</TableHead>
                  <TableHead scope="col">Provider</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Prioritas</TableHead>
                  <TableHead scope="col">Request ok/err</TableHead>
                  <TableHead scope="col">Latency</TableHead>
                  <TableHead scope="col">Terakhir dipakai</TableHead>
                  <TableHead scope="col"><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCredentials.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="m-0 font-sans text-xs font-medium text-paper">{row.label}</p>
                      <p className="m-0 mt-0.5 font-mono text-[11px] text-paper-faint">{row.keyMasked}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] lowercase">{row.providerId}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusTone(row.status)}`}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-paper">P-{row.priority}</TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.totalRequests} ({row.successfulRequests} ok / {row.failedRequests} err)</TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.avgLatencyMs} ms</TableCell>
                    <TableCell className="font-mono text-[11px] text-paper-faint">{formatTime(row.lastUsedAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <AppTooltip label="Uji kredensial" side="top">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Uji ${row.label}`} disabled={busy} onClick={() => void runCommand('ai.credential.test', { credentialId: row.id }, 'Hasil uji tercatat di penghitung kredensial.')}>
                            <Play className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </AppTooltip>
                        <AppTooltip label={row.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'} side="top">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`${row.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'} ${row.label}`} disabled={busy} onClick={() => void runCommand('ai.credential.toggle', { credentialId: row.id, status: row.status === 'active' ? 'disabled' : 'active' }, 'Status kredensial diperbarui.')}>
                            <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </AppTooltip>
                        <AppTooltip label="Cooldown manual" side="top">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Cooldown ${row.label}`} disabled={busy} onClick={() => void runCommand('ai.credential.toggle', { credentialId: row.id, status: 'cooldown' }, 'Kredensial masuk cooldown.')}>
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </AppTooltip>
                        <AppTooltip label="Hapus" side="top">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus ${row.label}`} disabled={busy} className="hover:text-error" onClick={() => { if (window.confirm(`Hapus kredensial ${row.label}?`)) void runCommand('ai.credential.delete', { credentialId: row.id }, 'Kredensial dihapus.'); }}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </AppTooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DashboardPager
            startIndex={(safeCredPage - 1) * CREDENTIAL_PAGE_SIZE}
            visibleCount={visibleCredentials.length}
            total={filteredCredentials.length}
            page={safeCredPage}
            pageCount={credPageCount}
            noun="kredensial"
            onPageChange={setCredPage}
          />
        </div>
      </SectionCard>

      <SectionCard icon={SlidersHorizontal} title={`Katalog Model (${overview?.models.length ?? 0})`} eyebrow="Limits">
        <div className="space-y-3 pt-1">
          {(overview?.models.length ?? 0) === 0 ? (
            <EmptyState compact title={busy ? 'Memuat model…' : 'Belum ada model terdaftar; tanpa batas (unlimited).'} />
          ) : (
            <Table>
              <caption className="sr-only">Katalog model AI dengan batas RPM/TPM</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Model</TableHead>
                  <TableHead scope="col">Provider</TableHead>
                  <TableHead scope="col">RPM</TableHead>
                  <TableHead scope="col">TPM</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.models ?? []).map((model) => {
                  const unlimited = model.rpmLimit === null && model.tpmLimit === null;
                  return (
                    <TableRow key={model.modelName}>
                      <TableCell>
                        <p className="m-0 font-mono text-[11px] text-paper">{model.modelName}</p>
                        <p className="m-0 mt-0.5 font-sans text-[11px] text-paper-faint">{model.displayName}{model.isDefault ? ' · default' : ''}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] lowercase">{model.providerId === '' ? '−' : model.providerId}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-paper-dim">{model.rpmLimit === null ? '∞' : model.rpmLimit.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="font-mono text-xs text-paper-dim">{model.tpmLimit === null ? '∞' : model.tpmLimit.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusTone(unlimited ? 'success' : 'open')}`}>{unlimited ? 'unlimited' : 'limited'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={KeyRound} title={`Provider (${overview?.providers.length ?? 0})`} eyebrow="Directory">
        <div className="space-y-3 pt-1">
          {(overview?.providers.length ?? 0) === 0 ? (
            <EmptyState compact title={busy ? 'Memuat provider…' : 'Belum ada provider terdaftar.'} />
          ) : (
            <Table>
              <caption className="sr-only">Direktori provider AI control plane</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">ID</TableHead>
                  <TableHead scope="col">Nama</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Chat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.providers ?? []).map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-mono text-[11px] text-paper">{provider.id}</TableCell>
                    <TableCell className="font-sans text-xs text-paper-dim">{provider.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusTone(provider.isActive ? 'success' : 'open')}`}>{provider.isActive ? 'active' : 'inactive'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusTone(provider.supportsChat ? 'success' : 'open')}`}>{provider.supportsChat ? 'chat' : 'embed'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">Provider baru didaftarkan lewat migrasi seed; kredensial tiap provider ditambah di form atas.</p>
        </div>
      </SectionCard>

      <SectionCard icon={TrendingUp} title={`Token per Organisasi (${overview?.tokenUsageByOrg.length ?? 0})`} eyebrow="7 hari">
        <div className="space-y-3 pt-1">
          {(overview?.tokenUsageByOrg.length ?? 0) === 0 ? (
            <EmptyState compact title={busy ? 'Memuat ringkasan…' : 'Belum ada pemakaian dalam 7 hari terakhir.'} />
          ) : (
            <Table>
              <caption className="sr-only">Ringkasan token per organisasi, 7 hari terakhir</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Organisasi</TableHead>
                  <TableHead scope="col">Request</TableHead>
                  <TableHead scope="col">Token</TableHead>
                  <TableHead scope="col">Blocked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.tokenUsageByOrg ?? []).map((row) => (
                  <TableRow key={row.organizationId ?? 'global'}>
                    <TableCell className="font-mono text-[11px] text-paper">{row.organizationId ?? 'global (pra-atribusi)'}</TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.requests.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.tokens.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.blocked.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={Activity} title={`Insight Query (${filteredInsights.length})`} eyebrow="Evaluasi">
        <div className="space-y-3 pt-1">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
            <Input id={insightSearchId} value={insightQuery} onChange={(event) => { setInsightQuery(event.target.value); setInsightPage(1); }} disabled={busy} placeholder="Cari query, channel, status…" aria-label="Cari insight query" className="h-8 font-sans text-xs" />
            <DashboardSelect
              id="ai-insight-status"
              value={insightStatus}
              disabled={busy}
              placeholder="Semua status"
              ariaLabel="Filter status insight"
              onValueChange={(next) => { if (next !== null) { setInsightStatus(next); setInsightPage(1); } }}
            >
              <DashboardSelectItem value="all">Semua status</DashboardSelectItem>
              <DashboardSelectItem value="open">Open</DashboardSelectItem>
              <DashboardSelectItem value="resolved">Resolved</DashboardSelectItem>
            </DashboardSelect>
          </div>
          {visibleInsights.length === 0 ? (
            <EmptyState compact title={busy ? 'Memuat insight…' : 'Belum ada insight yang cocok.'} />
          ) : (
            <Table>
              <caption className="sr-only">Insight query AI</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Waktu</TableHead>
                  <TableHead scope="col">Query</TableHead>
                  <TableHead scope="col">Channel</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Alasan</TableHead>
                  <TableHead scope="col"><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleInsights.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-[11px] text-paper-faint">{formatTime(row.createdAt)}</TableCell>
                    <TableCell className="max-w-60 truncate font-sans text-xs text-paper">
                      <AppTooltip label={row.query} side="top">
                        <span className="block truncate">{row.query}</span>
                      </AppTooltip>
                    </TableCell>
                    <TableCell className="font-sans text-xs capitalize text-paper-dim">{row.channel}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusTone(row.status)}`}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="font-sans text-[11px] text-paper-dim">{row.feedbackReason ?? '-'}</TableCell>
                    <TableCell>
                      {row.status === 'open' ? (
                        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => handleResolveInsight(row.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Resolve</span>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DashboardPager
            startIndex={(safeInsightPage - 1) * INSIGHT_PAGE_SIZE}
            visibleCount={visibleInsights.length}
            total={filteredInsights.length}
            page={safeInsightPage}
            pageCount={insightPageCount}
            noun="insight"
            onPageChange={setInsightPage}
          />
        </div>
      </SectionCard>

      <SectionCard icon={Zap} title={`Log Request (${filteredLogs.length})`} eyebrow="Observability">
        <div className="space-y-3 pt-1">
          <Input id={logSearchId} value={logQuery} onChange={(event) => { setLogQuery(event.target.value); setLogPage(1); }} disabled={busy} placeholder="Cari channel, model, status…" aria-label="Cari log request" className="h-8 font-sans text-xs" />
          {visibleLogs.length === 0 ? (
            <EmptyState compact title={busy ? 'Memuat log…' : 'Belum ada log yang cocok.'} />
          ) : (
            <Table>
              <caption className="sr-only">Log request AI terakhir</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Waktu</TableHead>
                  <TableHead scope="col">Channel</TableHead>
                  <TableHead scope="col">Model</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Latency</TableHead>
                  <TableHead scope="col">Token</TableHead>
                  <TableHead scope="col">Tools</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLogs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-[11px] text-paper-faint">{formatTime(row.createdAt)}</TableCell>
                    <TableCell className="font-sans text-xs capitalize text-paper-dim">{row.channel}</TableCell>
                    <TableCell className="font-mono text-[11px] text-paper">{row.modelName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase ${statusTone(row.status)}`}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.latencyMs} ms</TableCell>
                    <TableCell className="font-mono text-xs text-paper-dim">{row.totalTokens}</TableCell>
                    <TableCell className="font-sans text-[11px] text-paper-dim">{row.toolsExecuted.length > 0 ? row.toolsExecuted.join(', ') : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DashboardPager
            startIndex={(safeLogPage - 1) * LOG_PAGE_SIZE}
            visibleCount={visibleLogs.length}
            total={filteredLogs.length}
            page={safeLogPage}
            pageCount={logPageCount}
            noun="log"
            onPageChange={setLogPage}
          />
        </div>
      </SectionCard>
    </div>
  );
}
