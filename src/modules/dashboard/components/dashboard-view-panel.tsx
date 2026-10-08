'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { parseAsString, useQueryState } from 'nuqs';
import { X } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DataView } from '@/modules/dashboard/components/data-view';
import { FilterControls } from '@/modules/dashboard/components/filter-controls';
import { PanelErrorBoundary } from '@/modules/dashboard/components/shared/panel-error-boundary';
import {
  DashboardFormsGridSkeleton,
  DashboardMediaSkeleton,
  DashboardSplitFormSkeleton,
  DashboardStatsSkeleton,
  DashboardViewSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import {
  VIEW_REGISTRY,
  VIEWS_WITHOUT_RAW_COLLECTIONS,
} from '@/modules/dashboard/components/view-registry';
import type { View } from '@/modules/dashboard/components/dashboard-types';

const InfrastructureControlCenterV2 = dynamic(
  () =>
    import('@/modules/dashboard/components/infrastructure/infrastructure-control-center-v2').then(
      (module) => ({ default: module.InfrastructureControlCenterV2 }),
    ),
  { loading: () => <DashboardViewSkeleton view="configuration" /> },
);
const CustomerManagement = dynamic(
  () =>
    import('@/modules/dashboard/components/customers/customer-management').then((module) => ({
      default: module.CustomerManagement,
    })),
  { loading: () => <DashboardFormsGridSkeleton columns={3} /> },
);
const ContentManager = dynamic(
  () =>
    import('@/modules/dashboard/components/content/content-manager').then((module) => ({
      default: module.ContentManager,
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
const AiManagementPanel = dynamic(
  () =>
    import('@/modules/dashboard/components/settings/ai-management-panel').then((module) => ({
      default: module.AiManagementPanel,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <DashboardStatsSkeleton count={5} />
        <DashboardFormsGridSkeleton columns={2} />
      </div>
    ),
  },
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
const TaxonomyManager = dynamic(
  () =>
    import('@/modules/dashboard/components/editorial/taxonomy-manager').then((module) => ({
      default: module.TaxonomyManager,
    })),
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
  () => import('@/modules/dashboard/components/operations/system-operations-v2').then((module) => ({ default: module.SystemOperationsV2 })),
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
  () => import('@/modules/dashboard/components/trust/trust-moderation-v2').then((module) => ({ default: module.TrustModerationV2 })),
  { loading: () => <DashboardViewSkeleton view="moderation" /> },
);
const AdsManagementPanel = dynamic(
  () =>
    import('@/modules/dashboard/components/ads/ads-management-panel').then((module) => ({
      default: module.AdsManagementPanel,
    })),
  { loading: () => <DashboardViewSkeleton view="ads" /> },
);
/** Views whose payload the server filters from the query string, so `FilterControls` owns real inputs there. */
const SERVER_FILTER_VIEWS: ReadonlySet<View> = new Set<View>([
  'analytics',
  'audit',
  'configuration',
  'publishers',
]);

function hasServerFilters(view: View): boolean {
  return SERVER_FILTER_VIEWS.has(view);
}

/**
 * Render the active dashboard view: page header, error notice, filters, the
 * view's own panel, and its raw collections.
 *
 * @remarks
 * Memoized on purpose. The active view is by far the largest subtree in the
 * dashboard (roughly 1,500 DOM nodes of charts and tables once data lands), and
 * the workspace re-renders on every unrelated state change: the busy flag
 * around a refresh, the collapsed sidebar, the org switch handshake. Callers
 * therefore pass `showSkeleton` instead of `busy`, so a refresh that already has
 * data leaves every prop identical and this subtree bails out entirely.
 */
const DashboardViewPanel = memo(function DashboardViewPanel({
  view,
  displayName,
  data,
  organizationId,
  permissions,
  error,
  showSkeleton,
  currentPage,
  command,
  onDismissError,
  onFilterApply,
  onPageChange,
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
  /** True only while the first payload for this scope is still in flight. */
  readonly showSkeleton: boolean;
  readonly currentPage: number;
  readonly command: DashboardCommand;
  readonly onDismissError: () => void;
  readonly onFilterApply: (query: string) => void;
  readonly onPageChange: (page: number) => void;
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

  if (view === 'dashboard') {
    return (
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1500px]">
          <PanelErrorBoundary name="Dashboard V2">
            <DataView
              view={view}
              displayName={displayName}
              data={data}
              currentPage={currentPage}
              onPageChange={onPageChange}
              onRefresh={onRefresh}
              command={command}
              onSelectView={onSelectView}
            />
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

        {hasServerFilters(view) ? (
          <FilterControls view={view} data={data} onApply={onFilterApply} />
        ) : null}

        <PanelErrorBoundary key={`forms:${organizationId}:${view}`} name={metadata.title}>
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
            <TaxonomyManager data={data} command={command} organizationId={organizationId} />
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
            />
          ) : null}
          {view === 'operations' ? <SystemOperationsV2 data={data} /> : null}
          {view === 'moderation' ? <TrustModerationV2 organizationId={organizationId} /> : null}
          {view === 'ads' ? <AdsManagementPanel organizationId={organizationId} /> : null}
          {view === 'ai' ? (
            <AiManagementPanel organizationId={organizationId} command={command} />
          ) : null}
          {view === 'customers' ? (
            <CustomerManagement command={command} organizationId={organizationId} />
          ) : null}
          {view === 'content' ? <ContentManager /> : null}
        </PanelErrorBoundary>

        {VIEWS_WITHOUT_RAW_COLLECTIONS.has(view) ? null : showSkeleton ? (
          <DashboardViewSkeleton view={view} />
        ) : (
          <PanelErrorBoundary
            key={`data:${organizationId}:${view}`}
            name={`${metadata.title} — data`}
          >
            <DataView
              view={view}
              displayName={displayName}
              data={data}
              currentPage={currentPage}
              onPageChange={onPageChange}
              onRefresh={onRefresh}
              command={command}
              onSelectView={onSelectView}
              organizationId={organizationId}
              auditNextCursor={auditNextCursor}
              onLoadMoreAudit={onLoadMoreAudit}
            />
          </PanelErrorBoundary>
        )}
      </div>
    </main>
  );
});

export { DashboardViewPanel, VIEWS_WITHOUT_RAW_COLLECTIONS };
