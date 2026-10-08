'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { LogOut, Menu } from 'lucide-react';
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
import { TooltipProvider } from '@/components/ui/tooltip';

import {
  type DashboardSnapshot,
  type OrganizationOption,
  type View,
} from '@/modules/dashboard/components/dashboard-types';
import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';
import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';
import { useDashboardPage, useDashboardView } from '@/modules/dashboard/components/shared/use-dashboard-query';
import { viewLabel } from '@/modules/dashboard/components/view-registry';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import {
  DashboardNavList,
  DashboardSidebar,
} from '@/modules/dashboard/components/dashboard-sidebar';
import { DashboardViewPanel, VIEWS_WITHOUT_RAW_COLLECTIONS } from '@/modules/dashboard/components/dashboard-view-panel';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';
import { AppTooltip } from '@/ui/app-tooltip';

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

function resolveApiEndpoint(target: View | string): 'publishing' | 'integrations' | 'workspace' | 'ads' {
  if (target === 'ads' || target.startsWith('ads.')) {
    return 'ads';
  }

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

/**
 * Views whose panels fetch and own their own data; the workspace payload is
 * discarded for them (see the loading effect below), so a post-mutation
 * refetch here would only waste one GET per mutation. Panels own refresh.
 */
const SELF_FETCHING_VIEWS: ReadonlySet<View> = new Set<View>(['content', 'billing', 'moderation', 'ai', 'ads']);

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
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [crossOrg, setCrossOrg] = useState(() => (organizations[0]?.permissions ?? []).includes(INTEGRATIONS_PERMISSIONS.superAdmin));

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
  const crossOrgScope = crossOrg && (view === 'articles' || view === 'published') ? '&scope=all' : '';
  const scopedKey = `${scopeKey}|${crossOrgScope}`;
  const data = payload !== null && payload.key === scopedKey ? payload.body : null;

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
          signal ? { signal } : undefined,
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
      const scopeSuffix = crossOrg && (targetView === 'articles' || targetView === 'published') ? '&scope=all' : '';
      const url = `/api/dashboard/${endpoint}?organizationId=${encodeURIComponent(targetOrg)}&view=${targetView}${query}${scopeSuffix}`;
      const key = `${targetOrg}|${targetView}|${query}||${scopeSuffix}`;

      try {
        const pendingBody = fetch(url, signal ? { signal } : undefined);
        const pendingAnalytics = targetView === 'dashboard' ? fetchAnalytics(targetOrg, signal) : null;
        const response = await pendingBody;
        const [body, analytics] = await Promise.all([
          response.json() as Promise<unknown>,
          pendingAnalytics ?? Promise.resolve(null),
        ]);

        if (activeOrgRef.current !== targetOrg) return;

        if (!response.ok && scopeSuffix !== '' && response.status === 403) {
          const retry = await fetch(
            `/api/dashboard/${endpoint}?organizationId=${encodeURIComponent(targetOrg)}&view=${targetView}${query}`,
            signal ? { signal } : undefined,
          );
          const retryBody = (await retry.json()) as unknown;
          if (activeOrgRef.current !== targetOrg) return;
          if (!retry.ok) {
            const apiError = retryBody as ApiErrorResponse;
            setError(retry.status === 401
              ? 'Sesi berakhir. Muat ulang lalu masuk kembali.'
              : (apiError.error?.message ?? 'Server gagal memproses. Coba lagi.'));
          } else {
            setPayload({ key: `${targetOrg}|${targetView}|${query}||`, body: retryBody });
            setCrossOrg(false);
            toast.info('Akses lintas-org ditolak; menampilkan data organisasi aktif.');
          }
          return;
        }

        if (!response.ok) {
          const apiError = body as ApiErrorResponse;
          setError(response.status === 401
            ? 'Sesi berakhir. Muat ulang lalu masuk kembali.'
            : (apiError.error?.message ?? 'Server gagal memproses. Coba lagi.'));
        } else if (targetView === 'dashboard') {
          if (activeOrgRef.current !== targetOrg) return;
          setPayload({ key, body: withAnalytics(body, analytics) });
        } else {
          setPayload({ key, body });
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
    [fetchAnalytics, crossOrg]
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
      const snapshotKey = `${snapshotOrg}|dashboard|||`;
      void Promise.resolve().then(() => setPayload({ key: snapshotKey, body: snapshot }));
      // Analytics is intentionally hydrated after the dashboard core so the
      // initial RSC response is not coupled to the heavier analytical query set.
      void fetchAnalytics(snapshotOrg).then((analytics) => {
        if (analytics === null || activeOrgRef.current !== snapshotOrg) return;
        setPayload((previous) => (previous === null || previous.key !== snapshotKey
          ? previous
          : { key: snapshotKey, body: withAnalytics(previous.body, analytics) }));
      });
      return;
    }
    if (SELF_FETCHING_VIEWS.has(view)) {
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
      setCrossOrg((target?.permissions ?? []).includes(INTEGRATIONS_PERMISSIONS.superAdmin));
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

  const command = useCallback(async (action: string, payload: unknown, options?: { readonly refresh?: boolean | undefined }): Promise<unknown> => {
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
        const message = response.status === 401
          ? 'Sesi berakhir. Muat ulang lalu masuk kembali.'
          : `${apiErr.error?.message ?? 'Gagal menjalankan perintah.'}${fieldDetails}`;
        throw Object.assign(new Error(message), { status: response.status });
      }
      return body;
    };

    try {
      // No command speaks for itself: callers own the toast so one user action
      // reports one outcome, and so a multi-step action cannot stack a toast and
      // a full refetch per step. Refresh is opt-in for the same reason.
      const body = await run();
      if (body === null || activeOrgRef.current !== targetOrg) return null;
      if (options?.refresh === true && !SELF_FETCHING_VIEWS.has(view)) void fetchData(view, targetOrg, filterQuery);
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
    setFilterQuery('');
  }, [setView, setCurrentPage]);

  const selectMobileNavView = useCallback((next: View) => {
    setView(next);
    setCurrentPage(1);
    setFilterQuery('');
    setNavOpen(false);
  }, [setView, setCurrentPage]);

  const refreshActiveView = useCallback(() => {
    if (SELF_FETCHING_VIEWS.has(view)) return;
    void fetchData(view, organizationId, filterQuery);
  }, [fetchData, view, organizationId, filterQuery]);

  const articlesMoreInflightRef = useRef(false);
  /**
   * Append the next article keyset page into the active payload.
   *
   * Returns the merged totals so pagers can fill forward across page jumps.
   * Lookups, tag options, and totals always describe the first page scope;
   * only the row arrays grow.
   */
  const fetchMoreArticles = useCallback(async (): Promise<{ readonly loaded: number; readonly total: number; readonly nextCursor: string | null } | null> => {
    const targetOrg = organizationId;
    const targetView = view;
    const query = filterQuery;
    const scopeSuffix = crossOrg && (targetView === 'articles' || targetView === 'published') ? '&scope=all' : '';
    const key = `${targetOrg}|${targetView}|${query}||${scopeSuffix}`;
    const current = payload !== null && payload.key === key ? payload.body as {
      readonly articles?: readonly unknown[]; readonly articlesNextCursor?: string | null; readonly total?: number;
      readonly articleSites?: readonly unknown[]; readonly bridgePublished?: readonly unknown[];
    } : null;
    const cursor = current?.articlesNextCursor ?? null;
    if (cursor === null || articlesMoreInflightRef.current) return null;
    articlesMoreInflightRef.current = true;
    setBusy(true);
    try {
      const endpoint = resolveApiEndpoint(targetView);
      const response = await fetch(`/api/dashboard/${endpoint}?organizationId=${encodeURIComponent(targetOrg)}&view=${targetView}${query}&limit=50&cursor=${encodeURIComponent(cursor)}${scopeSuffix}`);
      const body = (await response.json()) as { readonly articles?: readonly unknown[]; readonly articlesNextCursor?: string | null; readonly total?: number; readonly articleSites?: readonly unknown[]; readonly bridgePublished?: readonly unknown[] };
      if (!response.ok || activeOrgRef.current !== targetOrg) return null;
      let merged: { readonly loaded: number; readonly total: number; readonly nextCursor: string | null } | null = null;
      setPayload((previous) => {
        if (previous === null || previous.key !== key) return previous;
        const prevBody = previous.body as { readonly articles?: readonly unknown[]; readonly articleSites?: readonly unknown[]; readonly bridgePublished?: readonly unknown[] };
        const articles = [...(prevBody.articles ?? []), ...(body.articles ?? [])];
        const articleSites = [...(prevBody.articleSites ?? []), ...(body.articleSites ?? [])];
        const bridgePublished = [...(prevBody.bridgePublished ?? []), ...(body.bridgePublished ?? [])];
        const nextCursor = typeof body.articlesNextCursor === 'string' ? body.articlesNextCursor : null;
        merged = { loaded: articles.length, total: typeof body.total === 'number' ? body.total : articles.length, nextCursor };
        return { key, body: { ...(body as Record<string, unknown>), articles, articleSites, bridgePublished } };
      });
      return merged;
    } catch {
      if (activeOrgRef.current === targetOrg) setError('Gagal memuat artikel lebih banyak. Coba lagi.');
      return null;
    } finally {
      articlesMoreInflightRef.current = false;
      if (activeOrgRef.current === targetOrg) setBusy(false);
    }
  }, [organizationId, view, filterQuery, payload, crossOrg]);

  const articlesMore = (() => {
    if ((view !== 'articles' && view !== 'published') || data === null || typeof data !== 'object') {
      return { cursor: null as string | null, total: 0 };
    }
    const body = data as { readonly articlesNextCursor?: unknown; readonly total?: unknown };
    return {
      cursor: typeof body.articlesNextCursor === 'string' ? body.articlesNextCursor : null,
      total: typeof body.total === 'number' ? body.total : 0,
    };
  })();

  const moreInflightRef = useRef(false);
  /**
   * Append the next audit keyset page into the active payload.
   *
   * The audit trail is append-only and server-ordered, so concatenating pages
   * keeps every row exactly once without disturbing filters or paging state.
   */
  const fetchMoreAudit = useCallback(async () => {
    const targetOrg = organizationId;
    const targetView = view;
    const query = filterQuery;
    const key = `${targetOrg}|${targetView}|${query}||`;
    const current = payload !== null && payload.key === key ? payload.body as {
      readonly auditLogs?: readonly unknown[]; readonly auditNextCursor?: string | null;
    } : null;
    const cursor = current?.auditNextCursor ?? null;
    if (cursor === null || moreInflightRef.current) return;
    moreInflightRef.current = true;
    setBusy(true);
    try {
      const response = await fetch(`/api/dashboard/workspace?organizationId=${encodeURIComponent(targetOrg)}&view=audit${query}&limit=100&cursor=${encodeURIComponent(cursor)}`);
      const body = (await response.json()) as { readonly auditLogs?: readonly unknown[]; readonly auditNextCursor?: string | null };
      if (!response.ok || activeOrgRef.current !== targetOrg) return;
      setPayload((previous) => {
        if (previous === null || previous.key !== key) return previous;
        const prevBody = previous.body as { readonly auditLogs?: readonly unknown[] };
        return { key, body: { ...(body as Record<string, unknown>), auditLogs: [...(prevBody.auditLogs ?? []), ...(body.auditLogs ?? [])] } };
      });
    } catch {
      if (activeOrgRef.current === targetOrg) setError('Gagal memuat riwayat lebih lama. Coba lagi.');
    } finally {
      moreInflightRef.current = false;
      if (activeOrgRef.current === targetOrg) setBusy(false);
    }
  }, [organizationId, view, filterQuery, payload]);

  const auditNextCursor = (() => {
    if (view !== 'audit' || data === null || typeof data !== 'object') return null;
    const cursor = (data as { readonly auditNextCursor?: unknown }).auditNextCursor;
    return typeof cursor === 'string' ? cursor : null;
  })();

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
            <CommandPalette permissions={activePermissions} organizationId={organizationId} />
            <p className="m-0 hidden items-center gap-2 rounded-md border border-hairline bg-bg-raised px-2.5 py-1.5 font-mono text-xs tabular-nums text-paper-dim md:inline-flex">
              <span className="relative flex h-1.5 w-1.5 flex-none" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
              </span>
              <LiveClock />
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || SELF_FETCHING_VIEWS.has(view)}
              onClick={refreshActiveView}
            >
              <span>{busy ? 'Memuat…' : 'Refresh'}</span>
            </Button>
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
              <div className="flex w-full items-center gap-1">
                <button
                  type="button"
                  aria-label="Buka profil saya"
                  onClick={() => selectMobileNavView('settings')}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-bg-raised-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
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
                <AppTooltip label="Keluar dari workspace" side="right">
                  <button
                    type="button"
                    aria-label="Keluar dari workspace"
                    onClick={() => {
                      setNavOpen(false);
                      setSignOutOpen(true);
                    }}
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-paper-dim transition-colors duration-150 hover:bg-bg-raised-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </AppTooltip>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <SignOutDialog mode="icon" open={signOutOpen} onOpenChange={setSignOutOpen} hideTrigger />

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
          auditNextCursor={auditNextCursor}
          onLoadMoreAudit={view === 'audit' ? fetchMoreAudit : undefined}
          articlesNextCursor={articlesMore.cursor}
          articlesTotal={articlesMore.total}
          onLoadMoreArticles={view === 'articles' || view === 'published' ? fetchMoreArticles : undefined}
          crossOrg={crossOrg}
        />
        <DashboardFooter />
        </div>
      </div>
    </TooltipProvider>
  );
}
