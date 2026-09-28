'use client';

import { memo } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataView } from '@/modules/dashboard/components/data-view';
import { FilterControls } from '@/modules/dashboard/components/filter-controls';
import { PanelErrorBoundary } from '@/modules/dashboard/components/shared/panel-error-boundary';
import {
  DashboardCollectionsSkeleton,
  DashboardContentSkeleton,
  DashboardFormSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';
import type { EmailStatus } from '@/modules/dashboard/components/settings/integration-settings';
import {
  VIEW_METADATA_REGISTRY,
  type OrganizationOption,
  type View,
} from '@/modules/dashboard/components/dashboard-types';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';

const ConfigurationPanel = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/configuration-panel').then((module) => ({ default: module.ConfigurationPanel })),
  { loading: () => <DashboardFormSkeleton /> },
);
const AccessManagementForm = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/access-management-form').then((module) => ({ default: module.AccessManagementForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const SiteSettingsForm = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/site-settings-form').then((module) => ({ default: module.SiteSettingsForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const CachePurgeForm = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/cache-purge-form').then((module) => ({ default: module.CachePurgeForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const CustomerManagement = dynamic(
  () => import('@/modules/dashboard/components/customers/customer-management').then((module) => ({ default: module.CustomerManagement })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ContentManager = dynamic(
  () => import('@/modules/dashboard/components/content/content-manager').then((module) => ({ default: module.ContentManager })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ArticleCreateForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/editorial-form').then((module) => ({ default: module.ArticleCreateForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ArticleDistributeForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/article-distribute-form').then((module) => ({ default: module.ArticleDistributeForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const IntegrationSettings = dynamic(
  () => import('@/modules/dashboard/components/settings/integration-settings').then((module) => ({ default: module.IntegrationSettings })),
  { loading: () => <DashboardFormSkeleton /> },
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
  { loading: () => <DashboardFormSkeleton /> },
);
/**
 * Views whose own panel already presents every collection the payload carries,
 * or which fetch their own endpoint entirely. Rendering `DataView` underneath
 * them only repeats the same rows in a generic table — or renders a skeleton for
 * a payload that was never going to arrive — so these views stay single-surface.
 */
const VIEW_WITHOUT_RAW_COLLECTIONS: ReadonlySet<View> = new Set<View>([
  'articles',
  'billing',
  'configuration',
  'content',
  'editorial',
  'media',
  'moderation',
  'publishing',
  'settings',
  'taxonomy',
]);
const PublisherForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/publisher-form').then((module) => ({ default: module.PublisherForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const TaxonomyManager = dynamic(
  () => import('@/modules/dashboard/components/editorial/taxonomy-manager').then((module) => ({ default: module.TaxonomyManager })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ArticleArchive = dynamic(
  () => import('@/modules/dashboard/components/editorial/article-archive').then((module) => ({ default: module.ArticleArchive })),
  { loading: () => <DashboardFormSkeleton /> },
);
const PublishingForm = dynamic(
  () => import('@/modules/dashboard/components/publishing/publishing-form').then((module) => ({ default: module.PublishingForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const PublishedUrlBoard = dynamic(
  () => import('@/modules/dashboard/components/publishing/published-url-board').then((module) => ({ default: module.PublishedUrlBoard })),
  { loading: () => <DashboardFormSkeleton /> },
);
const BillingPanel = dynamic(
  () => import('@/modules/dashboard/components/billing/billing-panel').then((module) => ({ default: module.BillingPanel })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ModerationPanel = dynamic(
  () => import('@/modules/dashboard/components/moderation/moderation-panel').then((module) => ({ default: module.ModerationPanel })),
  { loading: () => <DashboardFormSkeleton /> },
);
const LoginMethodsForm = dynamic(
  () => import('@/modules/dashboard/components/settings/login-methods-form').then((module) => ({ default: module.LoginMethodsForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ProfileForm = dynamic(
  () => import('@/modules/dashboard/components/settings/profile-form').then((module) => ({ default: module.ProfileForm })),
  { loading: () => <DashboardFormSkeleton /> },
);

const FALLBACK_METADATA = {
  title: 'Ruang Kerja Redaksi',
  eyebrow: 'Sistem',
  description: 'Modul sistem INDICATE.',
};

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
  activeOrganization,
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
}: {
  readonly view: View;
  readonly data: unknown;
  readonly organizationId: string;
  readonly activeOrganization: OrganizationOption | undefined;
  readonly permissions: ReadonlySet<string>;
  readonly error: string | null;
  /** True only while the first payload for this scope is still in flight. */
  readonly showSkeleton: boolean;
  readonly currentPage: number;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
  readonly onDismissError: () => void;
  readonly onFilterApply: (query: string) => void;
  readonly onPageChange: (page: number) => void;
  readonly onRefresh: () => void;
  readonly onSelectView: (view: View) => void;
}) {
  const metadata = VIEW_METADATA_REGISTRY[view] ?? FALLBACK_METADATA;

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
          className="flex animate-in items-start gap-3 border-l-2 border-error bg-error/[0.06] px-4 py-3 fade-in slide-in-from-top-2 duration-200"
        >
          <AlertDescription className="flex-1 font-sans text-sm text-paper">{error}</AlertDescription>
          <AlertAction>
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

      {activeOrganization && activeOrganization.records.length > 0 ? (
        <p className="font-mono text-[11px] tabular-nums text-paper-faint">
          Akses: {activeOrganization.records.join(' · ')}
        </p>
      ) : null}

      {view === 'editorial' ? null : <FilterControls view={view} data={data} onApply={onFilterApply} />}

      <PanelErrorBoundary key={`forms:${organizationId}:${view}`} name={metadata.title}>
      {view === 'publishers' ? <PublisherForm data={data} command={command} /> : null}
      {view === 'editorial' ? (
        <ArticleCreateForm
          data={data}
          onSubmit={(payload) => command('article.create', payload)}
          command={command}
        />
      ) : null}
      {view === 'taxonomy' ? <TaxonomyManager data={data} command={command} /> : null}
      {view === 'articles' ? <ArticleArchive data={data} /> : null}
      {view === 'configuration' ? (
        <Tabs defaultValue="domain" className="w-full">
          <TabsList aria-label="Bagian infrastruktur" className="max-w-full overflow-x-auto overflow-y-clip">
            <TabsTrigger value="domain" className="flex-none">Domain & Wilayah</TabsTrigger>
            <TabsTrigger value="brand" className="flex-none">SEO & Brand</TabsTrigger>
            <TabsTrigger value="cache" className="flex-none">Cache</TabsTrigger>
            <TabsTrigger value="access" className="flex-none">Akses</TabsTrigger>
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
      {view === 'media' ? <MediaLibrary data={data} command={command} /> : null}
      {view === 'published' ? <PublishedUrlBoard data={data} /> : null}
      {view === 'publishing' ? (
        <div className="grid gap-6">
          <PublishingForm data={data} command={command} />
          <ArticleDistributeForm
            data={data}
            onAssign={(payload) => command('article.sites.assign', payload)}
            command={command}
          />
        </div>
      ) : null}
      {view === 'settings' ? (
        <Tabs defaultValue="koneksi" className="w-full">
          <TabsList aria-label="Bagian pengaturan" className="max-w-full overflow-x-auto overflow-y-clip">
            <TabsTrigger value="koneksi" className="flex-none">Koneksi</TabsTrigger>
            <TabsTrigger value="profil" className="flex-none">Profil</TabsTrigger>
            <TabsTrigger value="login" className="flex-none">Login</TabsTrigger>
          </TabsList>
          <TabsContent keepMounted value="koneksi">
            <div className="space-y-6">
              <IntegrationSettings command={command} isPlatform={permissions.has(INTEGRATIONS_PERMISSIONS.superAdmin) || permissions.has(INTEGRATIONS_PERMISSIONS.customerAdmin)} email={selectEmailStatus(data)} />
              {collectionTables(['apiKeys'])}
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
      {view === 'customers' ? <CustomerManagement command={command} /> : null}
      {view === 'content' ? <ContentManager /> : null}
      </PanelErrorBoundary>

      {VIEW_WITHOUT_RAW_COLLECTIONS.has(view) ? null : showSkeleton ? (
        view === 'dashboard' ? <DashboardContentSkeleton /> : <DashboardCollectionsSkeleton />
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
        />
        </PanelErrorBoundary>
      )}
      </div>
      </div>
    </main>
  );
});

export { DashboardViewPanel, VIEW_WITHOUT_RAW_COLLECTIONS };
