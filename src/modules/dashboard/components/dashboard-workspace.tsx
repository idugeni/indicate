'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  BarChart3,
  CreditCard,
  FileText,
  FolderKanban,
  Globe,
  KeyRound,
  LogOut,
  LayoutDashboard,
  Megaphone,
  Menu,
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

const ConfigurationPanel = dynamic(
  () => import('@/modules/dashboard/components/infrastructure/configuration-panel').then((module) => ({ default: module.ConfigurationPanel })),
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
const LoginMethodsForm = dynamic(
  () => import('@/modules/dashboard/components/settings/login-methods-form').then((module) => ({ default: module.LoginMethodsForm })),
  { loading: () => <DashboardFormSkeleton /> },
);

export type { OrganizationOption } from '@/modules/dashboard/components/dashboard-types';

const CONTENT_MANAGE_PERMISSION = 'platform.content.manage';

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
      { view: 'customers', label: 'Manajemen Lisensi', icon: Settings, requiredPermission: INTEGRATIONS_PERMISSIONS.customerAdmin },
      { view: 'content', label: 'Konten Dinamis', icon: Megaphone, requiredPermission: CONTENT_MANAGE_PERMISSION },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

function DashboardNavList({
  view,
  permissions,
  onSelect,
}: {
  readonly view: View;
  readonly permissions: ReadonlySet<string>;
  readonly onSelect: (view: View) => void;
}) {
  return (
    <>
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter(
          (item) =>
            item.requiredPermission === undefined ||
            permissions.has(item.requiredPermission),
        );
        if (visibleItems.length === 0) return null;
        return (
        <div key={group.id} className="space-y-1.5">
          <h3 className="px-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-paper-faint">
            {group.title}
          </h3>
          <div className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive = view === item.view;
              const Icon = item.icon;

              return (
                <button
                  key={item.view}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onSelect(item.view)}
                  className={`flex w-full items-center justify-between border-l-2 px-3 py-2 text-left font-sans text-[13px] transition-colors duration-180 ${
                    isActive
                      ? 'border-brass font-semibold text-paper'
                      : 'border-transparent text-paper-dim hover:border-hairline-strong hover:text-paper'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 flex-none ${isActive ? 'text-brass' : 'text-paper-faint'}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span className="font-mono text-[10px] tabular-nums text-paper-faint">
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
    if (view === 'content' || view === 'billing') {
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
      <div className="min-h-screen bg-bg text-paper antialiased" data-generation={generation}>
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline bg-bg px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Buka navigasi workspace"
              aria-haspopup="dialog"
              className="inline-flex h-8 w-8 flex-none items-center justify-center border border-hairline text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper md:hidden"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex h-7 w-7 flex-none items-center justify-center bg-brass font-sans text-xs font-bold text-bg">
              I
            </div>
            <span className="hidden font-sans text-sm font-bold tracking-tight text-paper sm:inline">
              Indicate
            </span>
            <span className="hidden text-hairline-strong sm:inline" aria-hidden="true">/</span>
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="flex-nowrap font-sans text-[13px] text-paper-dim">
                <BreadcrumbItem className="hidden sm:list-item">
                  <BreadcrumbLink href="/dashboard" className="hover:text-paper">Workspace</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden text-hairline-strong sm:list-item" />
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage className="truncate font-medium text-paper">
                    {ALL_NAV_ITEMS.find((item) => item.view === view)?.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CommandPalette />

            {organizations.length > 1 ? (
              <div className="flex items-center gap-2">
                <label htmlFor={selectOrgId} className="font-sans text-xs text-paper-faint">
                  Organisasi
                </label>
                <OrganizationSwitcher
                  organizations={organizations}
                  activeOrganizationId={organizationId}
                  selectId={selectOrgId}
                  onSwitchCommitted={handleSwitchCommitted}
                  onSwitchFailed={handleSwitchFailed}
                />
              </div>
            ) : null}

            <div className="flex items-center gap-2.5 border-l border-hairline pl-3">
              <Avatar className="h-7 w-7 border border-hairline">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-bg-raised-2 font-mono text-xs font-semibold text-brass">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden font-sans text-xs text-paper-dim sm:inline">{displayName}</span>
              {activeOrganization?.role ? (
                <span
                  title={`Tier keanggotaan: ${activeOrganization.role}`}
                  className="font-mono text-[11px] uppercase tracking-wider text-paper-faint"
                >
                  · {activeOrganization.role}
                </span>
              ) : null}
              <form action="/auth/sign-out" method="post">
                <Tooltip>
                  <TooltipTrigger
                    type="submit"
                    aria-label="Keluar dari workspace"
                    className="flex h-7 w-7 items-center justify-center text-paper-dim transition-colors duration-180 hover:text-paper"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent className="border border-hairline bg-bg-raised p-2 font-sans text-xs text-paper">
                    Keluar dari workspace
                  </TooltipContent>
                </Tooltip>
              </form>
            </div>
          </div>
        </header>

        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side="left"
            aria-label="Navigasi workspace"
            className="w-[min(20rem,85vw)] border-hairline bg-bg-raised p-4 shadow-none"
          >
            <SheetHeader className="border-b border-hairline pb-3 text-left">
              <SheetTitle className="font-sans text-sm font-bold tracking-tight text-paper">
                Indicate Dashboard
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-6">
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
          </SheetContent>
        </Sheet>

        <div className="grid min-h-[calc(100vh-3.25rem)] grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)]">
          <nav
            aria-label="Navigasi sidebar Dashboard"
            className="hidden border-r border-hairline py-5 pr-3 md:block"
          >
            <DashboardNavList
              view={view}
              permissions={activePermissions}
              onSelect={(next) => {
                setView(next);
                setCurrentPage(1);
              }}
            />
          </nav>

          <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
              <div className="max-w-2xl">
                <p className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                  {activeOrganization?.name ?? 'Tanpa tenansi aktif'}
                </p>
                <h1 className="m-0 mt-1.5 font-sans text-xl font-bold tracking-tight text-paper sm:text-2xl">
                  {activeMetadata.title}
                </h1>
                <p className="m-0 mt-1.5 font-sans text-sm leading-relaxed text-paper-dim">
                  {activeMetadata.description}
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void fetchData(view, organizationId, filterQuery)}
                className="inline-flex items-center gap-1.5 border border-hairline px-3 py-1.5 font-sans text-xs text-paper-dim transition-colors duration-180 hover:border-hairline-strong hover:text-paper disabled:opacity-50"
                aria-label="Muat ulang data"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{busy ? 'Memuat…' : 'Muat ulang'}</span>
              </button>
            </header>

            <div className="space-y-6 pt-6">
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 border-l-2 border-error bg-error/[0.06] px-4 py-3"
              >
                <div className="flex-1 font-sans text-sm text-paper">{error}</div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-paper-faint hover:text-paper"
                  aria-label="Tutup pesan kesalahan"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}

            {activeOrganization && activeOrganization.records.length > 0 ? (
              <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">
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
            {view === 'configuration' ? <ConfigurationPanel data={data} command={command} /> : null}
            {view === 'media' ? <MediaForm data={data} command={command} /> : null}
            {view === 'publishing' ? <PublishingForm data={data} command={command} /> : null}
            {view === 'settings' ? <><IntegrationSettings command={command} /><LoginMethodsForm /></> : null}
            {view === 'billing' ? <BillingPanel organizationId={organizationId} permissions={[...activePermissions]} /> : null}
            {view === 'customers' ? <CustomerManagement command={command} /> : null}
            {view === 'content' ? <ContentManager /> : null}

            {view === 'billing' ? null : busy && !data ? (
              <DashboardContentSkeleton />
            ) : (
              <DataView
                view={view}
                data={data}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onRefresh={() => void fetchData(view, organizationId, filterQuery)}
              />
            )}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}