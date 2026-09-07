'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
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
  PanelLeft,
  RefreshCw,
  Settings,
  Share2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { CommandPalette } from '@/modules/dashboard/components/command-palette';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
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
import { FilterControls } from '@/modules/dashboard/components/filter-controls';
import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';
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
const CustomerManagement = dynamic(
  () => import('@/modules/dashboard/components/customers/customer-management').then((module) => ({ default: module.CustomerManagement })),
  { loading: () => <DashboardFormSkeleton /> },
);
const ContentManager = dynamic(
  () => import('@/modules/dashboard/components/content/content-manager').then((module) => ({ default: module.ContentManager })),
  { loading: () => <DashboardFormSkeleton /> },
);
const EditorialForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/editorial-form').then((module) => ({ default: module.EditorialForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const IntegrationSettings = dynamic(
  () => import('@/modules/dashboard/components/settings/integration-settings').then((module) => ({ default: module.IntegrationSettings })),
  { loading: () => <DashboardFormSkeleton /> },
);
const MediaForm = dynamic(
  () => import('@/modules/dashboard/components/publishing/media-form').then((module) => ({ default: module.MediaForm })),
  { loading: () => <DashboardFormSkeleton /> },
);
const PublisherForm = dynamic(
  () => import('@/modules/dashboard/components/editorial/publisher-form').then((module) => ({ default: module.PublisherForm })),
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

export type { OrganizationOption } from '@/modules/dashboard/components/dashboard-types';

const CONTENT_MANAGE_PERMISSION = 'platform.content.manage';

/** Dark dashboard tooltip: content and its arrow share the raised surface. */
const DASHBOARD_TOOLTIP_CONTENT =
  'border border-hairline bg-bg-raised font-sans text-xs text-paper [&>div]:bg-bg-raised';

const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'overview',
    title: 'Ringkasan',
    items: [
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { view: 'analytics', label: 'Telemetri Jaringan', icon: BarChart3 },
    ],
  },
  {
    id: 'editorial',
    title: 'Redaksi & Konten',
    items: [
      { view: 'editorial', label: 'Artikel & Naskah', icon: FileText },
      { view: 'publishers', label: 'Direktori Penerbit', icon: Users },
      { view: 'media', label: 'Pustaka Media', icon: FolderKanban },
    ],
  },
  {
    id: 'syndication',
    title: 'Sindikasi Sinyal',
    items: [{ view: 'publishing', label: 'Antrean Penerbitan', icon: Share2 }],
  },
  {
    id: 'system',
    title: 'Infrastruktur & Akses',
    items: [
      { view: 'configuration', label: 'Domain & Wilayah', icon: Globe },
      { view: 'settings', label: 'Integrasi & API', icon: KeyRound, requiredPermission: INTEGRATIONS_PERMISSIONS.apiKeyRead },
      { view: 'billing', label: 'Langganan', icon: CreditCard, requiredPermission: INTEGRATIONS_PERMISSIONS.subscriptionRead },
      { view: 'audit', label: 'Log Keamanan', icon: ShieldAlert, requiredPermission: DASHBOARD_PERMISSIONS.auditRead },
      { view: 'moderation', label: 'Moderasi & Hak Data', icon: Flag, requiredPermission: DASHBOARD_PERMISSIONS.auditRead },
      { view: 'customers', label: 'Manajemen Lisensi', icon: Settings, requiredPermission: INTEGRATIONS_PERMISSIONS.superAdmin },
      { view: 'content', label: 'Konten Dinamis', icon: Megaphone, requiredPermission: CONTENT_MANAGE_PERMISSION },
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
                        <button
                          type="button"
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
                        </button>
                      }
                    />
                    <TooltipContent side="right" className={DASHBOARD_TOOLTIP_CONTENT}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <button
                  key={item.view}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect(item.view)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left font-sans text-[13px] transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${
                    isActive
                      ? 'bg-bg-raised-3 font-medium text-paper'
                      : 'font-normal text-paper-dim hover:bg-bg-raised-2 hover:text-paper'
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
                </button>
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
    target.startsWith('telegram-mapping.') ||
    target.startsWith('customer.') ||
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

/** Wall clock terisolasi: hanya komponen ini yang me-render ulang tiap detik. */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (now === null) {
    return <span aria-hidden="true">–– . –– . ––</span>;
  }
  return <time dateTime={now.toISOString()}>{CLOCK_FORMAT.format(now)}</time>;
}

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
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
    eyebrow: 'Control Plane',
    description: 'Modul sistem terdistribusi INDICATE.',
  };

  const fetchData = useCallback(
    async (targetView: View, targetOrg: string, query: string, signal?: AbortSignal) => {
      if (!targetOrg) return;
      setBusy(true);
      setError(null);

      const endpoint = resolveApiEndpoint(targetView);
      const url = `/api/dashboard/${endpoint}?organizationId=${encodeURIComponent(targetOrg)}&view=${targetView}${query}`;

      try {
        const response = await fetch(url, { cache: 'no-store', ...(signal ? { signal } : {}) });
        const body = (await response.json()) as unknown;

        if (activeOrgRef.current !== targetOrg) return;

        if (!response.ok) {
          const apiError = body as ApiErrorResponse;
          setError(apiError.error?.message ?? 'Operasi data Dashboard gagal diproses oleh server.');
        } else {
          setData(body);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (activeOrgRef.current === targetOrg) {
          setError('Hambatan komunikasi jaringan dengan endpoint API.');
        }
      } finally {
        if (activeOrgRef.current === targetOrg) {
          setBusy(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    // Adopt the prefetched RSC snapshot once; live API fetch stays source of truth after.
    if (
      !snapshotConsumedRef.current &&
      initialDashboard !== null &&
      view === 'dashboard' &&
      organizationId === initialDashboard.organizationId &&
      filterQuery === ''
    ) {
      snapshotConsumedRef.current = true;
      const snapshot = initialDashboard.data;
      void Promise.resolve().then(() => setData(snapshot));
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
  }, [fetchData, view, organizationId, filterQuery, initialDashboard]);

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
    [organizations]
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

    try {
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
        const message = `${apiErr.error?.message ?? 'Gagal mengeksekusi instruksi aksi.'}${fieldDetails}`;
        setError(message);
        toast.error(message);
        return null;
      }

      toast.success(`Aksi sistem [${action}] berhasil dieksekusi.`);
      void fetchData(view, targetOrg, filterQuery);
      return body;
    } catch {
      if (activeOrgRef.current === targetOrg) {
        const message = 'Kesalahan fatal jaringan saat mengirim instruksi transaksi.';
        setError(message);
        toast.error(message);
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
      <div className="flex min-h-screen bg-bg text-paper antialiased" data-generation={generation}>
        <aside
          aria-label="Navigasi utama Dashboard"
          className={`sticky top-0 hidden h-screen flex-none flex-col overflow-hidden border-r border-hairline bg-bg-raised/40 transition-[width] duration-300 ease-out md:flex ${
            sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className={`flex h-12 flex-none items-center border-b border-hairline ${sidebarCollapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}>
            {sidebarCollapsed ? null : (
              <>
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-brass font-sans text-xs font-bold text-bg">
                  I
                </div>
              <span className="min-w-0 flex-1 animate-in truncate font-sans text-sm font-semibold tracking-tight text-paper fade-in duration-200">
                Indicate
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
              <label htmlFor={selectOrgId} className="px-1 font-sans text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                Organisasi
              </label>
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
                    {activeOrganization?.name ?? 'Tanpa tenansi aktif'}
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
              <Avatar className="h-7 w-7 flex-none border border-hairline">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-semibold text-brass">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
        <CommandPalette showTrigger={false} />
        <header className="sticky top-0 z-30 flex h-12 flex-none items-center gap-2 border-b border-hairline bg-bg/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Buka navigasi workspace"
            aria-haspopup="dialog"
            className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-md text-paper-dim transition-colors duration-150 hover:bg-bg-raised-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 md:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
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
              <SheetTitle className="font-sans text-sm font-bold tracking-tight text-paper">
                Indicate Dashboard
              </SheetTitle>
            </SheetHeader>
            <div className="flex-none border-b border-hairline px-4 py-3">
              <label htmlFor={drawerOrgId} className="font-sans text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                Organisasi
              </label>
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
                    {activeOrganization?.name ?? 'Tanpa tenansi aktif'}
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
                <Avatar className="h-7 w-7 flex-none border border-hairline">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                  <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-semibold text-brass">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div
              key={`${organizationId}:${view}`}
              className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300"
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

            <div className="space-y-6 pt-6">
            {error ? (
              <div
                role="alert"
                className="flex animate-in items-start gap-3 border-l-2 border-error bg-error/[0.06] px-4 py-3 fade-in slide-in-from-top-2 duration-200"
              >
                <div className="flex-1 font-sans text-sm text-paper">{error}</div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="rounded-md text-paper-faint transition-colors duration-150 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                  aria-label="Tutup pesan kesalahan"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {activeOrganization && activeOrganization.records.length > 0 ? (
              <p className="font-mono text-[11px] tabular-nums text-paper-faint">
                Akses: {activeOrganization.records.join(' · ')}
              </p>
            ) : null}

            <FilterControls view={view} data={data} onApply={setFilterQuery} />

            {view === 'publishers' ? <PublisherForm data={data} command={command} /> : null}
            {view === 'editorial' ? (
              <EditorialForm
                data={data}
                onSubmit={(payload) => command('article.create', payload)}
                onAssign={(payload) => command('article.sites.assign', payload)}
              />
            ) : null}
            {view === 'configuration' ? (
              <div className="space-y-6">
                <ConfigurationPanel data={data} command={command} />
                <SiteSettingsForm data={data} command={command} />
                <AccessManagementForm data={data} command={command} />
              </div>
            ) : null}
            {view === 'media' ? <MediaForm data={data} command={command} /> : null}
            {view === 'publishing' ? <PublishingForm data={data} command={command} /> : null}
            {view === 'settings' ? <><IntegrationSettings command={command} isPlatform={activePermissions.has(INTEGRATIONS_PERMISSIONS.superAdmin) || activePermissions.has(INTEGRATIONS_PERMISSIONS.customerAdmin)} /><LoginMethodsForm /></> : null}
            {view === 'billing' ? <BillingPanel organizationId={organizationId} permissions={[...activePermissions]} /> : null}
            {view === 'moderation' ? <ModerationPanel organizationId={organizationId} /> : null}
            {view === 'customers' ? <CustomerManagement command={command} /> : null}
            {view === 'content' ? <ContentManager /> : null}

            {view === 'billing' || view === 'moderation' ? null : busy && !data ? (
              <DashboardContentSkeleton />
            ) : (
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
            )}
            </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}