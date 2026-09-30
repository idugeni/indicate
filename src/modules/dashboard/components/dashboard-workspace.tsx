'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Menu,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardAvatar } from '@/modules/dashboard/components/dashboard-avatar';
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

import {
  type DashboardSnapshot,
  type OrganizationOption,
  type View,
} from '@/modules/dashboard/components/dashboard-types';
import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';
import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';
import { useDashboardPage, useDashboardView } from '@/modules/dashboard/components/shared/use-dashboard-query';
import { viewLabel } from '@/modules/dashboard/components/view-registry';
import {
  DASHBOARD_TOOLTIP_CONTENT,
  DashboardNavList,
  DashboardSidebar,
} from '@/modules/dashboard/components/dashboard-sidebar';
import { DashboardViewPanel, VIEWS_WITHOUT_RAW_COLLECTIONS } from '@/modules/dashboard/components/dashboard-view-panel';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';

export type { OrganizationOption } from '@/modules/dashboard/components/dashboard-types';

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
    target === 'ai' ||
    target.startsWith('ai.') ||
    target.startsWith('api-key.') ||
    target.startsWith('access-key.') ||
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
  const drawerOrgId = useId();
  const initialOrgId = organizations[0]?.id ?? '';

  const [organizationId, setOrganizationId] = useState(initialOrgId);
  const [generation, setGeneration] = useState(initialOrgId ? 1 : 0);
  const [view, setView] = useDashboardView();
  const [payload, setPayload] = useState<{ readonly key: string; readonly body: unknown } | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentPage, setCurrentPage] = useDashboardPage();
  const [navOpen, setNavOpen] = useState(false);

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

  const scopeKey = `${organizationId}|${view}|${filterQuery}|${pendingOrgId ?? ''}`;
  const data = payload !== null && payload.key === scopeKey ? payload.body : null;

  const activeOrganization = useMemo(
    () => organizations.find((org) => org.id === organizationId),
    [organizations, organizationId]
  );

  const activePermissions = useMemo(
    () => new Set(activeOrganization?.permissions ?? []),
    [activeOrganization],
  );

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
          setPayload({ key: `${targetOrg}|${targetView}|${query}|`, body: withAnalytics(body, analytics) });
        } else {
          setPayload({ key: `${targetOrg}|${targetView}|${query}|`, body });
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
      const snapshotKey = `${snapshotOrg}|dashboard||`;
      void Promise.resolve().then(() => setPayload({ key: snapshotKey, body: snapshot }));
      if (hasEmbeddedAnalytics(snapshot)) return;
      void fetchAnalytics(snapshotOrg).then((analytics) => {
        if (analytics === null || activeOrgRef.current !== snapshotOrg) return;
        setPayload((previous) => (previous === null || previous.key !== snapshotKey
          ? previous
          : { key: snapshotKey, body: withAnalytics(previous.body, analytics) }));
      });
      return;
    }
    if (view === 'content' || view === 'billing' || view === 'moderation' || view === 'ai') {
      void Promise.resolve().then(() => {
        setPayload(null);
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
      setPayload(null);
      setPendingOrgId(null);
      activeOrgRef.current = nextOrgId;
      setOrganizationId(nextOrgId);
      setGeneration((prev) => prev + 1);
      setCurrentPage(1);
      toast.success(`Organisasi aktif beralih ke: ${target?.name ?? nextOrgId}`);
    },
    [organizations, setCurrentPage]
  );

  const handleSwitchFailed = useCallback((message: string) => {
    setPendingOrgId(null);
    setError(message);
    toast.error(message);
  }, []);

  const handleSwitchRequested = useCallback((nextOrgId: string) => {
    setPendingOrgId(nextOrgId);
  }, []);

  const command = useCallback(async (action: string, payload: unknown): Promise<unknown> => {
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
      }).unwrap();
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
  }, [organizationId, view, filterQuery, fetchData]);

  const dismissError = useCallback(() => setError(null), []);

  const selectView = useCallback((next: View) => {
    setView(next);
    setCurrentPage(1);
  }, [setView, setCurrentPage]);

  const selectMobileNavView = useCallback((next: View) => {
    setView(next);
    setCurrentPage(1);
    setNavOpen(false);
  }, [setView, setCurrentPage]);

  const refreshActiveView = useCallback(() => {
    void fetchData(view, organizationId, filterQuery);
  }, [fetchData, view, organizationId, filterQuery]);

  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-screen supports-[min-height:100svh]:min-h-svh bg-bg text-paper antialiased" data-generation={generation}>
        <DashboardSidebar
          displayName={displayName}
          avatarUrl={avatarUrl}
          organizations={organizations}
          activeOrganization={activeOrganization}
          permissions={activePermissions}
          view={view}
          onSelectView={selectView}
          onRequestOrganizationSwitch={handleSwitchRequested}
          onOrganizationSwitchCommitted={handleSwitchCommitted}
          onOrganizationSwitchFailed={handleSwitchFailed}
        />

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
                    {viewLabel(view)}
                  </span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="ml-auto flex flex-none items-center gap-1.5">
            <CommandPalette permissions={activePermissions} />
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
                onClick={refreshActiveView}
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
                    onSwitchRequested={handleSwitchRequested}
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
            <div className="dashboard-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-2 py-4">
              <DashboardNavList
                view={view}
                permissions={activePermissions}
                onSelect={selectMobileNavView}
              />            </div>
            <div className="flex-none border-t border-hairline px-4 py-3">
              <SignOutDialog
                mode="icon"
                trigger={
                  <button
                    type="button"
                    aria-label="Keluar dari workspace"
                    className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-bg-raised-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                  >
                    <DashboardAvatar displayName={displayName} avatarRef={avatarUrl} />
                    <span className="grid min-w-0 flex-1 leading-none">
                      <span className="truncate font-sans text-xs font-medium text-paper">{displayName}</span>
                      {activeOrganization?.role ? (
                        <span className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                          {activeOrganization.role}
                        </span>
                      ) : null}
                    </span>
                  </button>
                }
              />
            </div>
          </SheetContent>
        </Sheet>

        <DashboardViewPanel
          view={view}
          data={data}
          organizationId={organizationId}
          permissions={activePermissions}
          error={error}
          showSkeleton={!VIEWS_WITHOUT_RAW_COLLECTIONS.has(view) && busy && !data}
          currentPage={currentPage}
          command={command}
          onDismissError={dismissError}
          onFilterApply={setFilterQuery}
          onPageChange={setCurrentPage}
          onRefresh={refreshActiveView}
          onSelectView={selectView}
        />
        <DashboardFooter />
        </div>
      </div>
    </TooltipProvider>
  );
}
