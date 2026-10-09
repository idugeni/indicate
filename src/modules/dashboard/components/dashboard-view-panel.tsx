'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { parseAsString, useQueryState } from 'nuqs';
import { SearchX, X } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DashboardV2CommandCenter } from '@/modules/dashboard/components/dashboard-v2-command-center';
import { NetworkIntelligenceV2 } from '@/modules/dashboard/components/analytics/network-intelligence-v2';
import { isAnalyticsProjection } from '@/modules/dashboard/components/data-view-format';
import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { PanelErrorBoundary } from '@/modules/dashboard/components/shared/panel-error-boundary';
import {
  DashboardFormsGridSkeleton,
  DashboardMediaSkeleton,
  DashboardSplitFormSkeleton,
  DashboardViewSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import { canAccessView, VIEW_REGISTRY } from '@/modules/dashboard/components/view-registry';
import type { View } from '@/modules/dashboard/components/dashboard-types';

const InfrastructureControlCenterV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/infrastructure/infrastructure-control-center-v2').then(
      (module) => ({ default: module.InfrastructureControlCenterV2 }),
    ),
  { loading: () => <DashboardViewSkeleton view="configuration" /> },
);
const CustomerOperationsV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/customers/customer-operations-v2').then((module) => ({
      default: module.CustomerOperationsV2,
    })),
  { loading: () => <DashboardViewSkeleton view="customers" /> },
);
const PublicWebContentV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/content/public-web-content-v2').then((module) => ({
      default: module.PublicWebContentV2,
    })),
  { loading: () => <DashboardViewSkeleton view="content" /> },
);
const EditorialWorkspaceV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/editorial/editorial-workspace-v2').then((module) => ({
      default: module.EditorialWorkspaceV2,
    })),
  { loading: () => <DashboardSplitFormSkeleton /> },
);
const AccessIntegrationsV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/settings/access-integrations-v2').then((module) => ({
      default: module.AccessIntegrationsV2,
    })),
  { loading: () => <DashboardViewSkeleton view="settings" /> },
);
const AiControlCenterV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/settings/ai-control-center-v2').then((module) => ({
      default: module.AiControlCenterV2,
    })),
  { loading: () => <DashboardViewSkeleton view="ai" /> },
);
const MediaLibraryV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/publishing/media-library-v2').then((module) => ({
      default: module.MediaLibraryV2,
    })),
  { loading: () => <DashboardMediaSkeleton /> },
);
const PublisherNetworkV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/editorial/publisher-network-v2').then((module) => ({
      default: module.PublisherNetworkV2,
    })),
  { loading: () => <DashboardViewSkeleton view="publishers" /> },
);
const TaxonomyControlCenterV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/editorial/taxonomy-control-center-v2').then(
      (module) => ({
        default: module.TaxonomyControlCenterV2,
      }),
    ),
  { loading: () => <DashboardViewSkeleton view="taxonomy" /> },
);
const ContentLibraryV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/editorial/content-library-v2').then((module) => ({
      default: module.ContentLibraryV2,
    })),
  { loading: () => <DashboardViewSkeleton view="articles" /> },
);
const DistributionControlV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/publishing/distribution-control-v2').then((module) => ({
      default: module.DistributionControlV2,
    })),
  { loading: () => <DashboardFormsGridSkeleton columns={2} /> },
);
const LiveResultsV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/publishing/live-results-v2').then((module) => ({
      default: module.LiveResultsV2,
    })),
  { loading: () => <DashboardViewSkeleton view="published" /> },
);
const SystemOperationsV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/operations/system-operations-v2').then((module) => ({
      default: module.SystemOperationsV2,
    })),
  { loading: () => <DashboardViewSkeleton view="operations" /> },
);
const AuditSecurityV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/audit/audit-security-v2').then((module) => ({
      default: module.AuditSecurityV2,
    })),
  { loading: () => <DashboardViewSkeleton view="audit" /> },
);
const MonetizationControlCenterV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/billing/monetization-control-center-v2').then(
      (module) => ({ default: module.MonetizationControlCenterV2 }),
    ),
  { loading: () => <DashboardViewSkeleton view="billing" /> },
);
const TrustModerationV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/trust/trust-moderation-v2').then((module) => ({
      default: module.TrustModerationV2,
    })),
  { loading: () => <DashboardViewSkeleton view="moderation" /> },
);
const AdsControlCenterV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/ads/ads-control-center-v2').then((module) => ({
      default: module.AdsControlCenterV2,
    })),
  { loading: () => <DashboardViewSkeleton view="ads" /> },
);
/**
 * Render the active dashboard view through its dedicated V2 surface, with
 * shared error handling and server-filter callbacks.
 *
 * @remarks
 * Memoized on purpose. The active view is by far the largest subtree in the
 * dashboard (roughly 1,500 DOM nodes of charts and tables once data lands), and
 * the workspace re-renders on every unrelated state change: the busy flag
 * around a refresh, the collapsed sidebar, the org switch handshake. Callers
 * so refreshes that already have data leave the expensive V2 surface stable.
 */
const SELF_FETCHING_V2_VIEWS: ReadonlySet<View> = new Set<View>([
  'content',
  'billing',
  'moderation',
  'ai',
  'ads',
  'customers',
]);

const DashboardViewPanel = memo(function DashboardViewPanel({
  view,
  displayName,
  data,
  organizationId,
  permissions,
  error,
  command,
  onDismissError,
  onFilterApply,
  onRefresh,
  onSelectView,
  auditNextCursor,
  onLoadMoreAudit,
  articlesNextCursor,
  articlesTotal,
  onLoadMoreArticles,
  crossOrg,
}: {
  readonly view: View;
  readonly displayName: string;
  readonly data: unknown;
  readonly organizationId: string;
  readonly permissions: ReadonlySet<string>;
  readonly error: string | null;
  readonly command: DashboardCommand;
  readonly onDismissError: () => void;
  readonly onFilterApply: (query: string) => void;
  readonly onRefresh: () => void;
  readonly onSelectView: (view: View) => void;
  readonly auditNextCursor?: string | null | undefined;
  readonly onLoadMoreAudit?: (() => void) | undefined;
  readonly articlesNextCursor?: string | null | undefined;
  readonly articlesTotal?: number | undefined;
  readonly onLoadMoreArticles?:
    | (() => Promise<{
        readonly loaded: number;
        readonly total: number;
        readonly nextCursor: string | null;
      } | null>)
    | undefined;
  readonly crossOrg?: boolean | undefined;
}) {
  const metadata = VIEW_REGISTRY[view];

  /**
   * Artikel yang sedang diubah di Tulis Berita; datang dari Kelola Artikel.
   * Disimpan di URL agar tautan `?view=editorial&editArticle=<id>` bisa dibagikan
   * dan tombol kembali browser keluar dari mode ubah dengan wajar.
   */
  const [editArticleId, setEditArticleId] = useQueryState(
    'editArticle',
    parseAsString.withOptions({ scroll: false, history: 'replace' }),
  );
  const exitEdit = () => {
    void setEditArticleId(null);
    onSelectView('articles');
  };

  if (!canAccessView(view, permissions)) {
    return (
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1500px]">
          <EmptyState
            title="Akses tidak tersedia"
            description="Akun ini tidak memiliki izin untuk membuka area tersebut. Minta administrator memberikan izin yang sesuai."
            icon={<SearchX className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
            action={<Button type="button" variant="outline" onClick={() => onSelectView('dashboard')}>Kembali ke Command Center</Button>}
          />
        </div>
      </main>
    );
  }

  if (view === 'dashboard') {
    return (
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1500px]">
          <PanelErrorBoundary name="Dashboard V2">
            {data === null || data === undefined ? (
              error !== null ? (
                <EmptyState
                  title="Command Center belum tersedia"
                  description={error}
                  icon={<SearchX className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
                  action={<Button type="button" variant="outline" onClick={onRefresh}>Coba lagi</Button>}
                />
              ) : <DashboardViewSkeleton view="dashboard" />
            ) : (() => {
              const source = typeof data === 'object' && data !== null
                ? data as Record<string, unknown>
                : {};
              const jobs = typeof source.jobsByState === 'object' && source.jobsByState !== null
                ? source.jobsByState as Record<string, unknown>
                : {};
              const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 0;
              return (
                <DashboardV2CommandCenter
                  displayName={displayName}
                  dashboard={{
                    activeDomains: number(source.activeDomains),
                    activeSubdomains: number(source.activeSubdomains),
                    activeSites: number(source.activeSites),
                    activeArticles: number(source.activeArticles),
                    archivedArticles: number(source.archivedArticles),
                    jobsByState: {
                      queued: number(jobs.queued),
                      processing: number(jobs.processing),
                      published: number(jobs.published),
                      failed: number(jobs.failed),
                      retrying: number(jobs.retrying),
                      unpublished: number(jobs.unpublished),
                    },
                    successfulSiteOutcomes: number(source.successfulSiteOutcomes),
                    failedSiteOutcomes: number(source.failedSiteOutcomes),
                  }}
                  analytics={isAnalyticsProjection(source.analytics) ? source.analytics : null}
                  onSelectView={onSelectView}
                />
              );
            })()}
          </PanelErrorBoundary>
        </div>
      </main>
    );
  }

  return (
    <main className="min-w-0 flex-1">
      <div
        className={`mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-10 ${view === 'publishers' ? 'space-y-4 pt-4' : 'space-y-6 pt-6'}`}
      >
        {error ? (
          <Alert
            variant="destructive"
            className="flex animate-in items-center gap-3 border-l-2 border-error bg-error/[0.06] px-4 py-3 fade-in slide-in-from-top-2 duration-200"
          >
            <AlertDescription className="flex-1 font-sans text-sm text-paper">
              {error}
            </AlertDescription>
            <AlertAction className="top-1/2 -translate-y-1/2">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={onDismissError}
                aria-label="Tutup pesan kesalahan"
                className="text-paper-faint hover:text-paper"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        <PanelErrorBoundary key={`forms:${organizationId}:${view}`} name={metadata.title}>
          {!SELF_FETCHING_V2_VIEWS.has(view) && (data === null || data === undefined) ? (
            error !== null ? (
              <EmptyState
                title={metadata.title + ' belum tersedia'}
                description="Data belum berhasil dimuat. Coba muat ulang sebelum melanjutkan pekerjaan."
                icon={<SearchX className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
                action={<Button type="button" variant="outline" onClick={onRefresh}>Coba lagi</Button>}
              />
            ) : <DashboardViewSkeleton view={view} />
          ) : (
          <>
          {view === 'analytics' ? (
            isAnalyticsProjection(data) ? (
              <NetworkIntelligenceV2 data={data} onFilterApply={onFilterApply} />
            ) : (
              <EmptyState
                title="Telemetry belum siap ditampilkan"
                description="Respons analitik belum memenuhi kontrak data V2. Muat ulang untuk mengambil proyeksi yang valid; data mentah tidak ditampilkan sebagai pengganti."
                icon={<SearchX className="h-5 w-5 text-paper-faint" aria-hidden="true" />}
                action={<Button type="button" variant="outline" onClick={onRefresh}>Muat ulang analitik</Button>}
              />
            )
          ) : null}
          {view === 'publishers' ? (
            <PublisherNetworkV2
              data={data}
              command={command}
              organizationId={organizationId}
              onFilterApply={onFilterApply}
            />
          ) : null}
          {view === 'editorial' ? (
            <EditorialWorkspaceV2
              data={data}
              onSubmit={(payload) => command('article.create', payload, { refresh: true })}
              command={command}
              organizationId={organizationId}
              editArticleId={editArticleId ?? undefined}
              onExitEdit={exitEdit}
            />
          ) : null}
          {view === 'taxonomy' ? (
            <TaxonomyControlCenterV2
              data={data}
              command={command}
              organizationId={organizationId}
            />
          ) : null}
          {view === 'articles' ? (
            <ContentLibraryV2
              data={data}
              command={command}
              onFilterApply={onFilterApply}
              articlesNextCursor={articlesNextCursor}
              articlesTotal={articlesTotal}
              onLoadMoreArticles={onLoadMoreArticles}
              crossOrg={crossOrg}
              onEditArticle={(articleId) => {
                void setEditArticleId(articleId);
                onSelectView('editorial');
              }}
            />
          ) : null}
          {view === 'configuration' ? (
            <InfrastructureControlCenterV2
              data={data}
              command={command}
              organizationId={organizationId}
              onFilterApply={onFilterApply}
            />
          ) : null}
          {view === 'media' ? (
            <MediaLibraryV2 data={data} command={command} organizationId={organizationId} />
          ) : null}
          {view === 'published' ? (
            <LiveResultsV2 data={data} organizationId={organizationId} />
          ) : null}
          {view === 'publishing' ? <DistributionControlV2 data={data} command={command} /> : null}
          {view === 'settings' ? (
            <AccessIntegrationsV2 data={data} command={command} permissions={permissions} />
          ) : null}
          {view === 'billing' ? (
            <MonetizationControlCenterV2
              organizationId={organizationId}
              permissions={[...permissions]}
            />
          ) : null}
          {view === 'audit' ? (
            <AuditSecurityV2
              data={data}
              auditNextCursor={auditNextCursor}
              onLoadMoreAudit={onLoadMoreAudit}
              onFilterApply={onFilterApply}
            />
          ) : null}
          {view === 'operations' ? <SystemOperationsV2 data={data} /> : null}
          {view === 'moderation' ? <TrustModerationV2 organizationId={organizationId} /> : null}
          {view === 'ads' ? <AdsControlCenterV2 organizationId={organizationId} /> : null}
          {view === 'ai' ? (
            <AiControlCenterV2 organizationId={organizationId} command={command} />
          ) : null}
          {view === 'customers' ? (
            <CustomerOperationsV2 organizationId={organizationId} command={command} />
          ) : null}
          {view === 'content' ? <PublicWebContentV2 /> : null}
          </>
          )}
        </PanelErrorBoundary>
      </div>
    </main>
  );
});

export { DashboardViewPanel };
