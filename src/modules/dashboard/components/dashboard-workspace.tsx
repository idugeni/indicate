'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import {
  BarChart3,
  CreditCard,
  FileText,
  Flag,
  FolderKanban,
  Globe,
  KeyRound,
  LayoutDashboard,
  Megaphone,
  Menu,
  Newspaper,
  PanelLeft,
  RefreshCw,
  Settings,
  Share2,
  ShieldAlert,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardAvatar } from '@/modules/dashboard/components/dashboard-avatar';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CommandPalette } from '@/modules/dashboard/components/command-palette';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DashboardCollectionsSkeleton,
  DashboardContentSkeleton,
  DashboardFormSkeleton,
} from '@/modules/dashboard/components/dashboard-skeletons';

import {
  VIEW_METADATA_REGISTRY,
  type DashboardSnapshot,
  type NavGroup,
  type OrganizationOption,
  type View,
} from '@/modules/dashboard/components/dashboard-types';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import { DataView } from '@/modules/dashboard/components/data-view';
import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';
import { FilterControls } from '@/modules/dashboard/components/filter-controls';
import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';
import { PanelErrorBoundary } from '@/modules/dashboard/components/shared/panel-error-boundary';
import { useDashboardPage, useDashboardView } from '@/modules/dashboard/components/shared/use-dashboard-query';
import type { EmailStatus } from '@/modules/dashboard/components/settings/integration-settings';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';

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
const MediaForm = dynamic(
  () => import('@/modules/dashboard/components/publishing/media-form').then((module) => ({ default: module.MediaForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
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

export type { OrganizationOption } from '@/modules/dashboard/components/dashboard-types';

const CONTENT_MANAGE_PERMISSION = INTEGRATIONS_PERMISSIONS.contentManage;

/** Dark dashboard tooltip: content and its arrow share the raised surface. */
const DASHBOARD_TOOLTIP_CONTENT =
  'border border-hairline bg-bg-raised font-sans text-xs text-paper [&>div]:bg-bg-raised';

const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'overview',
    title: 'Ringkasan',
    items: [
      { view: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
      { view: 'analytics', label: 'Statistik & Grafik', icon: BarChart3 },
    ],
  },
  {
    id: 'editorial',
    title: 'Redaksi & Konten',
    items: [
      { view: 'editorial', label: 'Tulis Berita', icon: FileText },
      { view: 'articles', label: 'Arsip Berita', icon: Newspaper },
      { view: 'taxonomy', label: 'Kategori & Tag', icon: Tags },
      { view: 'publishers', label: 'Daftar Penerbit', icon: Users },
      { view: 'media', label: 'Media', icon: FolderKanban },
    ],
  },
  {
    id: 'publishing',
    title: 'Penerbitan',
    items: [{ view: 'publishing', label: 'Antrean Penerbitan', icon: Share2 }],
  },
  {
    id: 'system',
    title: 'Pengaturan Sistem',
    items: [
      { view: 'configuration', label: 'Domain & Wilayah', icon: Globe },
      { view: 'settings', label: 'Koneksi & Kunci Akses', icon: KeyRound, requiredPermission: INTEGRATIONS_PERMISSIONS.apiKeyRead },
      { view: 'billing', label: 'Langganan', icon: CreditCard, requiredPermission: INTEGRATIONS_PERMISSIONS.subscriptionRead },
      { view: 'audit', label: 'Riwayat Keamanan', icon: ShieldAlert, requiredPermission: DASHBOARD_PERMISSIONS.auditRead },
      { view: 'operations', label: 'Tugas Latar Belakang', icon: RefreshCw, requiredPermission: DASHBOARD_PERMISSIONS.auditRead },
      { view: 'moderation', label: 'Laporan & Data Pengguna', icon: Flag, requiredPermission: DASHBOARD_PERMISSIONS.auditRead },
      { view: 'customers', label: 'Kelola Pelanggan', icon: Settings, requiredPermission: INTEGRATIONS_PERMISSIONS.superAdmin },
      { view: 'content', label: 'Konten Website', icon: Megaphone, requiredPermission: CONTENT_MANAGE_PERMISSION },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function DashboardNavList({
  view,
  permissions,
  collapsed = false,
  onSelect,
}: {
  readonly view: View;
  readonly permissions: ReadonlySet<string>;
  readonly collapsed?: boolean;
  readonly onSelect: (view: View) => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group, groupIndex) => {
        const visibleItems = group.items.filter(
          (item) =>
            item.requiredPermission === undefined ||
            permissions.has(item.requiredPermission),
        );
        if (visibleItems.length === 0) return null;
        return (
        <div key={group.id} className={collapsed ? 'space-y-1 py-1' : 'space-y-1 px-1 py-1'}>
          {collapsed ? (
            groupIndex > 0 ? (
              <div className="mx-4 border-t border-hairline" aria-hidden="true" />
            ) : null
          ) : (
            <h3 className="px-2 pb-1 font-sans text-[11px] font-medium uppercase tracking-wider text-paper-faint">
              {group.title}
            </h3>
          )}
          <div className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive = view === item.view;
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Tooltip key={item.view}>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={item.label}
                          onClick={() => onSelect(item.view)}
                          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${
                            isActive
                              ? 'bg-bg-raised-3 text-paper'
                              : 'text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 flex-none ${isActive ? 'text-paper' : 'text-paper-faint'}`}
                            aria-hidden="true"
                          />
                        </Button>
                      }
                    />
                    <TooltipContent side="right" className={DASHBOARD_TOOLTIP_CONTENT}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Button
                  key={item.view}
                  type="button"
                  variant="ghost"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect(item.view)}
                  className={`flex w-full items-center justify-start gap-2.5 rounded-md px-2.5 py-1.5 text-left font-sans text-[13px] font-normal transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${
                    isActive
                      ? 'bg-bg-raised-3 font-medium text-paper'
                      : 'text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-none ${isActive ? 'text-paper' : 'text-paper-faint'}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="flex-none rounded-full bg-bg-raised-2 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-paper-dim">
                      {typeof item.badge === 'object' ? item.badge.label : item.badge}
                    </span>
                  ) : null}
                </Button>
              );
            })}
          </div>
        </div>
        );
      })}
    </>
  );
}

interface ApiErrorResponse {
  readonly error?: {
    readonly message?: string;
    readonly fields?: Readonly<Record<string, readonly string[]>>;
  };
}

function withAnalytics(body: unknown, analytics: unknown): unknown {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return body;
  if (typeof analytics !== 'object' || analytics === null) return body;
  return { ...(body as Record<string, unknown>), analytics };
}

function hasEmbeddedAnalytics(snapshot: unknown): boolean {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) return false;
  const analytics = (snapshot as Record<string, unknown>).analytics;
  if (typeof analytics !== 'object' || analytics === null || Array.isArray(analytics)) return false;
  return Array.isArray((analytics as Record<string, unknown>).articlesByRegion);
}

function resolveApiEndpoint(target: View | string): 'publishing' | 'integrations' | 'workspace' {
  if (
    target === 'media' ||
    target === 'publishing' ||
    target.startsWith('media.') ||
    target.startsWith('publication.')
  ) {
    return 'publishing';
  }

  if (
    target === 'settings' ||
    target === 'customers' ||
    target.startsWith('api-key.') ||
    target.startsWith('customer.') ||
    target.startsWith('email.') ||
    target.startsWith('subscription.')
  ) {
    return 'integrations';
  }

  return 'workspace';
}

const CLOCK_FORMAT = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Isolated wall clock: only this component re-renders every second. */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    void Promise.resolve().then(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) {
    return <span aria-hidden="true">–– . –– . ––</span>;
  }
  return <time dateTime={now.toISOString()}>{CLOCK_FORMAT.format(now)}</time>;
}

/**
 * Render the dashboard workspace.
 *
 * @remarks Adopt the prefetched RSC snapshot once; live API fetch stays source of truth after. SetState-in-effect: defer to a microtask so setState stays async. `avatarUrl` carries raw references (direct https, `r2:` resolved async by DashboardAvatar) so RSC never waits on R2 presigning.
 */
export function DashboardWorkspace({
  displayName,
  avatarUrl = null,
  organizations,
  initialDashboard = null,
}: {
  readonly displayName: string;
  readonly avatarUrl?: string | null;
  readonly organizations: readonly OrganizationOption[];
  readonly initialDashboard?: DashboardSnapshot | null;
}) {
  const selectOrgId = useId();
  const drawerOrgId = useId();
  const initialOrgId = organizations[0]?.id ?? '';

  const [organizationId, setOrganizationId] = useState(initialOrgId);
  const [generation, setGeneration] = useState(initialOrgId ? 1 : 0);
  const [view, setView] = useDashboardView();
  const [data, setData] = useState<unknown>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPage, setCurrentPage] = useDashboardPage();
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const closeDrawerOnDesktop = (event: MediaQueryList | MediaQueryListEvent) => {
      if (event.matches) setNavOpen(false);
    };
    closeDrawerOnDesktop(query);
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', closeDrawerOnDesktop);
      return () => query.removeEventListener('change', closeDrawerOnDesktop);
    }
    query.addListener(closeDrawerOnDesktop);
    return () => query.removeListener(closeDrawerOnDesktop);
  }, []);

  const activeOrgRef = useRef(organizationId);
  const snapshotConsumedRef = useRef(false);
  useEffect(() => {
    activeOrgRef.current = organizationId;
  }, [organizationId]);

  const activeOrganization = useMemo(
    () => organizations.find((org) => org.id === organizationId),
    [organizations, organizationId]
  );

  const activePermissions = useMemo(
    () => new Set(activeOrganization?.permissions ?? []),
    [activeOrganization],
  );

  const activeMetadata = VIEW_METADATA_REGISTRY[view] ?? {
    title: 'Ruang Kerja Redaksi',
    eyebrow: 'Sistem',
    description: 'Modul sistem INDICATE.',
  };

  const fetchAnalytics = useCallback(
    async (targetOrg: string, signal?: AbortSignal): Promise<unknown> => {
      try {
        const response = await fetch(
          `/api/dashboard/workspace?organizationId=${encodeURIComponent(targetOrg)}&view=analytics`,
          { cache: 'no-store', ...(signal ? { signal } : {}) },
        );
        if (!response.ok) return null;
        return (await response.json()) as unknown;
      } catch {
        return null;
      }
    },
    []
  );

  const fetchData = useCallback(
    async (targetView: View, targetOrg: string, query: string, signal?: AbortSignal) => {
      if (!targetOrg) return;
      setBusy(true);
      setError(null);

      const endpoint = resolveApiEndpoint(targetView);
      const url = `/api/dashboard/${endpoint}?organizationId=${encodeURIComponent(targetOrg)}&view=${targetView}${query}`;

      try {
        const pendingBody = fetch(url, { cache: 'no-store', ...(signal ? { signal } : {}) });
        const pendingAnalytics = targetView === 'dashboard' ? fetchAnalytics(targetOrg, signal) : null;
        const response = await pendingBody;
        const [body, analytics] = await Promise.all([
          response.json() as Promise<unknown>,
          pendingAnalytics ?? Promise.resolve(null),
        ]);

        if (activeOrgRef.current !== targetOrg) return;

        if (!response.ok) {
          const apiError = body as ApiErrorResponse;
          setError(apiError.error?.message ?? 'Server gagal memproses. Coba lagi.');
        } else if (targetView === 'dashboard') {
          if (activeOrgRef.current !== targetOrg) return;
          setData(withAnalytics(body, analytics));
        } else {
          setData(body);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (activeOrgRef.current === targetOrg) {
          setError('Gagal menghubungi server. Periksa koneksi internet, lalu coba lagi.');
        }
      } finally {
        if (activeOrgRef.current === targetOrg) {
          setBusy(false);
        }
      }
    },
    [fetchAnalytics]
  );

  useEffect(() => {
    if (
      !snapshotConsumedRef.current &&
      initialDashboard !== null &&
      view === 'dashboard' &&
      organizationId === initialDashboard.organizationId &&
      filterQuery === ''
    ) {
      snapshotConsumedRef.current = true;
      const snapshot = initialDashboard.data;
      const snapshotOrg = initialDashboard.organizationId;
      void Promise.resolve().then(() => setData(snapshot));
      if (hasEmbeddedAnalytics(snapshot)) return;
      void fetchAnalytics(snapshotOrg).then((analytics) => {
        if (analytics === null || activeOrgRef.current !== snapshotOrg) return;
        setData((prev: unknown) => withAnalytics(prev, analytics));
      });
      return;
    }
    if (view === 'content' || view === 'billing' || view === 'moderation') {
      void Promise.resolve().then(() => {
        setData(null);
        setBusy(false);
        setError(null);
      });
      return;
    }
    const controller = new AbortController();
    void Promise.resolve().then(() =>
      fetchData(view, organizationId, filterQuery, controller.signal)
    );
    return () => controller.abort();
  }, [fetchAnalytics, fetchData, view, organizationId, filterQuery, initialDashboard]);

  const handleSwitchCommitted = useCallback(
    (nextOrgId: string) => {
      const target = organizations.find((o) => o.id === nextOrgId);
      setError(null);
      setData(null);
      activeOrgRef.current = nextOrgId;
      setOrganizationId(nextOrgId);
      setGeneration((prev) => prev + 1);
      setCurrentPage(1);
      toast.success(`Organisasi aktif beralih ke: ${target?.name ?? nextOrgId}`);
    },
    [organizations, setCurrentPage]
  );

  const handleSwitchFailed = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const command = async (action: string, payload: unknown): Promise<unknown> => {
    const targetOrg = organizationId;
    setBusy(true);
    setError(null);

    const endpoint = resolveApiEndpoint(action);

    const run = async (): Promise<unknown> => {
      const response = await fetch(`/api/dashboard/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: targetOrg, action, payload }),
      });

      const body = (await response.json()) as unknown;
      if (activeOrgRef.current !== targetOrg) return null;

      if (!response.ok) {
        const apiErr = body as ApiErrorResponse;
        const fieldDetails = apiErr.error?.fields
          ? ` (${Object.entries(apiErr.error.fields).map(([f, m]) => `${f}: ${m.join(', ')}`).join('; ')})`
          : '';
        throw new Error(`${apiErr.error?.message ?? 'Gagal menjalankan perintah.'}${fieldDetails}`);
      }
      return body;
    };

    try {
      const body = await toast.promise(run(), {
        loading: `Menjalankan ${action}…`,
        success: `Perintah ${action} berhasil dijalankan.`,
        error: (cause) =>
          cause instanceof TypeError
            ? 'Gagal menghubungi server saat mengirim perintah.'
            : cause instanceof Error
              ? cause.message
              : 'Gagal menjalankan perintah.',
      });
      if (body === null || activeOrgRef.current !== targetOrg) return null;
      void fetchData(view, targetOrg, filterQuery);
      return body;
    } catch (err: unknown) {
      if (activeOrgRef.current === targetOrg) {
        setError(
          err instanceof TypeError
            ? 'Gagal menghubungi server saat mengirim perintah.'
            : err instanceof Error
              ? err.message
              : 'Gagal menjalankan perintah.',
        );
      }
      return null;
    } finally {
      if (activeOrgRef.current === targetOrg) {
        setBusy(false);
      }
    }
  };

  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-screen supports-[min-height:100svh]:min-h-svh bg-bg text-paper antialiased" data-generation={generation}>
        <aside
          aria-label="Navigasi utama Dashboard"
          className={`sticky top-0 hidden h-screen supports-[height:100svh]:h-svh flex-none flex-col overflow-hidden border-r border-hairline bg-bg-raised/40 transition-[width] duration-300 ease-out md:flex ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className={`flex flex-none items-center border-b border-hairline ${sidebarCollapsed ? 'flex-col justify-center gap-1.5 px-0 py-2' : 'h-12 gap-2 px-3'}`}>
            {sidebarCollapsed ? (
              <Image
                src="/brand/indicate-mark.svg"
                alt=""
                aria-hidden="true"
                unoptimized
                width={28}
                height={28}
                className="h-7 w-7 flex-none rounded-md"
              />
            ) : (
              <>
                <Image
                  src="/brand/indicate-mark.svg"
                  alt=""
                  aria-hidden="true"
                  unoptimized
                  width={28}
                  height={28}
                  className="h-7 w-7 flex-none rounded-md"
                />
              <span className="grid min-w-0 flex-1 animate-in leading-none fade-in duration-200">
                <span className="truncate font-sans text-sm font-semibold tracking-tight text-paper">
                  Indicate
                </span>
                <span className="mt-1 truncate font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-paper-faint">
                  Publishing infrastructure
                </span>
              </span>
              </>
            )}
            <Tooltip>
              <TooltipTrigger
                type="button"
                onClick={() => setSidebarCollapsed((prev) => !prev)}
                aria-label={sidebarCollapsed ? 'Bentangkan sidebar' : 'Ciutkan sidebar'}
                aria-expanded={!sidebarCollapsed}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-paper-faint transition-all duration-200 hover:bg-bg-raised-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
              >
                <PanelLeft
                  className={`h-4 w-4 transition-transform duration-300 ease-out ${sidebarCollapsed ? '-scale-x-100' : ''}`}
                  aria-hidden="true"
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className={`${DASHBOARD_TOOLTIP_CONTENT} p-2`}>
                {sidebarCollapsed ? 'Bentangkan sidebar' : 'Ciutkan sidebar'}
              </TooltipContent>
            </Tooltip>
          </div>

          {sidebarCollapsed ? null : (
            <div className="flex-none animate-in border-b border-hairline p-3 fade-in duration-200">
              <Label htmlFor={selectOrgId} className="px-1 font-sans text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                Organisasi
              </Label>
              <div className="mt-1.5">
                {organizations.length > 1 ? (
                  <OrganizationSwitcher
                    organizations={organizations}
                    activeOrganizationId={organizationId}
                    selectId={selectOrgId}
                    onSwitchCommitted={handleSwitchCommitted}
                    onSwitchFailed={handleSwitchFailed}
                  />
                ) : (
                  <p className="truncate px-1 font-sans text-[13px] font-medium text-paper">
                    {activeOrganization?.name ?? 'Belum ada organisasi'}
                  </p>
                )}
              </div>
            </div>
          )}

          <nav aria-label="Navigasi sidebar Dashboard" className="min-h-0 flex-1 overflow-y-auto py-2">
            <DashboardNavList
              view={view}
              permissions={activePermissions}
              collapsed={sidebarCollapsed}
              onSelect={(next) => {
                setView(next);
                setCurrentPage(1);
              }}
            />
          </nav>

          <div className="flex-none border-t border-hairline p-3">
            <div className={sidebarCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2.5'}>
              <DashboardAvatar displayName={displayName} avatarRef={avatarUrl} />
              {sidebarCollapsed ? null : (
                <div className="min-w-0 flex-1 animate-in fade-in duration-200">
                  <p className="truncate font-sans text-xs font-medium text-paper">{displayName}</p>
                  {activeOrganization?.role ? (
                    <p className="truncate font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                      {activeOrganization.role}
                    </p>
                  ) : null}
                </div>
              )}
              <div className="flex-none">
                <SignOutDialog mode="icon" />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 flex-none items-center gap-2 border-b border-hairline bg-bg/95 px-4 backdrop-blur sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setNavOpen(true)}
            aria-label="Buka navigasi workspace"
            aria-haspopup="dialog"
            className="flex-none text-paper-dim hover:text-paper md:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-nowrap font-sans text-[13px] text-paper-dim">
              <BreadcrumbItem className="hidden sm:list-item">
                <BreadcrumbLink href="/dashboard" className="hover:text-paper">
                  {activeOrganization?.name ?? 'Workspace'}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden text-hairline-strong sm:list-item" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium text-paper">
                  <span key={view} className="block animate-in truncate fade-in duration-200">
                    {ALL_NAV_ITEMS.find((item) => item.view === view)?.label}
                  </span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <CommandPalette />
            <p className="m-0 hidden items-center gap-2 rounded-md border border-hairline bg-bg-raised px-2.5 py-1.5 font-mono text-xs tabular-nums text-paper-dim md:inline-flex">
              <span className="relative flex h-1.5 w-1.5 flex-none" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
              <LiveClock />
            </p>
            <Tooltip>
              <TooltipTrigger
                type="button"
                disabled={busy}
                onClick={() => void fetchData(view, organizationId, filterQuery)}
                aria-label="Muat ulang data"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-paper-dim transition-colors duration-150 hover:bg-bg-raised-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className={`${DASHBOARD_TOOLTIP_CONTENT} p-2`}>
                {busy ? 'Memuat…' : 'Muat ulang data'}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            aria-label="Navigasi workspace"
            className="w-[min(20rem,85vw)] gap-0 overflow-hidden border-hairline bg-bg-raised p-0 shadow-none"
          >
            <SheetHeader className="flex-none border-b border-hairline px-4 py-3 text-left">
              <SheetTitle className="flex items-center gap-2 font-sans text-sm font-bold tracking-tight text-paper">
                <Image
                  src="/brand/indicate-mark.svg"
                  alt=""
                  aria-hidden="true"
                  unoptimized
                  width={24}
                  height={24}
                  className="h-6 w-6 flex-none rounded-md"
                />
                <span className="grid min-w-0 leading-none">
                  <span className="truncate">Indicate Dashboard</span>
                  <span className="mt-1 truncate font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-paper-faint">
                    Publishing infrastructure
                  </span>
                </span>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-none border-b border-hairline px-4 py-3">
              <Label htmlFor={drawerOrgId} className="font-sans text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                Organisasi
              </Label>
              <div className="mt-1.5">
                {organizations.length > 1 ? (
                  <OrganizationSwitcher
                    organizations={organizations}
                    activeOrganizationId={organizationId}
                    selectId={drawerOrgId}
                    onSwitchCommitted={handleSwitchCommitted}
                    onSwitchFailed={handleSwitchFailed}
                  />
                ) : (
                  <p className="truncate font-sans text-[13px] font-medium text-paper">
                    {activeOrganization?.name ?? 'Belum ada organisasi'}
                  </p>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-2 py-4">
              <DashboardNavList
                view={view}
                permissions={activePermissions}
                onSelect={(next) => {
                  setView(next);
                  setCurrentPage(1);
                  setNavOpen(false);
                }}
              />
            </div>
            <div className="flex-none border-t border-hairline px-4 py-3">
              <div className="flex items-center gap-2.5">
                <DashboardAvatar displayName={displayName} avatarRef={avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-xs font-medium text-paper">{displayName}</p>
                  {activeOrganization?.role ? (
                    <p className="truncate font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                      {activeOrganization.role}
                    </p>
                  ) : null}
                </div>
                <div className="flex-none">
                  <SignOutDialog mode="icon" />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
            <div
              key={`${organizationId}:${view}`}
              className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="m-0 font-sans text-xs font-medium text-paper-faint">
                  {activeMetadata.eyebrow}
                </p>
                <h1 className="m-0 mt-1 font-sans text-lg font-semibold tracking-tight text-paper sm:text-xl">
                  {activeMetadata.title}
                </h1>
                <p className="m-0 mt-1 font-sans text-[13px] leading-relaxed text-paper-dim">
                  {activeMetadata.description}
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
                    onClick={() => setError(null)}
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

            {view === 'editorial' ? null : <FilterControls view={view} data={data} onApply={setFilterQuery} />}

            <PanelErrorBoundary key={`forms:${organizationId}:${view}`} name={activeMetadata.title}>
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
                  <ConfigurationPanel data={data} command={command} />
                </TabsContent>
                <TabsContent keepMounted value="brand">
                  <SiteSettingsForm data={data} command={command} />
                </TabsContent>
                <TabsContent keepMounted value="cache">
                  <CachePurgeForm data={data} command={command} />
                </TabsContent>
                <TabsContent keepMounted value="access">
                  <AccessManagementForm data={data} command={command} organizationId={organizationId} />
                </TabsContent>
              </Tabs>
            ) : null}
            {view === 'media' ? <MediaForm data={data} command={command} /> : null}
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
                  <IntegrationSettings command={command} isPlatform={activePermissions.has(INTEGRATIONS_PERMISSIONS.superAdmin) || activePermissions.has(INTEGRATIONS_PERMISSIONS.customerAdmin)} email={selectEmailStatus(data)} />
                </TabsContent>
                <TabsContent keepMounted value="profil">
                  <ProfileForm />
                </TabsContent>
                <TabsContent keepMounted value="login">
                  <LoginMethodsForm />
                </TabsContent>
              </Tabs>
            ) : null}
            {view === 'billing' ? <BillingPanel organizationId={organizationId} permissions={[...activePermissions]} /> : null}
            {view === 'moderation' ? <ModerationPanel organizationId={organizationId} /> : null}
            {view === 'customers' ? <CustomerManagement command={command} /> : null}
            {view === 'content' ? <ContentManager /> : null}
            </PanelErrorBoundary>

            {view === 'billing' || view === 'moderation' || view === 'editorial' || view === 'articles' || view === 'taxonomy' ? null : busy && !data ? (
              view === 'dashboard' ? <DashboardContentSkeleton /> : <DashboardCollectionsSkeleton />
            ) : (
              <PanelErrorBoundary key={`data:${organizationId}:${view}`} name={`${activeMetadata.title} — data`}>
              <DataView
                view={view}
                data={data}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onRefresh={() => void fetchData(view, organizationId, filterQuery)}
                command={command}
                onSelectView={(next) => {
                  setView(next);
                  setCurrentPage(1);
                }}
              />
              </PanelErrorBoundary>
            )}
            </div>
            </div>
          </main>
          <DashboardFooter />
        </div>
      </div>
    </TooltipProvider>
  );
}