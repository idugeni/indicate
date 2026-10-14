'use client';

import { memo, useId, useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DashboardAvatar } from '@/modules/dashboard/components/dashboard-avatar';
import { OrganizationSwitcher } from '@/modules/dashboard/components/organization-switcher';
import { SidebarResizeRail } from '@/modules/dashboard/components/shared/sidebar-resize-rail';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';
import { VIEW_REGISTRY, visibleNavGroups } from '@/modules/dashboard/components/view-registry';
import type { OrganizationOption, View } from '@/modules/dashboard/components/dashboard-types';
import { AppTooltip } from '@/ui/app-tooltip';
import { cn } from '@/ui/cn';

const SIDEBAR_WIDTH = 272;
const SIDEBAR_COLLAPSED_WIDTH = 68;

/**
 * Render the sidebar navigation items, grouped and permission gated.
 *
 * @param props.view - Active view, highlighted with `aria-current`.
 * @param props.permissions - Union of permissions for the active organization.
 * @param props.collapsed - Hides group titles and labels, switching items to icon buttons with tooltips.
 * @param props.onSelect - Receives the picked view.
 */
type PrimaryArea = {
  readonly id: string;
  readonly label: string;
  readonly defaultView: View;
  readonly views: readonly View[];
};

const PRIMARY_AREAS: readonly PrimaryArea[] = [
  { id: 'dashboard', label: 'Dashboard', defaultView: 'dashboard', views: ['dashboard', 'analytics'] },
  { id: 'articles', label: 'Artikel', defaultView: 'articles', views: ['articles', 'editorial', 'taxonomy', 'publishers'] },
  { id: 'media', label: 'Media', defaultView: 'media', views: ['media'] },
  { id: 'publishing', label: 'Publikasi', defaultView: 'publishing', views: ['publishing', 'published', 'ads'] },
  { id: 'settings', label: 'Pengaturan Organisasi', defaultView: 'configuration', views: ['configuration', 'settings', 'billing', 'audit', 'operations', 'moderation', 'customers', 'content', 'ai'] },
];

/**
 * Keep five concise primary areas while preserving authorized supporting views
 * as secondary navigation. In collapsed mode, expose all permitted views as
 * icon buttons so secondary workflows remain reachable.
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
  const activeArea = PRIMARY_AREAS.find((area) => area.views.includes(view));
  const [expandedArea, setExpandedArea] = useState<string | null>(activeArea?.id ?? null);

  if (collapsed) {
    return (
      <>
        {visibleNavGroups(permissions).map((group, groupIndex) => (
          <div key={group.id} className="space-y-1 py-1">
            {groupIndex > 0 ? <div className="mx-4 border-t border-white/[0.07]" aria-hidden="true" /> : null}
            {group.views.map((navView) => {
              const { label, icon: Icon } = VIEW_REGISTRY[navView];
              const isActive = view === navView;
              return (
                <AppTooltip key={navView} label={label} side="right">
                  <Button
                    type="button"
                    variant="ghost"
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={label}
                    onClick={() => onSelect(navView)}
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-md transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${isActive ? 'bg-indigo-400/10 text-white ring-1 ring-indigo-400/15' : 'text-[#8e99b0] hover:bg-white/[0.04] hover:text-white'}`}
                  >
                    <Icon className={`h-4 w-4 flex-none ${isActive ? 'text-white' : 'text-paper-faint'}`} aria-hidden="true" />
                  </Button>
                </AppTooltip>
              );
            })}
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-1">
      {PRIMARY_AREAS.map((area) => {
        const allowedViews = area.views.filter((candidate) => canAccessView(candidate, permissions));
        if (allowedViews.length === 0) return null;
        const defaultView = allowedViews.includes(area.defaultView) ? area.defaultView : allowedViews[0];
        const active = allowedViews.includes(view);
        const expanded = expandedArea === area.id;
        const Icon = VIEW_REGISTRY[defaultView].icon;
        const children = allowedViews.filter((candidate) => candidate !== defaultView);

        return (
          <section key={area.id} className="space-y-0.5">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                aria-current={view === defaultView ? 'page' : undefined}
                onClick={() => onSelect(defaultView)}
                className={`flex min-w-0 flex-1 items-center justify-start gap-2.5 rounded-md px-2.5 py-2 text-left font-sans text-[13px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${active ? 'bg-white/[0.05] text-paper' : 'text-[#8e99b0] hover:bg-white/[0.04] hover:text-white'}`}
              >
                <Icon className="h-4 w-4 flex-none text-paper-faint" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{area.label}</span>
              </Button>
              {children.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${expanded ? 'Tutup' : 'Buka'} submenu ${area.label}`}
                  aria-expanded={expanded}
                  onClick={() => setExpandedArea((current) => current === area.id ? null : area.id)}
                  className="h-8 w-8 flex-none text-paper-faint hover:text-paper"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            {expanded && children.length > 0 ? (
              <div className="ml-4 space-y-0.5 border-l border-white/[0.08] pl-2">
                {children.map((navView) => {
                  const { label, icon: ChildIcon } = VIEW_REGISTRY[navView];
                  const isActive = view === navView;
                  return (
                    <Button
                      key={navView}
                      type="button"
                      variant="ghost"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onSelect(navView)}
                      className={`flex w-full items-center justify-start gap-2 rounded-md px-2 py-1.5 text-left font-sans text-[12px] font-normal transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${isActive ? 'bg-white/[0.05] font-medium text-paper' : 'text-[#8e99b0] hover:bg-white/[0.04] hover:text-white'}`}
                    >
                      <ChildIcon className="h-3.5 w-3.5 flex-none text-paper-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
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
      <div className={`flex h-12 flex-none items-center border-b border-white/[0.07] ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}>
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
        <div className="flex-none animate-in border-b border-white/[0.07] p-3 fade-in duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
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
        <div className={cn('flex w-full items-center', collapsed ? 'flex-col justify-center gap-2' : 'gap-1')}>
          <button
            type="button"
            aria-label="Buka profil saya"
            onClick={() => onSelectView('settings')}
            className={cn(
              'rounded-md text-left transition-colors duration-150 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/60',
              collapsed ? 'p-1' : 'flex min-w-0 flex-1 items-center gap-2.5 p-1.5',
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
          <SignOutDialog mode="icon" />
        </div>
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
        'sticky top-0 z-40 hidden h-screen supports-[height:100svh]:h-svh flex-none flex-col border-r border-hairline bg-[#080d1a]/40 md:flex',
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
