'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';
import { ChartTip } from '@/modules/dashboard/components/shared/chart-tip';

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
    <dl className="m-0 grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {entries.map(([term, value]) => (
        <div key={term} className="min-w-0">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-paper-faint">{term}</dt>
          <dd className="m-0 mt-0.5 min-w-0">
            <ChartTip tip={value}>
              <span className="block truncate font-mono text-xs tabular-nums text-paper">{value}</span>
            </ChartTip>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PolicyOverviewSection() {
  const [policies, setPolicies] = useState<PoliciesOverview | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoadingTransition] = useTransition();

  const reload = useCallback(() => {
    startLoadingTransition(async () => {
      setError(null);
      try {
        const response = await fetch('/api/dashboard/runtime-config', { cache: 'no-store' });
        if (response.status === 404) {
          setForbidden(true);
          setPolicies(null);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as { policies?: PoliciesOverview };
        if (body.policies === undefined) throw new Error('missing policies');
        setPolicies(body.policies);
        setForbidden(false);
      } catch {
        setError('Gagal memuat ringkasan kebijakan platform.');
      }
    });
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => reload());
  }, [reload]);

  if (forbidden) {
    return (
      <section aria-label="Ringkasan kebijakan platform" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-xs text-paper-faint">Panel ini membutuhkan izin platform.runtime_config.manage.</p>
      </section>
    );
  }

  return (
    <section aria-label="Ringkasan kebijakan platform" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
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
        <div className="mt-4 space-y-5">
          {policies.deployment === null ? null : (
            <div>
              <h4 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
                Deployment · v{policies.deployment.version}
              </h4>
              <div className="mt-2">
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
              </div>
            </div>
          )}
          {policies.publication === null ? null : (
            <div>
              <h4 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
                Publikasi · v{policies.publication.version}
              </h4>
              <div className="mt-2">
                <DefinitionList
                  entries={[
                    ['Max attempts', String(policies.publication.maxAttempts)],
                    ['Retry delays (s)', policies.publication.retryDelaysSeconds.join(', ')],
                    ['Lease (s)', String(policies.publication.leaseSeconds)],
                    ['Batch', String(policies.publication.batchSize)],
                    ['Deadline fungsi (s)', String(policies.publication.functionDeadlineSeconds)],
                  ]}
                />
              </div>
            </div>
          )}
          {policies.webhook === null ? null : (
            <div>
              <h4 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
                Webhook · v{policies.webhook.version}
              </h4>
              <div className="mt-2">
                <DefinitionList
                  entries={[
                    ['Freshness (s)', String(policies.webhook.freshnessSeconds)],
                    ['Retensi replay (s)', String(policies.webhook.replayRetentionSeconds)],
                  ]}
                />
              </div>
            </div>
          )}
          {policies.cache === null ? null : (
            <div>
              <h4 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
                Cache · v{policies.cache.version}
              </h4>
              <div className="mt-2">
                <DefinitionList
                  entries={[
                    ['Public cache (s)', String(policies.cache.publicCacheSeconds)],
                    ['Cache version', String(policies.cache.cacheVersion)],
                  ]}
                />
              </div>
            </div>
          )}
          <div>
            <h4 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-dim">
              Rate limits
            </h4>
            {policies.rateLimits.length === 0 ? (
              <EmptyState title="Belum ada batas laju." description="Data akan tampil di sini setelah tersedia." />
            ) : (
              <div className="mt-2">
                <DefinitionList
                  entries={policies.rateLimits.map(
                    (row) =>
                      [`${row.endpointClass} · v${row.version}`, `${row.allowance} / ${row.windowSeconds}s`] as const,
                  )}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
