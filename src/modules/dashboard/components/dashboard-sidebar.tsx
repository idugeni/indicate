'use client';

import { memo, useId, useState } from 'react';
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
  Link2,
  Megaphone,
  Newspaper,
  RefreshCw,
  Settings,
  Share2,
  ShieldAlert,
  Tags,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DashboardAvatar } from '@/modules/dashboard/components/dashboard-avatar';
import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';
import { SidebarResizeRail } from '@/modules/dashboard/components/shared/sidebar-resize-rail';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';
import { DASHBOARD_PERMISSIONS } from '@/modules/dashboard/permissions';
import { INTEGRATIONS_PERMISSIONS } from '@/modules/integrations/permissions';
import type { NavGroup, OrganizationOption, View } from '@/modules/dashboard/components/dashboard-types';
import { cn } from '@/ui/cn';

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED_WIDTH = 64;

const CONTENT_MANAGE_PERMISSION = INTEGRATIONS_PERMISSIONS.contentManage;

/** Dark dashboard tooltip: content and its arrow share the raised surface. */
export const DASHBOARD_TOOLTIP_CONTENT =
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
    items: [
      { view: 'publishing', label: 'Antrean Penerbitan', icon: Share2 },
      { view: 'published', label: 'Hasil Tayang', icon: Link2 },
    ],
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

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

/**
 * Render the sidebar navigation items, grouped and permission gated.
 *
 * @param props.view - Active view, highlighted with `aria-current`.
 * @param props.permissions - Union of permissions for the active organization.
 * @param props.collapsed - Hides group titles and labels, switching items to icon buttons with tooltips.
 * @param props.onSelect - Receives the picked view.
 */
export function DashboardNavList({
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
        <div
          key={group.id}
          className={`animate-in fade-in duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'space-y-1 py-1' : 'space-y-1 px-1 py-1'}`}
        >
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

/**
 * Render the desktop dashboard sidebar with its own width and collapse state.
 *
 * @remarks
 * Collapse and drag state is intentionally local to this component. Held by the
 * workspace it would re-render the whole dashboard (the active view alone is
 * around 1,500 DOM nodes) on every rail click, which blocks the main thread
 * long enough to stall the width transition. The content column never reads
 * this state, so the sidebar subtree is the only thing that has to re-render.
 */
const SidebarBody = memo(function SidebarBody({
  displayName,
  avatarUrl,
  organizations,
  activeOrganization,
  permissions,
  view,
  collapsed,
  onSelectView,
  onRequestOrganizationSwitch,
  onOrganizationSwitchCommitted,
  onOrganizationSwitchFailed,
}: {
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly organizations: readonly OrganizationOption[];
  readonly activeOrganization: OrganizationOption | undefined;
  readonly permissions: ReadonlySet<string>;
  readonly view: View;
  readonly collapsed: boolean;
  readonly onSelectView: (view: View) => void;
  readonly onRequestOrganizationSwitch: (organizationId: string) => void;
  readonly onOrganizationSwitchCommitted: (organizationId: string) => void;
  readonly onOrganizationSwitchFailed: (message: string) => void;
}) {
  const selectOrgId = useId();

  return (
    <>
      <div className={`flex h-12 flex-none items-center border-b border-hairline ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}>
        <Image
          src="/brand/indicate-mark.svg"
          alt=""
          aria-hidden="true"
          unoptimized
          width={28}
          height={28}
          className="h-7 w-7 flex-none rounded-md"
        />
        {collapsed ? null : (
          <span className="grid min-w-0 flex-1 animate-in leading-none fade-in duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
            <span className="truncate font-sans text-sm font-semibold tracking-tight text-paper">
              Indicate
            </span>
            <span className="mt-1 truncate font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-paper-faint">
              Publishing infrastructure
            </span>
          </span>
        )}
      </div>

      {collapsed ? null : (
        <div className="flex-none animate-in border-b border-hairline p-3 fade-in duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
          <Label htmlFor={selectOrgId} className="px-1 font-sans text-[11px] font-medium uppercase tracking-wider text-paper-faint">
            Organisasi
          </Label>
          <div className="mt-1.5">
            {organizations.length > 1 ? (
              <OrganizationSwitcher
                organizations={organizations}
                activeOrganizationId={activeOrganization?.id ?? ''}
                selectId={selectOrgId}
                onSwitchRequested={onRequestOrganizationSwitch}
                onSwitchCommitted={onOrganizationSwitchCommitted}
                onSwitchFailed={onOrganizationSwitchFailed}
              />
            ) : (
              <p className="truncate px-1 font-sans text-[13px] font-medium text-paper">
                {activeOrganization?.name ?? 'Belum ada organisasi'}
              </p>
            )}
          </div>
        </div>
      )}

      <nav
        aria-label="Navigasi sidebar Dashboard"
        className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto py-2"
      >
        <DashboardNavList
          view={view}
          permissions={permissions}
          collapsed={collapsed}
          onSelect={onSelectView}
        />
      </nav>

      <div className="flex-none border-t border-hairline p-3">
        <SignOutDialog
          mode="icon"
          trigger={
            <button
              type="button"
              aria-label="Keluar dari workspace"
              className={cn(
                'flex w-full rounded-md text-left transition-colors duration-150 hover:bg-bg-raised-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60',
                collapsed ? 'justify-center p-1' : 'items-center gap-2.5 p-1.5',
              )}
            >
              <DashboardAvatar displayName={displayName} avatarRef={avatarUrl} />
              {collapsed ? null : (
                <span className="grid min-w-0 flex-1 animate-in leading-none fade-in duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
                  <span className="truncate font-sans text-xs font-medium text-paper">{displayName}</span>
                  {activeOrganization?.role ? (
                    <span className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                      {activeOrganization.role}
                    </span>
                  ) : null}
                </span>
              )}
            </button>
          }
        />
      </div>
    </>
  );
});

/**
 * Render the desktop dashboard sidebar with its own width and collapse state.
 *
 * @remarks
 * Collapse and drag state is intentionally local to this component. Held by the
 * workspace it would re-render the whole dashboard (the active view alone is
 * around 1,500 DOM nodes) on every rail click, which blocks the main thread
 * long enough to stall the width transition. The content column never reads
 * this state, so only the sidebar subtree has to re-render — and the body below
 * is memoized, so a drag that only changes the width skips it entirely.
 */
export function DashboardSidebar(props: {
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly organizations: readonly OrganizationOption[];
  readonly activeOrganization: OrganizationOption | undefined;
  readonly permissions: ReadonlySet<string>;
  readonly view: View;
  readonly onSelectView: (view: View) => void;
  readonly onRequestOrganizationSwitch: (organizationId: string) => void;
  readonly onOrganizationSwitchCommitted: (organizationId: string) => void;
  readonly onOrganizationSwitchFailed: (message: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const renderedWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : (width ?? SIDEBAR_WIDTH);

  return (
    <aside
      aria-label="Navigasi utama Dashboard"
      style={collapsed ? undefined : { width: renderedWidth }}
      className={cn(
        'sticky top-0 z-40 hidden h-screen supports-[height:100svh]:h-svh flex-none flex-col border-r border-hairline bg-bg-raised/40 md:flex',
        collapsed ? 'w-16' : 'w-64',
        dragging
          ? 'transition-none'
          : 'transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]',
      )}
    >
      <SidebarBody {...props} collapsed={collapsed} />

      <SidebarResizeRail
        width={renderedWidth}
        collapsed={collapsed}
        label={collapsed ? 'Bentangkan sidebar' : 'Ciutkan sidebar'}
        onWidthChange={setWidth}
        onCollapsedChange={setCollapsed}
        onDraggingChange={setDragging}
      />
    </aside>
  );
}
