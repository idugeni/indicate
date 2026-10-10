'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { ChartTip } from '@/modules/dashboard/components/shared/chart-tip';
import { cachedJsonGet } from '@/modules/dashboard/components/shared/endpoint-cache';

interface DeploymentOverview {
  readonly supabaseProjectRef: string;
  readonly cloudflareAccountId: string;
  readonly vercelProjectId: string;
  readonly vercelTeamId: string;
  readonly vercelProductionTargetHostname: string;
  readonly r2AccountId: string;
  readonly r2BucketName: string;
  readonly upstashRedisResourceId: string;
  readonly version: number;
}

interface PublicationOverview {
  readonly maxAttempts: number;
  readonly retryDelaysSeconds: readonly number[];
  readonly leaseSeconds: number;
  readonly batchSize: number;
  readonly functionDeadlineSeconds: number;
  readonly version: number;
}

interface WebhookOverview {
  readonly freshnessSeconds: number;
  readonly replayRetentionSeconds: number;
  readonly version: number;
}

interface CacheOverview {
  readonly publicCacheSeconds: number;
  readonly cacheVersion: number;
  readonly version: number;
}

interface RateLimitOverview {
  readonly endpointClass: string;
  readonly allowance: number;
  readonly windowSeconds: number;
  readonly version: number;
}

interface PoliciesOverview {
  readonly deployment: DeploymentOverview | null;
  readonly publication: PublicationOverview | null;
  readonly webhook: WebhookOverview | null;
  readonly cache: CacheOverview | null;
  readonly rateLimits: readonly RateLimitOverview[];
}

function DefinitionList({ entries }: { readonly entries: readonly (readonly [string, string])[] }) {
  return (
    <dl className="m-0 grid gap-x-5 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([term, value]) => (
        <div key={term} className="flex min-w-0 items-baseline justify-between gap-2 border-b border-hairline/50 py-1 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
          <dt className="min-w-0 truncate font-mono text-[10px] uppercase tracking-wider text-paper-faint">{term}</dt>
          <dd className="m-0 min-w-0 shrink">
            <ChartTip tip={value}>
              <span className="block max-w-[16rem] truncate font-mono text-[11px] tabular-nums text-paper">{value}</span>
            </ChartTip>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PolicyGroup({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="rounded border border-hairline bg-bg/40 p-2">
      <h4 className="m-0 mb-1 font-mono text-[10px] font-medium uppercase tracking-wider text-brass">{label}</h4>
      {children}
    </div>
  );
}

export function PolicyOverviewSection() {
  const [policies, setPolicies] = useState<PoliciesOverview | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoadingTransition] = useTransition();

  const loadSeq = useRef(0);
  const reload = useCallback(() => {
    const seq = ++loadSeq.current;
    startLoadingTransition(async () => {
      setError(null);
      try {
        const body = (await cachedJsonGet('runtime-config', '/api/dashboard/runtime-config')) as { policies?: PoliciesOverview };
        if (seq !== loadSeq.current) return;
        if (body.policies === undefined) throw new Error('missing policies');
        setPolicies(body.policies);
        setForbidden(false);
      } catch (loadError) {
        if (seq !== loadSeq.current) return;
        if ((loadError as { readonly status?: number }).status === 404) {
          setForbidden(true);
          setPolicies(null);
          return;
        }
        setError('Gagal memuat ringkasan kebijakan platform.');
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void reload();
    });
    return () => { cancelled = true; };
  }, [reload]);

  if (forbidden) {
    return (
      <section aria-label="Ringkasan kebijakan platform" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-xs text-paper-faint">Panel ini membutuhkan izin platform.runtime_config.manage.</p>
      </section>
    );
  }

  return (
    <section aria-label="Ringkasan kebijakan platform" className="rounded-lg border border-hairline bg-bg-raised p-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] tabular-nums text-brass">05</span>
        <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
          <SlidersHorizontal className="h-4 w-4 text-brass" aria-hidden="true" />
          Kebijakan platform
        </h3>
        {policies === null ? null : (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => reload()}
            disabled={isLoading}
            className="ml-auto font-mono text-[11px] text-paper-dim hover:text-paper"
          >
            {isLoading ? 'Memuat…' : 'Muat ulang'}
          </Button>
        )}
      </div>
      <p className="m-0 mt-1 font-mono text-[11px] text-paper-faint">
        Hanya baca · perubahan lewat migrasi atau panel masing-masing.
      </p>

      {error ? <FormNotice tone="error">{error}</FormNotice> : null}
      {policies === null ? (
        <p className="m-0 mt-4 font-mono text-xs text-paper-faint">{isLoading ? 'Memuat…' : 'Menunggu data kebijakan.'}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {policies.deployment === null ? null : (
            <PolicyGroup label={`Deployment · v${policies.deployment.version}`}>
              <DefinitionList
                entries={[
                  ['Supabase ref', policies.deployment.supabaseProjectRef],
                  ['Cloudflare account', policies.deployment.cloudflareAccountId],
                  ['Vercel project', policies.deployment.vercelProjectId],
                  ['Vercel team', policies.deployment.vercelTeamId],
                  ['Production host', policies.deployment.vercelProductionTargetHostname],
                  ['R2 bucket', `${policies.deployment.r2BucketName}`],
                  ['Redis resource', policies.deployment.upstashRedisResourceId],
                ]}
              />
            </PolicyGroup>
          )}
          {policies.publication === null ? null : (
            <PolicyGroup label={`Publikasi · v${policies.publication.version}`}>
              <DefinitionList
                entries={[
                  ['Max attempts', String(policies.publication.maxAttempts)],
                  ['Retry delays (s)', policies.publication.retryDelaysSeconds.join(', ')],
                  ['Lease (s)', String(policies.publication.leaseSeconds)],
                  ['Batch', String(policies.publication.batchSize)],
                  ['Deadline fungsi (s)', String(policies.publication.functionDeadlineSeconds)],
                ]}
              />
            </PolicyGroup>
          )}
          {policies.webhook === null ? null : (
            <PolicyGroup label={`Webhook · v${policies.webhook.version}`}>
              <DefinitionList
                entries={[
                  ['Freshness (s)', String(policies.webhook.freshnessSeconds)],
                  ['Retensi replay (s)', String(policies.webhook.replayRetentionSeconds)],
                ]}
              />
            </PolicyGroup>
          )}
          {policies.cache === null ? null : (
            <PolicyGroup label={`Cache · v${policies.cache.version}`}>
              <DefinitionList
                entries={[
                  ['Public cache (s)', String(policies.cache.publicCacheSeconds)],
                  ['Cache version', String(policies.cache.cacheVersion)],
                ]}
              />
            </PolicyGroup>
          )}
          <PolicyGroup label="Rate limits">
            {policies.rateLimits.length === 0 ? (
              <EmptyState title="Belum ada batas laju." description="Data akan tampil di sini setelah tersedia." />
            ) : (
              <DefinitionList
                entries={policies.rateLimits.map(
                  (row) =>
                    [`${row.endpointClass} · v${row.version}`, `${row.allowance} / ${row.windowSeconds}s`] as const,
                )}
              />
            )}
          </PolicyGroup>
        </div>
      )}
    </section>
  );
}
