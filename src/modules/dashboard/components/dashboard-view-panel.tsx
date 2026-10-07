'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { parseAsString, useQueryState } from 'nuqs';
import { Globe, KeyRound, LogIn, Palette, Plug, UserRound, X, Zap } from 'lucide-react';
import type { DashboardCommand } from '@/modules/dashboard/command';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataView } from '@/modules/dashboard/components/data-view';
import { FilterControls } from '@/modules/dashboard/components/filter-controls';
import { PanelErrorBoundary } from '@/modules/dashboard/components/shared/panel-error-boundary';
import {
  DashboardFormSkeleton,
  DashboardFormsGridSkeleton,
  DashboardMediaSkeleton,
  DashboardSplitFormSkeleton,
  DashboardStatsSkeleton,
  DashboardViewSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import type { EmailStatus } from '@/modules/dashboard/components/settings/integration-settings';
import { VIEW_REGISTRY, VIEWS_WITHOUT_RAW_COLLECTIONS } from '@/modules/dashboard/components/view-registry';
import type { View } from '@/modules/dashboard/components/dashboard-types';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

const ConfigurationPanel = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/configuration-panel').then((module) => ({ default: module.ConfigurationPanel })),
  { loading: () => <DashboardFormsGridSkeleton columns={3} /> },
);
const AccessManagementForm = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/access-management-form').then((module) => ({ default: module.AccessManagementForm })),
  { loading: () => <DashboardFormsGridSkeleton columns={2} /> },
);
const SiteSettingsForm = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/site-settings-form').then((module) => ({ default: module.SiteSettingsForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const CachePurgeForm = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/cache-purge-form').then((module) => ({ default: module.CachePurgeForm })),
  { loading: () => <DashboardSplitFormSkeleton /> },
);
const CustomerManagement = dynamic(
  () => import('@/modules/dashboard/components/customers/customer-management').then((module) => ({ default: module.CustomerManagement })),
  { loading: () => <DashboardFormsGridSkeleton columns={3} /> },
);
const ContentManager = dynamic(
  () => import('@/modules/dashboard/components/content/content-manager').then((module) => ({ default: module.ContentManager })),
  { loading: () => <DashboardViewSkeleton view="content" /> },
);
const ArticleCreateForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/editorial-form').then((module) => ({ default: module.ArticleCreateForm })),
  { loading: () => <DashboardSplitFormSkeleton /> },
);
const ArticleDistributeForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/article-distribute-form').then((module) => ({ default: module.ArticleDistributeForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const IntegrationSettings = dynamic(
  () => import('@/modules/dashboard/components/settings/integration-settings').then((module) => ({ default: module.IntegrationSettings })),
  { loading: () => <DashboardFormsGridSkeleton columns={2} /> },
);
const AccessKeySettings = dynamic(
  () => import('@/modules/dashboard/components/settings/access-key-settings').then((module) => ({ default: module.AccessKeySettings })),
  { loading: () => <DashboardFormSkeleton /> },
);
const AiManagementPanel = dynamic(
  () => import('@/modules/dashboard/components/settings/ai-management-panel').then((module) => ({ default: module.AiManagementPanel })),
  {
    loading: () => (
      <div className="space-y-4">
        <DashboardStatsSkeleton count={5} />
        <DashboardFormsGridSkeleton columns={2} />
      </div>
    ),
  },
);
function selectEmailStatus(data: unknown): EmailStatus | null {
  if (typeof data !== 'object' || data === null || !('email' in data)) return null;
  const email = (data as { readonly email?: unknown }).email;
  if (typeof email !== 'object' || email === null) return null;
  const status = email as { readonly configured?: unknown; readonly defaultFrom?: unknown; readonly webhook?: unknown };
  if (typeof status.configured !== 'boolean' || typeof status.webhook !== 'boolean') return null;
  if (status.defaultFrom !== null && typeof status.defaultFrom !== 'string') return null;
  return { configured: status.configured, defaultFrom: status.defaultFrom, webhook: status.webhook };
}
const MediaLibrary = dynamic(
  () => import('@/modules/dashboard/components/publishing/media-library').then((module) => ({ default: module.MediaLibrary })),
  { loading: () => <DashboardMediaSkeleton /> },
);
const PublisherForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/publisher-form').then((module) => ({ default: module.PublisherForm })),
  { loading: () => <DashboardFormsGridSkeleton columns={2} /> },
);
const TaxonomyManager = dynamic(
  () => import('@/modules/dashboard/components/editorial/taxonomy-manager').then((module) => ({ default: module.TaxonomyManager })),
  { loading: () => <DashboardViewSkeleton view="taxonomy" /> },
);
const ArticleManager = dynamic(
  () => import('@/modules/dashboard/components/editorial/article-manager').then((module) => ({ default: module.ArticleManager })),
  { loading: () => <DashboardViewSkeleton view="articles" /> },
);
const PublishingForm = dynamic(
  () => import('@/modules/dashboard/components/publishing/publishing-form').then((module) => ({ default: module.PublishingForm })),
  { loading: () => <DashboardFormsGridSkeleton columns={2} /> },
);
const PublishedUrlBoard = dynamic(
  () => import('@/modules/dashboard/components/publishing/published-url-board').then((module) => ({ default: module.PublishedUrlBoard })),
  { loading: () => <DashboardViewSkeleton view="published" /> },
);
const BillingPanel = dynamic(
  () => import('@/modules/dashboard/components/billing/billing-panel').then((module) => ({ default: module.BillingPanel })),
  { loading: () => <DashboardViewSkeleton view="billing" /> },
);
const ModerationPanel = dynamic(
  () => import('@/modules/dashboard/components/moderation/moderation-panel').then((module) => ({ default: module.ModerationPanel })),
  { loading: () => <DashboardViewSkeleton view="moderation" /> },
);
const AdsManagementPanel = dynamic(
  () => import('@/modules/dashboard/components/ads/ads-management-panel').then((module) => ({ default: module.AdsManagementPanel })),
  { loading: () => <DashboardViewSkeleton view="ads" /> },
);
const LoginMethodsForm = dynamic(
  () => import('@/modules/dashboard/components/settings/login-methods-form').then((module) => ({ default: module.LoginMethodsForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ProfileForm = dynamic(
  () => import('@/modules/dashboard/components/settings/profile-form').then((module) => ({ default: module.ProfileForm })),
  { loading: () => <DashboardFormSkeleton /> },
);

/** Views whose payload the server filters from the query string, so `FilterControls` owns real inputs there. */
const SERVER_FILTER_VIEWS: ReadonlySet<View> = new Set<View>(['analytics', 'audit', 'configuration', 'publishers']);

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
  readonly onLoadMoreArticles?: (() => Promise<{ readonly loaded: number; readonly total: number; readonly nextCursor: string | null } | null>) | undefined;
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

  /** Tab-scoped tables: a tab lists only the collections it owns instead of the whole payload. */
  const collectionTables = (keys: readonly string[]) => (
    <DataView
      view={view}
      data={data}
      collections={keys}
      currentPage={currentPage}
      onPageChange={onPageChange}
      onRefresh={onRefresh}
      command={command}
      organizationId={organizationId}
    />
  );

  return (
    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
      <div
        key={`${organizationId}:${view}`}
        className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="m-0 font-sans text-xs font-medium text-paper-faint">
            {metadata.eyebrow}
          </p>
          <h1 className="m-0 mt-1 font-sans text-lg font-semibold tracking-tight text-paper sm:text-xl">
            {metadata.title}
          </h1>
          <p className="m-0 mt-1 font-sans text-[13px] leading-relaxed text-paper-dim">
            {metadata.description}
          </p>
        </div>
      </header>

      <div className={view === 'publishers' ? 'space-y-4 pt-4' : 'space-y-6 pt-6'}>
      {error ? (
        <Alert
          variant="destructive"
          className="flex animate-in items-center gap-3 border-l-2 border-error bg-error/[0.06] px-4 py-3 fade-in slide-in-from-top-2 duration-200"
        >
          <AlertDescription className="flex-1 font-sans text-sm text-paper">{error}</AlertDescription>
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

      {hasServerFilters(view) ? <FilterControls view={view} data={data} onApply={onFilterApply} /> : null}

      <PanelErrorBoundary key={`forms:${organizationId}:${view}`} name={metadata.title}>
      {view === 'publishers' ? <PublisherForm data={data} command={command} organizationId={organizationId} /> : null}
      {view === 'editorial' ? (
        <ArticleCreateForm
          data={data}
          onSubmit={(payload) => command('article.create', payload, { refresh: true })}
          command={command}
          organizationId={organizationId}
          editArticleId={editArticleId ?? undefined}
          onExitEdit={exitEdit}
        />
      ) : null}
      {view === 'taxonomy' ? <TaxonomyManager data={data} command={command} organizationId={organizationId} /> : null}
      {view === 'articles' ? <ArticleManager data={data} command={command} onFilterApply={onFilterApply} articlesNextCursor={articlesNextCursor} articlesTotal={articlesTotal} onLoadMoreArticles={onLoadMoreArticles} crossOrg={crossOrg} onEditArticle={(articleId) => { void setEditArticleId(articleId); onSelectView('editorial'); }} /> : null}
      {view === 'configuration' ? (
        <Tabs defaultValue="domain" className="w-full">
          <TabsList aria-label="Bagian infrastruktur" className="max-w-full overflow-x-auto overflow-y-clip">
            <TabsTrigger value="domain" className="flex-none">
              <Globe className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>Domain & Wilayah</span>
            </TabsTrigger>
            <TabsTrigger value="brand" className="flex-none">
              <Palette className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>SEO & Brand</span>
            </TabsTrigger>
            <TabsTrigger value="cache" className="flex-none">
              <Zap className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>Cache</span>
            </TabsTrigger>
            <TabsTrigger value="access" className="flex-none">
              <KeyRound className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>Akses</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent keepMounted value="domain">
            <div className="space-y-6">
              <ConfigurationPanel data={data} command={command} />
              {collectionTables(['domains', 'regions', 'sites'])}
            </div>
          </TabsContent>
          <TabsContent keepMounted value="brand">
            <div className="space-y-6">
              <SiteSettingsForm data={data} command={command} />
              {collectionTables(['siteSettings'])}
            </div>
          </TabsContent>
          <TabsContent keepMounted value="cache">
            <CachePurgeForm data={data} command={command} />
          </TabsContent>
          <TabsContent keepMounted value="access">
            <div className="space-y-6">
              <AccessManagementForm data={data} command={command} organizationId={organizationId} />
              {collectionTables(['roles', 'memberships', 'invitations', 'activationAttempts'])}
            </div>
          </TabsContent>
        </Tabs>
      ) : null}
      {view === 'media' ? <MediaLibrary data={data} command={command} organizationId={organizationId} /> : null}
      {view === 'published' ? <PublishedUrlBoard data={data} onFilterApply={onFilterApply} articlesNextCursor={articlesNextCursor} articlesTotal={articlesTotal} onLoadMoreArticles={onLoadMoreArticles} organizationId={organizationId} crossOrg={crossOrg} /> : null}
      {view === 'publishing' ? (
        <div className="grid gap-6">
          <PublishingForm data={data} command={command} />
          <ArticleDistributeForm
            data={data}
            onAssign={(payload) => command('article.sites.assign', payload, { refresh: true })}
            command={command}
          />
        </div>
      ) : null}
      {view === 'settings' ? (
        <Tabs defaultValue="koneksi" className="w-full">
          <TabsList aria-label="Bagian pengaturan" className="max-w-full overflow-x-auto overflow-y-clip">
            <TabsTrigger value="koneksi" className="flex-none">
              <Plug className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>Koneksi</span>
            </TabsTrigger>
            <TabsTrigger value="profil" className="flex-none">
              <UserRound className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="login" className="flex-none">
              <LogIn className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
              <span>Login</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent keepMounted value="koneksi">
            <div className="space-y-6">
              <IntegrationSettings command={command} isPlatform={permissions.has(INTEGRATIONS_PERMISSIONS.superAdmin) || permissions.has(INTEGRATIONS_PERMISSIONS.customerAdmin)} email={selectEmailStatus(data)} />
              <AccessKeySettings command={command} data={data} />
              {collectionTables(['apiKeys', 'accessKeys'])}
            </div>
          </TabsContent>
          <TabsContent keepMounted value="profil">
            <ProfileForm />
          </TabsContent>
          <TabsContent keepMounted value="login">
            <LoginMethodsForm />
          </TabsContent>
        </Tabs>
      ) : null}
      {view === 'billing' ? <BillingPanel organizationId={organizationId} permissions={[...permissions]} /> : null}
      {view === 'moderation' ? <ModerationPanel organizationId={organizationId} /> : null}
      {view === 'ads' ? <AdsManagementPanel organizationId={organizationId} /> : null}
      {view === 'ai' ? <AiManagementPanel organizationId={organizationId} command={command} /> : null}
      {view === 'customers' ? <CustomerManagement command={command} organizationId={organizationId} /> : null}
      {view === 'content' ? <ContentManager /> : null}
      </PanelErrorBoundary>

      {VIEWS_WITHOUT_RAW_COLLECTIONS.has(view) ? null : showSkeleton ? (
        <DashboardViewSkeleton view={view} />
      ) : (
        <PanelErrorBoundary key={`data:${organizationId}:${view}`} name={`${metadata.title} — data`}>
        <DataView
          view={view}
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
      </div>
    </main>
  );
});

export { DashboardViewPanel, VIEWS_WITHOUT_RAW_COLLECTIONS };
